"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const links = [
  { name: "Personal Information", href: "/profile" },
  { name: "Pending Payments & History", href: "/profile/payments" },
];

export default function SideNav() {
  const pathname = usePathname();
  return (
    <div className="flex flex-col space-y-2">
      {links.map((link) => {
        return (
          <Link
            key={link.name}
            href={link.href}
            className={clsx(
              "flex flex-col overflow-y-auto justify-center p-3 rounded-md gap-2 hover:border-l-4 hover:border-l-black hover:border-opacity-25 md:flex-none md:justify-start sm:h-full",
              {
                "bg-gray-100 border-l-4 border-l-black font-bold":
                  pathname === link.href,
              },
            )}
          >
            <p className="text-right">{link.name}</p>
          </Link>
        );
      })}
    </div>
  );
}
