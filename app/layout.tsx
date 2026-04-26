import {Geist, Geist_Mono} from "next/font/google";
import "./globals.css";
import {Metadata} from "next";
import RootLayoutClient from "./layout-client";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EEVEE WIKI",
  description: "포켓몬 및 기술 정보 위키",
  icons: {
    icon: "/icon/eevee01.png",
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}
