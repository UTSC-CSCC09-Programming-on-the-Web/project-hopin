"use client";
import SideNav from "../ui/account/side-nav";
import Header from "@/components/header";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="pt-0">
        <div className="flex flex-col md:flex-row gap-8 p-0 pt-0">
          <div className="w-full min-h-fit p-2 md:w-1/5">
            <SideNav />
          </div>
          <div className="flex-grow">{children}</div>
        </div>
      </main>
    </>
  );
}
