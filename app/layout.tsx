import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FASTNET WiFi - Get Connected",
  description: "Fast and reliable WiFi hotspot. Pay with Mobile Money and get instant access.",
  keywords: ["WiFi", "Hotspot", "Uganda", "Mobile Money", "MTN MoMo", "Airtel Money"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
