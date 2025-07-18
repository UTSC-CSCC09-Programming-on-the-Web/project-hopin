"use client";

import { useEffect, useState, useRef } from "react";
import HopinLogo from "@/app/ui/hopin-logo";
import { useUserContext } from "../../contexts/UserContext";
import { UserCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { userApi } from "../../lib/axios/userAPI";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export const handleSignOut = async () => {
  try {
    // Clear both NextAuth and custom JWT tokens
    await Promise.all([
      userApi.signOut(), // Clear custom JWT tokens
      signOut({ redirect: false }), // Clear NextAuth session without auto-redirect
    ]);

    console.log("User signed out successfully from all sessions");
    // Navigate to home page
    window.location.href = "/";
  } catch (error) {
    console.error("Error during unified sign out:", error);
    // Even if there's an error, try to navigate away
    alert("Sign out may have failed. Redirecting to home page.");
    window.location.href = "/";
  }
};

export default function Header() {
  const [isLoading, setLoading] = useState(false);
  const { currentUser } = useUserContext();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const currPath = usePathname();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
    }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
    document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="flex flex-row gap-8 items-center px-20 p-12 pl-30 pr-30">
        <HopinLogo />
        {(currPath !== "/" && currPath !== "/signup") ? (
          <div className="flex items-center gap-5 mb-2 mt-4 ml-auto relative" ref={dropdownRef}>
            <div
              className="flex items-center gap-5 mr-auto hover:cursor-pointer"
              onClick={() => {
                setIsDropdownOpen(!isDropdownOpen);
              }}>
              {currentUser?.avatar ? (
                <img 
                  src={currentUser?.avatar} 
                  alt={`${currentUser.name || "User"}'s avatar`} 
                  className="w-8 h-8 rounded-full"/>
              ) : (
                <UserCircle2
                    className="w-full h-full text-gray-500 scale-150"
                    strokeWidth={1}
                  />
              )}
              <span className="whitespace-nowrap">{currentUser?.name}</span>
            </div>
            
            {isDropdownOpen && (
              <div tabIndex={-1} aria-labelledby="menu-button" aria-orientation="vertical" className="absolute right-0 top-full z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-hidden">
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
                      handleSignOut();
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
  )
}