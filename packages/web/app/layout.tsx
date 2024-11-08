import type { PropsWithChildren } from "react";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Root } from "@/components/Root/Root";
import "@/app/globals.css";
import "normalize.css/normalize.css";
import { UserStoreProvider } from "@/stores/provider";
import Script from "next/script";
import { GoogleAnalytics } from "@next/third-parties/google";

export const metadata: Metadata = {
  title: "XPump - 1st meme token on XRPL",
  description: "XPump - 1st meme token on XRPL",
};
export const viewport: Viewport = {
  themeColor: "black",
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
};
const sora = localFont({
  src: "../public/fonts/sora/Sora-Regular.ttf",
  variable: "--font-sora",
});

const rigamesh = localFont({
  src: "../public/fonts/rigamesh/Rigamesh.ttf",
  variable: "--font-rigamesh",
});

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <Script src="https://sad.adsgram.ai/js/sad.min.js" />
      <Script src="https://telegram.org/js/telegram-web-app.js"></Script>

      <body
        className={`${sora.variable} ${rigamesh.variable} bg-[#0A0A0A] w-[var(--tg-viewport-width)] h-[var(--tg-viewport-height)]`}
      >
        <UserStoreProvider>
          <Root>{children}</Root>
        </UserStoreProvider>
        <GoogleAnalytics gaId="G-Z2EWJRB6K1" />
      </body>
    </html>
  );
}
