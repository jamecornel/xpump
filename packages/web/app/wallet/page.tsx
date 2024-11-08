"use client";

import Image from "next/image";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { initBackButton } from "@telegram-apps/sdk-react";
import { Button } from "@/components/ui/button";
import useApi from "@/hooks/useApi";
import { useUserStore } from "@/stores/provider";
import { useToast } from "@/components/ui/use-toast";
import { shortenXrpAddress } from "@/utils/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatXrpBalance, useXrplBalance } from "@/hooks/useXrplBalance";
import { useXrplFaucet } from "@/hooks/useXrplFaucet";

const Onboarding = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUserStore((state) => state);
  const [backButton] = initBackButton();
  const { requestFunds, loading } = useXrplFaucet();
  const { xrp, refreshBalance } = useXrplBalance(
    user?.walletAddress || "",
    "testnet"
  );

  const handleRequestFunds = async () => {
    await requestFunds(user?.walletAddress || "");
    // Refresh balance after successful request
    toast({
      description: "Funds requested successfully",
      duration: 2000,
    });
    refreshBalance();
  };
  useEffect(() => {
    backButton.show();
    backButton.on("click", () => {
      router.push("/");
    });
  }, []);

  return (
    <div className="w-full h-full flex items-center flex-col justify-between p-4 gap-4">
      <Button
        className="flex justify-center items-center gap-2 h-fit w-fit bg-primary fixed top-2 right-2"
        onClick={handleRequestFunds}
        disabled={loading}
        isLoading={loading}
      >
        <div className="text-black text-xs">Faucet</div>
      </Button>
      <div className="flex flex-col items-center gap-4 w-full">
        <div className="flex items-center gap-2 flex-col gap-2">
          <Avatar className="w-16 h-16   rounded-sm">
            <AvatarImage src="/images/avatar.png" className="w-16 h-16" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <div className="gevan-1 text-white font-rigamesh text-xl">
            {user?.username || `${user?.firstName} ${user?.lastName}`}
          </div>
        </div>
        <div className="flex flex-col items-center gap-4 w-full rounded-xl">
          <div className="flex flex-col items-start gap-2 self-stretch p-4 rounded-xl bg-[#1f1f1f]">
            <div className="flex items-start gap-2 self-stretch justify-between">
              <div className="total_balance h-6 text-[#adadad]  text-sm font-semibold leading-6">
                Total Balance
              </div>
              <div className="flex items-center gap-2">
                <div className="label text-white  text-sm font-semibold leading-6">
                  {shortenXrpAddress(user?.walletAddress)}
                </div>
                <Image
                  src="/images/copy.svg"
                  alt="Copy"
                  width={24}
                  height={24}
                />
              </div>
            </div>
            <div className="flex items-end gap-2 self-stretch pb-6">
              <div className="flex flex-col items-start">
                <div className="5_000_xrp text-white font-rigamesh text-2xl leading-9">
                  {formatXrpBalance(xrp)}
                </div>
                <div className="_2_500 self-stretch text-[#adadad]  text-sm leading-[1.375rem]">
                  ${(parseFloat(xrp) * 0.62).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 self-stretch">
              <Button className="flex justify-center items-center gap-2 h-10  relative w-2/3">
                <Image
                  src="/images/shape-outline-primary.png"
                  alt="Connect Wallet"
                  width={56}
                  height={56}
                  className="absolute w-full h-full"
                />
                <div className="text-base  text-primary font-rigamesh leading-6 z-10">
                  Private key
                </div>
              </Button>
              <Button className="flex justify-center items-center gap-2 h-10  relative w-1/3">
                <Image
                  src="/images/shape-outline-red.png"
                  alt="Connect Wallet"
                  width={56}
                  height={56}
                  className="absolute w-full h-full"
                />
                <div className="text-base  text-[#E03232] font-rigamesh leading-6 z-10">
                  Logout
                </div>
              </Button>
            </div>
          </div>
          <div className="flex flex-col items-start gap-4 self-stretch p-4 rounded-xl bg-[#1f1f1f]">
            <div className="my_tokens self-stretch text-[#adadad] font-rigamesh leading-6">
              My tokens
            </div>
            {/* <div className="flex items-start gap-2 self-stretch">
            <div className="left flex items-center gap-3">
              <div className="flex justify-center items-center w-8 h-8">
                <div className="url(<path-to-image>) lightgray 50% / cover no-repeat)] flex-shrink-0 w-8 h-8 bg-[var(--avatar-male-21," />
              </div>
              <div className="placeholder-1 flex flex-col items-start">
                <div className="gevan text-white font-rigamesh text-xs leading-6">
                  Gevan
                </div>
                <div className="2_6m__gvn text-[#adadad]  text-xs">
                  2.6M $GVN
                </div>
              </div>
              <div className="_4_23 text-white  text-sm font-semibold leading-6">
                $4.23
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2 self-stretch">
            <div className="left-1 flex items-center gap-3">
              <div className="flex justify-center items-center w-8 h-8">
                <div className="url(<path-to-image>) lightgray 50% / cover no-repeat)] flex-shrink-0 w-8 h-8 bg-[var(--avatar-female-13," />
              </div>
              <div className="placeholder-2 flex flex-col items-start">
                <div className="ghost_cat text-white font-rigamesh text-xs leading-6">
                  Ghost cat
                </div>
                <div className="1_2m__ghostc____ text-[#adadad]  text-xs">
                  1.2M $GHOSTC....
                </div>
              </div>
              <div className="_2_23 text-white  text-sm font-semibold leading-6">
                $2.23
              </div>
            </div>
          </div> */}
          </div>
        </div>
      </div>
      <div className="flex items-start gap-4 w-full">
        <Button className="flex justify-center items-center gap-2  relative w-full">
          <Image
            src="/images/button_shape.png"
            alt="Connect Wallet"
            width={56}
            height={56}
            className="absolute w-full h-full"
          />
          <div className="text text-[#333] font-rigamesh leading-6 z-10">
            Deposit
          </div>
        </Button>
        <Button className="flex justify-center items-center gap-2  relative w-full">
          <Image
            src="/images/button_shape.png"
            alt="Connect Wallet"
            width={56}
            height={56}
            className="absolute w-full h-full"
          />
          <div className="text text-[#333] font-rigamesh leading-6 z-10">
            Transfer
          </div>
        </Button>
      </div>
    </div>
  );
};

export default Onboarding;
