"use client";

import Image from "next/image";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { initBackButton } from "@telegram-apps/sdk-react";
import { Button } from "@/components/ui/button";
import useApi from "@/hooks/useApi";
import { useUserStore } from "@/stores/provider";
import { useToast } from "@/components/ui/use-toast";

const Onboarding = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { user, saveUser } = useUserStore((state) => state);
  const [backButton] = initBackButton();
  useEffect(() => {
    backButton.show();
    backButton.on("click", () => {
      router.back();
    });
  }, []);

  const createWalletApi = useApi({
    key: ["create-wallet"],
    method: "POST",
    url: "user/wallet/create",
  }).post;

  return (
    <div className="w-full h-full flex items-center flex-col justify-between p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="wallet text-white font-rigamesh leading-6 mt-8">
          Wallet
        </div>

        <Image src="/images/wallet.png" alt="Import" width={336} height={192} />
      </div>
      <div className="flex flex-col items-center gap-4 w-full">
        <Button className="flex justify-center items-center gap-2  relative w-full">
          <Image
            src="/images/shape-transparent.png"
            alt="Connect Wallet"
            width={56}
            height={56}
            className="absolute w-full h-full"
          />
          <div className="text text-primary font-rigamesh leading-6 z-10">
            Import Wallet
          </div>
        </Button>
        <Button
          className="flex justify-center items-center gap-2  relative w-full"
          onClick={() => {
            if (user?.telegramId) {
              createWalletApi
                ?.mutateAsync({
                  telegramId: user?.telegramId,
                })
                .then((res) => {
                  toast({
                    description: res.message,
                    variant: res.success ? "success" : "error",
                  });
                  saveUser(res);
                  router.push("/wallet");
                })
                .catch((err) => {
                  toast({
                    description: err.message,
                    variant: "error",
                  });
                });
            }
          }}
          isLoading={createWalletApi?.isPending}
          disabled={createWalletApi?.isPending}
        >
          <Image
            src="/images/button_shape.png"
            alt="Connect Wallet"
            width={56}
            height={56}
            className="absolute w-full h-full"
          />
          <div className="text text-[#333] font-rigamesh leading-6 z-10">
            Create New Wallet
          </div>
        </Button>
      </div>
    </div>
  );
};

export default Onboarding;
