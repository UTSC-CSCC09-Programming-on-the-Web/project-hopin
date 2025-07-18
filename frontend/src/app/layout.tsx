import type { Metadata } from "next";
import "./globals.css";
import { MapDomainProvider } from "../../contexts/MapContext";
import { Toaster } from "react-hot-toast";
import { UserProvider } from "../../contexts/UserContext";
import { GroupProvider } from "../../contexts/GroupContext";
import { SessionWrapper } from "@/components/SessionWrapper";
// import { PermissionProvider } from "../../contexts/PermissionContext";

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
        <SessionWrapper>
          <UserProvider>
            <GroupProvider>
              <MapDomainProvider>
                {/* <SessionWrapper> */}
                {children}
                {/* </SessionWrapper> */}
              </MapDomainProvider>
            </GroupProvider>
          </UserProvider>
        </SessionWrapper>
      </body>
    </html>
  );
}
