"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const links = [
  { name: "Profile", href: "/account" },
  { name: "Subscription", href: "/account/subscribe" },
];

export default function SideNav() {
  const pathname = usePathname();
  return (
    <div className="flex flex-row w-full items-center md:items-right md:flex-col space-y-2">
      {links.map((link) => {
        return (
          <Link
            key={link.name}
            href={link.href}
            className={clsx(
              "w-full flex flex-col overflow-y-auto mb-0 text-center md:text-right justify-center p-2 rounded-md gap-2 pr-4 hover:border-l-4 hover:border-l-black hover:border-opacity-25 md:flex-none md:justify-start sm:h-full",
              {
                "bg-gray-100 border-t-4 border-t-black md:border-t-0 md:border-l-4 md:border-l-black font-bold":
                  pathname === link.href,
              },
            )}
          >
            <p className="m-0">{link.name}</p>
          </Link>
        );
      })}
    </div>
  );
}
