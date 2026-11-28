import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/ui";
import PwaRegister from "@/components/PwaRegister";

const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-cormorant", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "TapMenu 3D — NFC ordering for restaurants", template: "%s · TapMenu 3D" },
  description: "Tap an NFC card, see your dish in 3D, customise it, and order — with live kitchen operations for restaurants.",
  applicationName: "TapMenu 3D",
  openGraph: { title: "TapMenu 3D — NFC ordering for restaurants", description: "Tap, explore dishes in 3D, order — with a live kitchen display.", type: "website" },
  appleWebApp: { capable: true, title: "TapMenu", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#064b37", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
