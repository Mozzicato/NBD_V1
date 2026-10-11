import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SiteHeader, BottomNav } from "@/components/nav";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "No Broke Dayz — campus work, paid safely", template: "%s · No Broke Dayz" },
  description: "Find and post verified campus micro-jobs at UNILAG, with escrow-protected payments.",
  applicationName: "No Broke Dayz",
  appleWebApp: { capable: true, title: "No Broke Dayz", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:p-3">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-12">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
