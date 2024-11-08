"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { initBackButton } from "@telegram-apps/sdk-react";
import useApi from "@/hooks/useApi";
import BigNumber from "bignumber.js";
const Buy = () => {
  const router = useRouter();
  const [backButton] = initBackButton();
  const { toast } = useToast();
  const poolId = useSearchParams().get("poolId");
  const amount = useSearchParams().get("amount");
  const direction = useSearchParams().get("direction");
  useEffect(() => {
    backButton.show();
    backButton.on("click", () => {
      router.back();
    });
  }, [backButton]);

  const poolApi = useApi({
    method: "GET",
    url: `liquidity/pools/${poolId}`,
    key: ["pool"],
  }).get;

  const getRateApi = useApi({
    method: "POST",
    url: "liquidity/rate",
    key: ["rate"],
  }).post;

  const buySellApi = useApi({
    method: "POST",
    url: "liquidity/trade",
    key: ["trade"],
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
      <div className="text-white text-center font-semibold leading-6">
        Confirm Purchase
      </div>
      <div className="flex flex-col items-start gap-2 p-4 w-full rounded-xl bg-[#1f1f1f]">
        <div className="flex justify-between items-center self-stretch">
          <div className="label text-[#adadad] text-sm leading-6">Name</div>
          <div className="label-1 text-white text-right text-sm font-semibold leading-6">
            {poolApi?.data?.token.name}
          </div>
        </div>
        <div className="flex justify-between items-center self-stretch">
          <div className="label-2 text-[#adadad] text-sm leading-6">Ticker</div>
          <div className="label-3 text-white text-sm font-semibold leading-6">
            ${poolApi?.data?.token.symbol}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-start gap-2 p-4 w-full rounded-xl bg-[#1f1f1f]">
        <div className="flex justify-between items-center self-stretch">
          <div className="label-4 text-[#adadad] text-sm leading-6">Send</div>
          <div className="flex items-center gap-2">
            {direction === "buy" && (
              <Image src={"/images/xrp.svg"} alt="XRP" width={24} height={24} />
            )}
            <div className="label-5 text-white text-sm font-semibold leading-6">
              {direction === "buy"
                ? `${Number(amount).toLocaleString()} XRP`
                : `${Number(amount).toLocaleString()} ${poolApi?.data?.token.symbol}`}
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center self-stretch">
          <div className="label-6 text-[#adadad] text-sm leading-6">
            Receive
          </div>
          <div className="label-7 text-white text-sm font-semibold leading-6 flex items-center gap-2">
            {direction === "sell" && (
              <Image src={"/images/xrp.svg"} alt="XRP" width={24} height={24} />
            )}{" "}
            {direction === "buy"
              ? `${BigNumber(amount || 0)
                  .multipliedBy(getRateApi?.data?.rate)
                  .toFixed(2)} ${poolApi?.data?.token.symbol}`
              : `${BigNumber(amount || 0)
                  .dividedBy(getRateApi?.data?.rate)
                  .toFixed(2)} XRP`}
          </div>
        </div>
        <div className="flex justify-between items-center self-stretch">
          <div className="label-8 text-[#adadad] text-sm leading-6">
            Share of the supply
          </div>
          <div className="label-9 text-white text-sm font-semibold leading-6">
            0,13%
          </div>
        </div>
        <div className="flex justify-between items-center self-stretch">
          <div className="label-10 text-[#adadad] text-sm leading-6">
            Sloppage
          </div>
          <div className="flex items-center gap-2">
            <div className="label-11 text-white text-sm font-semibold leading-6">
              Off
            </div>
            <Image
              src="/images/arrow-down.svg"
              alt="Arrow Down"
              width={24}
              height={24}
            />
          </div>
        </div>
        <div className="flex justify-between items-center self-stretch">
          <div className="label-12 text-[#adadad] text-sm leading-6">
            Transaction fee
          </div>
          <div className="label-13 text-white text-sm font-semibold leading-6">
            ~0.1 XRP
          </div>
        </div>
      </div>
      <Button
        className="flex justify-center items-center gap-2  relative w-full"
        onClick={() => {
          buySellApi
            ?.mutateAsync({
              isBuy: direction === "buy",
              poolId: Number(poolId),
              amount: Number(amount),
            })
            .then((resp) => {
              router.push(
                `/trade/success?txHash=${resp.txHash}&poolId=${poolId}`
              );
              toast({
                description: resp.message,
                variant: resp.success ? "success" : "error",
              });
            })
            .catch((err) => {
              toast({
                description: err,
                variant: "error",
              });
            });
        }}
        isLoading={buySellApi?.isPending}
        disabled={buySellApi?.isPending}
      >
        <Image
          src="/images/button_shape.png"
          alt="Connect Wallet"
          width={56}
          height={56}
          className="absolute w-full h-full"
        />
        <div className="text text-[#333] font-rigamesh leading-6 z-10">
          Confirm
        </div>
      </Button>
    </div>
  );
};

export default Buy;
