import Image from "next/image";
import Link from "next/link";

export default function HopinLogo() {
  return (
    <Link key="hopin-logo" href="/home" className="flex gap-8 p-8 items-center">
      <Image src="/logo.png" alt="HopIn Logo" width={30} height={20} />
      <h6>HopIn</h6>
    </Link>
  );
}
