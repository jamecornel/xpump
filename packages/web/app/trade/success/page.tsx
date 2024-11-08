"use client";

import { Button } from "@/components/ui/button";
import { initBackButton } from "@telegram-apps/sdk-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect } from "react";

const Success = () => {
  const router = useRouter();
  const [backButton] = initBackButton();
  const txHash = useSearchParams().get("txHash");
  const poolId = useSearchParams().get("poolId");
  useEffect(() => {
    backButton.show();
    backButton.on("click", () => {
      router.back();
    });
  }, [backButton]);
  return (
    <div className="flex flex-col items-center justify-center w-full  p-4 gap-4 h-full">
      <Image
        src="/images/image24.png"
        alt="lightgray"
        width={160}
        height={160}
      />
      <div className="transaction_submitted w-[19.4375rem] text-white text-center font-rigamesh text-xl leading-7">
        Transaction submitted
      </div>
      <div className="now_is_the_perfect_time_to_tell_the_whole_world_about_it_ w-[19.4375rem] text-[#adadad] text-center  text-sm leading-[1.375rem]">
        Now is the perfect time to tell the whole world about it!
      </div>
      <div className="flex flex-col items-start gap-6 w-[21.4375rem]">
        <Button
          className="flex justify-center items-center gap-2  relative w-full"
          onClick={() => {
            window.open(
              `https://testnet.xrpl.org/transactions/${txHash}`,
              "_blank"
            );
          }}
        >
          <Image
            src="/images/shape-outline-primary.png"
            alt="Connect Wallet"
            width={56}
            height={56}
            className="absolute w-full h-full"
          />
          <div className="text text-primary font-rigamesh leading-6 z-10">
            View in XRPviewer
          </div>
        </Button>
        <Button
          className="flex justify-center items-center gap-2  relative w-full"
          onClick={() => {
            router.push(`/trade?poolId=${poolId}`);
          }}
        >
          <Image
            src="/images/button_shape.png"
            alt="Connect Wallet"
            width={56}
            height={56}
            className="absolute w-full h-full"
          />
          <div className="text text-[#333] font-rigamesh leading-6 z-10">
            Close
          </div>
        </Button>
      </div>
    </div>
  );
};

export default Success;
