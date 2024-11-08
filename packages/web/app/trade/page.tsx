"use client";

import TradingChart from "@/components/common/chart/TradingChart";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import useApi from "@/hooks/useApi";
import { cn } from "@/lib/utils";
import { formatNumberString } from "@/utils/utils";
import { initBackButton } from "@telegram-apps/sdk-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect } from "react";

const Trade = () => {
  const router = useRouter();
  const [backButton] = initBackButton();
  const { toast } = useToast();
  const poolId = useSearchParams().get("poolId");

  useEffect(() => {
    backButton.show();
    backButton.on("click", () => {
      router.push("/");
    });
    poolApi?.refetch();
    lastestTransactionsApi?.refetch();
  }, [backButton]);

  const lastestTransactionsApi = useApi({
    method: "GET",
    url: `liquidity/latest-orders?poolId=${poolId}`,
    key: ["lastestTransactions"],
  }).get;

  const poolApi = useApi({
    method: "GET",
    url: `liquidity/pools/${poolId}`,
    key: ["pool"],
  }).get;

  return (
    <div className="flex flex-col items-center w-full  p-4 gap-4  overflow-y-auto">
      <div className="flex items-center gap-4 w-full rounded-xl">
        <Avatar className="w-16 h-16 rounded-lg">
          <AvatarImage src="/images/avatar.png" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        <div className="left flex flex-col items-start gap-1">
          <div className="a_good_rich_charm self-stretch text-white font-rigamesh leading-6">
            {poolApi?.data?.token.name}
          </div>
          <div className="flex items-start gap-1 self-stretch">
            <div className="_agrc text-[#adadad]  text-sm leading-6">
              {poolApi?.data?.token.symbol}
            </div>
            <Image src="/images/leaf.svg" alt="leaf" width={16} height={16} />
            <div className="5h text-[#bbff2a]  text-sm font-semibold leading-6">
              5h
            </div>
            <div className="mc text-[#adadad]  text-sm leading-6">MC</div>
            <div className="_38k text-white  text-sm font-semibold leading-6">
              ${formatNumberString(poolApi?.data?.marketCap)}
            </div>
          </div>
          <div className="frame_7 flex flex-col items-start self-stretch relative">
            <div className="self-stretch h-0.5 bg-[#333]" />
            <div className="w-6 h-0.5 bg-[#bbff2a] absolute" />
          </div>
        </div>
      </div>
      <TradingChart
        poolId={poolId as string}
        symbol={`${poolApi?.data?.token.symbol || ""}/XRP`}
      />

      <div className="flex flex-col items-center gap-4 w-full">
        <div className="flex items-center gap-2 w-full">
          <div className="lastes_transactions text-[#adadad] font-rigamesh text-sm leading-6">
            Lastes transactions
          </div>
        </div>
        <div className="flex flex-col items-center gap-4 p-4 w-full rounded-xl border border-[#333] overflow-y-auto h-[200px]">
          {lastestTransactionsApi?.data?.data?.map((item: any) => (
            <div
              className="flex items-start gap-2 self-stretch w-full justify-between"
              key={item.id}
            >
              <div className="left-1 flex items-center gap-3">
                <Avatar className="w-8 h-8 rounded-lg">
                  <AvatarImage src="/images/avatar.png" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <div className="placeholder flex flex-col items-start">
                  <div className="madalena self-stretch text-white font-rigamesh text-xs leading-6">
                    {item.user.username}
                  </div>
                  <div className="flex items-start gap-2 self-stretch">
                    <div
                      className={cn(
                        "text-[#00dbb6]  text-xs",
                        item.side.toLowerCase() === "buy"
                          ? "text-[#00dbb6]"
                          : "text-[#ff0000]"
                      )}
                    >
                      {item.side.toLowerCase().charAt(0).toUpperCase() +
                        item.side.toLowerCase().slice(1)}
                    </div>
                    <div className="0s text-[#adadad]  text-xs">0s</div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className=" text-white  font-semibold text-xs">
                  {item.side === "BUY"
                    ? Number(item.totalValue).toFixed(2)
                    : Number(item.amount).toFixed(2)}
                  {item.pool.token.symbol}
                </div>
                <div className=" text-[#adadad]  text-sm font-semibold leading-6">
                  {item.side === "BUY"
                    ? Number(item.amount).toFixed(2)
                    : Number(item.price).toFixed(2)}
                  XRP
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-start gap-4 w-full">
        <Button
          className="flex justify-center items-center gap-2  relative w-full"
          onClick={() => {
            router.push(`/trade/input?poolId=${poolId}&direction=buy`);
          }}
        >
          <Image
            src="/images/shape-primary.png"
            alt="Connect Wallet"
            width={56}
            height={56}
            className="absolute w-full h-full"
          />
          <div className="text text-[#333] font-rigamesh leading-6 z-10">
            Buy
          </div>
        </Button>
        <Button
          className="flex justify-center items-center gap-2  relative w-full"
          onClick={() => {
            router.push(`/trade/input?poolId=${poolId}&direction=sell`);
          }}
        >
          <Image
            src="/images/shape-red.png"
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
    </div>
  );
};

export default Trade;
