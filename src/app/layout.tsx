import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/ui";

export const metadata: Metadata = {
  title: { default: "TapMenu 3D — NFC ordering for restaurants", template: "%s · TapMenu 3D" },
  description: "Tap an NFC card, see your dish in 3D, customise it, and order — with live kitchen operations for restaurants.",
};

export const viewport: Viewport = { themeColor: "#0a0a0a", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
