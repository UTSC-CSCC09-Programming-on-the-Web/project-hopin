import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { AppWrapper } from "@/app/(authenticated)/AppWrapper";

export const metadata: Metadata = {
  title: "HopIn",
  description: "Share rides and discover friends on route",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Toaster />
        <AppWrapper>{children}</AppWrapper>
      </body>
    </html>
  );
}
