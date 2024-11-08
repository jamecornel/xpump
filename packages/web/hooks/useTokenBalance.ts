import { useState, useEffect } from "react";
import { Client } from "xrpl";

interface BalanceData {
  balance: string;
  loading: boolean;
  error: string | null;
}

// Define supported networks
type NetworkType = "mainnet" | "testnet" | "devnet";

const NETWORK_URLS = {
  mainnet: "wss://xrplcluster.com",
  testnet: "wss://s.altnet.rippletest.net:51233",
  devnet: "wss://s.devnet.rippletest.net:51233",
};

export const useTokenBalance = (
  address: string,
  currency: string,
  issuer: string,
  network: NetworkType = "mainnet"
) => {
  const [balanceData, setBalanceData] = useState<BalanceData>({
    balance: "0",
    loading: true,
    error: null,
  });
  const [client, setClient] = useState<Client | null>(null);

  // Initialize client
  useEffect(() => {
    const initClient = async () => {
      try {
        const newClient = new Client(NETWORK_URLS[network]);
        await newClient.connect();
        setClient(newClient);
      } catch (error) {
        setBalanceData((prev) => ({
          ...prev,
          loading: false,
          error: "Failed to connect to XRPL",
        }));
      }
    };

    initClient();

    // Cleanup
    return () => {
      if (client) {
        client.disconnect();
      }
    };
  }, [network]);

  // Fetch balance
  const fetchBalance = async () => {
    if (!client || !address) return;
    if (address === "") return;
    try {
      setBalanceData((prev) => ({ ...prev, loading: true, error: null }));

      const response = await client.request({
        command: "account_lines",
        account: address,
        ledger_index: "validated",
      });
      console.log("response", response);
      const trustline = response.result.lines.find(
        (line: any) => line.currency === currency && line.account === issuer
      );

      if (trustline) {
        setBalanceData({
          balance: trustline.balance,
          loading: false,
          error: null,
        });
      } else {
        setBalanceData({
          balance: "0",
          loading: false,
          error: null,
        });
      }
    } catch (error: any) {
      setBalanceData({
        xrp: "0",
        loading: false,
        error: error.message || "Failed to fetch balance",
      });
    }
  };

  // Fetch initial balance and set up subscription
  useEffect(() => {
    if (!client || !address) return;

    fetchBalance();

    // Subscribe to account
    const subscribeToAccount = async () => {
      try {
        await client.request({
          command: "subscribe",
          accounts: [address],
        });

        // Listen for updates
        client.on("transaction", (tx: any) => {
          console.log(tx);
          if (
            tx.transaction.Account === address ||
            tx.transaction.Destination === address
          ) {
            fetchBalance();
          }
        });
      } catch (error) {
        console.error("Subscription error:", error);
      }
    };

    subscribeToAccount();

    // Cleanup subscription
    return () => {
      if (client) {
        client
          .request({
            command: "unsubscribe",
            accounts: [address],
          })
          .catch(console.error);
      }
    };
  }, [client, address]);

  // Handle refresh
  const refreshBalance = () => {
    fetchBalance();
  };

  return {
    ...balanceData,
    refreshBalance,
  };
};

// Format balance with currency symbol
export const formatTokenBalance = (
  balance: string,
  currency: string,
  decimals: number = 2
): string => {
  const num = parseFloat(balance);
  return `${Number(num.toFixed(decimals)).toLocaleString()} ${currency}`;
};
