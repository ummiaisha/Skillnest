import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { LayoutWrapper } from "@/components/LayoutWrapper";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Skillnest | Level Up Your Skills",
  description: "Learn. Compete. Grow. Earn rewards daily with interactive skill challenges.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground antialiased selection:bg-foreground selection:text-background overflow-x-hidden`}>
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
