"use client";
import SideNav from "../ui/account/side-nav";
import Header from "@/components/header";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="pt-0">
        <div className="flex flex-row gap-8 p-10 pt-0">
          <div className="w-72 min-h-fit p-2">
            <SideNav />
          </div>
          <div className="flex-grow">{children}</div>
        </div>
      </main>
    </>
  );
}
