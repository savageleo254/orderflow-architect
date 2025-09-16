import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SessionProviderWrapper } from "@/components/providers/session-provider";
import { ErrorBoundary } from "@/components/error-boundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trading Platform - OrderFlow Architect",
  description: "Advanced trading platform with real-time market data, order management, and portfolio tracking.",
  keywords: ["trading", "stocks", "crypto", "forex", "market data", "portfolio", "orders"],
  authors: [{ name: "OrderFlow Architect" }],
  openGraph: {
    title: "Trading Platform - OrderFlow Architect",
    description: "Advanced trading platform with real-time market data",
    url: "https://chat.z.ai",
    siteName: "OrderFlow Architect",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trading Platform - OrderFlow Architect",
    description: "Advanced trading platform with real-time market data",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ErrorBoundary>
          <SessionProviderWrapper>
            {children}
            <Toaster />
          </SessionProviderWrapper>
        </ErrorBoundary>
      </body>
    </html>
  );
}
