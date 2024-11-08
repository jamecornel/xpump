"use client";
import React from "react";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import Image from "next/image";
import { useUserStore } from "@/stores/provider";
import { useRouter } from "next/navigation";
import { shortenXrpAddress } from "@/utils/utils";

const NavBar = () => {
  const { user } = useUserStore((state) => state);
  const router = useRouter();
  return (
    <div className="flex justify-between items-center py-0 px-4 w-full h-11 ">
      <div className="button_l flex items-start gap-1">
        <Avatar />
      </div>
      <Button
        className="relative flex justify-end items-center gap-1 "
        onClick={() => {
          if (user?.walletAddress) {
            router.push("/wallet");
          } else {
            router.push("/add-wallet");
          }
        }}
      >
        <Image
          src="/images/button.svg"
          alt="Connect Wallet"
          width={176}
          height={32}
          className="absolute w-full h-full left-0 top-0"
        />

        <div className="text text-text-gray text-center font-rigamesh text-xs leading-6 z-10">
          {user?.walletAddress
            ? shortenXrpAddress(user.walletAddress)
            : "Add Wallet"}
        </div>
      </Button>
    </div>
  );
};

export default NavBar;
