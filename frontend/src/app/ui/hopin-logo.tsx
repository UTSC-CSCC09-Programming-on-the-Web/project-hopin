import Link from "next/link";

export default function HopinLogo() {
  return (
    <Link
      key="hopin-logo"
      href="/"
      className="flex flex-row gap-8 p-20 pb-10">
      <img src="logo.png" alt="HopIn Logo" />
      <h1 className="font-bold text-5xl">HopIn</h1>
    </Link>
  );
}