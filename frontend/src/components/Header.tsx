"use client";

import { useEffect, useState, useRef } from "react";
import HopinLogo from "./hopin-logo";
import { useUserStore } from "@/stores/UserStore";
import { UserCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

export default function Header() {
  const { user } = useUserStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const currPath = usePathname();
  const signOut = useUserStore((state) => state.signOut);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex flex-row gap-8 items-center justify-between w-full px-10 p-5 relative md:px-20 md:p-12">
      <HopinLogo />
      {currPath !== "/" && currPath !== "/signup" ? (
        <div
          className="flex items-center gap-5 mb-2 mt-4 ml-auto relative"
          ref={dropdownRef}
        >
          <div
            className="flex items-center gap-5 mr-auto hover:cursor-pointer"
            onClick={() => {
              setIsDropdownOpen(!isDropdownOpen);
            }}
          >
            {user?.avatar ? (
              <img
                src={user?.avatar}
                alt={`${user.name || "User"}'s avatar`}
                className="w-8 h-8 rounded-full right-0"
              />
            ) : (
              <UserCircle2
                className="w-full h-full text-gray-500 scale-150"
                strokeWidth={1}
              />
            )}
            <span className="whitespace-nowrap hidden right-0 md:block">
              {user?.name}
            </span>
          </div>

          {isDropdownOpen && (
            <div
              tabIndex={-1}
              aria-labelledby="menu-button"
              aria-orientation="vertical"
              className="absolute right-0 top-full z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-hidden"
            >
              <div className="py-1">
                <a
                  tabIndex={-1}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsDropdownOpen(false);
                    router.push("/account");
                  }}
                >
                  Account
                </a>
                <a
                  tabIndex={-1}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    signOut();
                  }}
                >
                  Sign out
                </a>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
