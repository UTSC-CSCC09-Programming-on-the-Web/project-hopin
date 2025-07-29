"use client";
import HopinLogo from "@/components/hopin-logo";
import { useRouter } from "next/navigation";
import React from "react";
import Button from "./buttons/Button";
import { useUserStore } from "@/stores/UserStore";

const Header = () => {
  const router = useRouter();
  const signOut = useUserStore((state) => state.signOut);
  return (
    <div className="relative z-10 flex items-center px-4 sm:px-16 pb-2 w-full bg-white justify-between">
      <HopinLogo />

      <div className="flex md:gap-2 gap-4 mt-2 items-center ">
        <Button
          text="Log Out"
          variant="outline"
          className="px-2 py-1 text-sm sm:px-4 sm:py-2 sm:text-base whitespace-nowrap"
          onClick={signOut}
        />
        <Button
          text="Profile"
          className="px-2 py-1 text-sm sm:px-4 sm:py-2 sm:text-base"
          onClick={() => router.push("/profile")}
        />
      </div>
    </div>
  );
};

export default Header;
