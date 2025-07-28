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
    <div className="relative z-10 flex items-center px-16 w-full bg-white justify-between">
      <HopinLogo />

      <div className="flex gap-4 items-center">
        <Button text="Log Out" variant="outline" onClick={signOut} />
        <Button text="Profile" onClick={() => router.push("/profile")} />
      </div>
    </div>
  );
};

export default Header;
