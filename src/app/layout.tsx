import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Jalanea ATS - AI Resume Score Checker",
  description: "Check your resume's ATS compatibility score before applying. Get keyword analysis, formatting feedback, and actionable suggestions to optimize your resume.",
  keywords: ["ATS", "resume", "job search", "applicant tracking system", "resume optimizer", "career"],
  authors: [{ name: "Jalanea" }],
  openGraph: {
    title: "Jalanea ATS - AI Resume Score Checker",
    description: "Check your resume's ATS compatibility score before applying.",
    type: "website",
  },
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
      </body>
    </html>
  );
}
