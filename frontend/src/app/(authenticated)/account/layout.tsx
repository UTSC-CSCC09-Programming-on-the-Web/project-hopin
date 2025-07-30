"use client";
import SideNav from "./side-nav";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="pt-0 w-full">
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
