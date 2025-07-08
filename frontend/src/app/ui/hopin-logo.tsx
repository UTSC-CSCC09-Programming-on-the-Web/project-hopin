import Link from "next/link";

export default function HopinLogo() {
  return (
    <Link
      key="hopin-logo"
      href="/home"
      className="flex flex-row items-center gap-2 md:gap-6 p-2 md:p-4"
    >
      <img src="logo.png" alt="HopIn Logo" className="w-8 md:w-12 h-auto"/>
      <h1 className="font-bold text-2xl md:text-5xl">HopIn</h1>
    </Link>
  );
}
