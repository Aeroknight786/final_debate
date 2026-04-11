import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { UserProvider } from "@/components/UserProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Final Debate About Smoking",
  description: "The final debate you need to have with smoking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
        <UserProvider>
          <div className="flex h-screen">
            <Navigation />
            <main className="flex-1 overflow-hidden">{children}</main>
          </div>
        </UserProvider>
      </body>
    </html>
  );
}
