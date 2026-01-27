import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PWAInstall } from "@/components/PWAInstall";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jalanea ATS - Resume Checker",
  description: "Check your resume's ATS compatibility score before applying. Get keyword analysis, formatting feedback, and actionable suggestions to optimize your resume.",
  keywords: ["ATS", "resume", "job search", "applicant tracking system", "resume optimizer", "career"],
  authors: [{ name: "Jalanea" }],
  manifest: "/manifest.json",
  themeColor: "#f97316",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Jalanea ATS",
  },
  openGraph: {
    title: "Jalanea ATS - Resume Checker",
    description: "Check your resume's ATS compatibility score before applying.",
    type: "website",
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#f97316",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-forge-950`}
      >
        {children}
        <PWAInstall />
      </body>
    </html>
  );
}
