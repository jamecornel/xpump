"use client";

import Image from "next/image";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { initBackButton } from "@telegram-apps/sdk-react";
import { Button } from "@/components/ui/button";
import useApi from "@/hooks/useApi";
import { useUserStore } from "@/stores/provider";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";

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

  const importWalletApi = useApi({
    key: ["import-wallet"],
    method: "POST",
    url: "user/wallet/import",
  }).post;

  return (
    <div className="w-full h-full flex items-center flex-col justify-between p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="wallet text-white font-rigamesh leading-6 mt-8">
          Import Wallet
        </div>
      </div>
      <Input placeholder="Enter your seed phrase" />
      <div className="flex flex-col items-center gap-4 w-full">
        <Button
          className="flex justify-center items-center gap-2  relative w-full"
          onClick={() => {
            if (user?.telegramId) {
              importWalletApi
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
          isLoading={importWalletApi?.isPending}
          disabled={importWalletApi?.isPending}
        >
          <Image
            src="/images/button_shape.png"
            alt="Connect Wallet"
            width={56}
            height={56}
            className="absolute w-full h-full"
          />
          <div className="text text-[#333] font-rigamesh leading-6 z-10">
            Import Wallet
          </div>
        </Button>
      </div>
    </div>
  );
};

export default Onboarding;
