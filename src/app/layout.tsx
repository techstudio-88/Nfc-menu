import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/ui";

export const metadata: Metadata = {
  title: { default: "TapMenu 3D — NFC ordering for restaurants", template: "%s · TapMenu 3D" },
  description: "Tap an NFC card, see your dish in 3D, customise it, and order — with live kitchen operations for restaurants.",
  applicationName: "TapMenu 3D",
  appleWebApp: { capable: true, title: "TapMenu", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#7f1724", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
