"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useXrplBalance } from "@/hooks/useXrplBalance";
import { useUserStore } from "@/stores/provider";
import { cn, formatXrpBalance } from "@/lib/utils";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { initBackButton } from "@telegram-apps/sdk-react";
import useApi from "@/hooks/useApi";
import { useTokenBalance } from "@/hooks/useTokenBalance";
const quickBuyAmounts = [3, 10, 50, 100];
const Buy = () => {
  const direction = useSearchParams().get("direction");
  const [activeTab, setActiveTab] = useState<"buy" | "sell">(
    direction === "buy" ? "buy" : "sell"
  );
  const { user } = useUserStore((state) => state);
  const router = useRouter();
  const [backButton] = initBackButton();
  const { toast } = useToast();
  const poolId = useSearchParams().get("poolId");
  const poolApi = useApi({
    method: "GET",
    url: `liquidity/pools/${poolId}`,
    key: ["pool"],
  }).get;
  const [amount, setAmount] = useState<number>(0);
  const { xrp, refreshBalance } = useXrplBalance(
    user?.walletAddress || "",
    "testnet"
  );

  const { balance: tokenBalance } = useTokenBalance(
    user?.walletAddress || "",
    poolApi?.data?.token.symbol,
    poolApi?.data?.token.issuerAddress,
    "testnet"
  );

  //   console.log("tokenBalance", tokenBalance);

  useEffect(() => {
    backButton.show();
    backButton.on("click", () => {
      router.back();
    });
  }, [backButton]);

  const getRateApi = useApi({
    method: "POST",
    url: "liquidity/rate",
    key: ["rate"],
  }).post;

  useEffect(() => {
    poolApi?.refetch();
  }, []);

  useEffect(() => {
    if (poolApi?.data) {
      getRateApi?.mutateAsync({
        quoteAsset: {
          currency: poolApi.data.token.symbol,
          issuer: poolApi.data.token.issuerAddress,
        },
      });
    }
  }, [poolApi?.data]);

  return (
    <div className="flex flex-col items-center w-full  p-4 gap-4 h-full">
      <div className="here_is_title flex flex-col justify-center self-stretch text-white text-center font-semibold leading-6">
        Trade
      </div>
      <Tabs defaultValue={activeTab} className="w-full h-full">
        <TabsList className="relative border-none h-10 flex items-center justify-center w-full">
          <Image
            src="/images/shape-black.png"
            alt="Buy"
            width={56}
            height={56}
            className="absolute top-0 left-0 w-full h-full"
          />
          <TabsTrigger
            value="buy"
            className="relative z-10 w-full border-none h-full"
            onClick={() => setActiveTab("buy")}
          >
            <Image
              src="/images/shape-gray.png"
              alt="Buy"
              width={56}
              height={56}
              className={cn(
                "absolute top-0 left-0 w-full h-full data-[state=active]:hidden",
                activeTab === "buy" ? "block" : "hidden"
              )}
            />
            <div
              className={cn(
                "text-[#333] font-rigamesh leading-6 z-10",
                activeTab === "buy" ? "text-white" : ""
              )}
            >
              Buy
            </div>
          </TabsTrigger>
          <TabsTrigger
            value="sell"
            className="relative z-10 w-full border-none"
            onClick={() => setActiveTab("sell")}
          >
            <Image
              src="/images/shape-gray.png"
              alt="Sell"
              width={56}
              height={56}
              className={cn(
                "absolute top-0 left-0 w-full h-full data-[state=active]:hidden",
                activeTab === "sell" ? "block" : "hidden"
              )}
            />
            <div
              className={cn(
                "text-[#333] font-rigamesh leading-6 z-10",
                activeTab === "sell" ? "text-white" : ""
              )}
            >
              Sell
            </div>
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="buy"
          className="w-full flex flex-col items-center justify-between gap-4 mt-4 h-[80%] w-full"
        >
          <div className="flex flex-col items-center justify-between gap-4 w-full">
            <Input
              className="flex flex-col justify-center items-center gap-2 p-2 w-[19.4375rem] 0-1 self-stretch text-[#adadad] text-center font-rigamesh text-[2.125rem] w-full bg-transparent border-none"
              value={amount}
              type="number"
              min={0}
              max={xrp}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <div className="inline-flex items-center gap-1">
              <div className="balance text-[#adadad] text-xs">Balance</div>
              <div className=" text-white text-xs font-semibold">
                {formatXrpBalance(xrp)}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 w-full">
            {amount > 0 && (
              <div className="flex justify-between items-center w-full">
                <div className="label text-[#adadad] text-sm leading-6">
                  You will Receive
                </div>
                <div className="label-1 text-white text-right text-sm font-semibold leading-6">
                  ~&nbsp;
                  {(Number(amount) * Number(getRateApi?.data?.rate)).toFixed(2)}
                </div>
              </div>
            )}
            <div className="inline-flex items-center gap-2">
              {quickBuyAmounts.map((amount) => (
                <div
                  className="flex justify-center items-center gap-2 py-1 px-3 relative"
                  onClick={() => setAmount(amount)}
                  key={amount}
                >
                  <Image
                    src="/images/shape-gray.png"
                    alt="Buy"
                    width={56}
                    height={56}
                    className="absolute top-0 left-0 w-full h-full"
                  />
                  <div className="text-2 text-white text-sm leading-6 z-10">
                    {amount} XRP
                  </div>
                </div>
              ))}
            </div>
            <Button
              className="flex justify-center items-center gap-2  relative w-full"
              onClick={() =>
                router.push(
                  `/trade/confirm?poolId=${poolId}&amount=${amount}&direction=buy`
                )
              }
            >
              <Image
                src="/images/button_shape.png"
                alt="Connect Wallet"
                width={56}
                height={56}
                className="absolute w-full h-full"
              />
              <div className="text text-[#333] font-rigamesh leading-6 z-10">
                Buy
              </div>
            </Button>
          </div>
        </TabsContent>
        <TabsContent
          value="sell"
          className="w-full flex flex-col items-center justify-between gap-4 mt-4 h-[80%] w-full"
        >
          <div className="flex flex-col items-center justify-between gap-4 w-full">
            <Input
              className="flex flex-col justify-center items-center gap-2 p-2 w-[19.4375rem] 0-1 self-stretch text-[#adadad] text-center font-rigamesh text-[2.125rem] w-full bg-transparent border-none"
              value={amount}
              type="number"
              min={0}
              max={xrp}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <div className="inline-flex items-center gap-1">
              <div className="balance text-[#adadad] text-xs">Balance</div>
              <div className=" text-white text-xs font-semibold">
                {Number(tokenBalance).toLocaleString()}&nbsp;
                {poolApi?.data?.token.symbol}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 w-full">
            {amount > 0 && (
              <div className="flex justify-between items-center w-full">
                <div className="label text-[#adadad] text-sm leading-6">
                  You will Receive
                </div>
                <div className="label-1 text-white text-right text-sm font-semibold leading-6">
                  ~&nbsp;
                  {(Number(amount) / Number(getRateApi?.data?.rate)).toFixed(2)}
                </div>
              </div>
            )}
            <div className="inline-flex items-center gap-2">
              {quickBuyAmounts.map((amount) => (
                <div
                  className="flex justify-center items-center gap-2 py-1 px-3 relative"
                  onClick={() => setAmount(amount)}
                  key={amount}
                >
                  <Image
                    src="/images/shape-gray.png"
                    alt="Buy"
                    width={56}
                    height={56}
                    className="absolute top-0 left-0 w-full h-full"
                  />
                  <div className="text-2 text-white text-sm leading-6 z-10">
                    {amount}&nbsp;
                    {poolApi?.data?.token.symbol}
                  </div>
                </div>
              ))}
            </div>
            <Button
              className="flex justify-center items-center gap-2  relative w-full"
              onClick={() =>
                router.push(
                  `/trade/confirm?poolId=${poolId}&amount=${amount}&direction=sell`
                )
              }
            >
              <Image
                src="/images/button_shape.png"
                alt="Connect Wallet"
                width={56}
                height={56}
                className="absolute w-full h-full"
              />
              <div className="text text-[#333] font-rigamesh leading-6 z-10">
                Sell
              </div>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Buy;
