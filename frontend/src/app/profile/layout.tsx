import HopinLogo from "../ui/hopin-logo";
import SideNav from "../ui/profile/side-nav";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <HopinLogo />
      <div className="flex flex-row gap-8 p-20 pt-0">
        <div className="w-72 min-h-fit p-2">
          <SideNav />
        </div>
        <div className="flex-grow">{children}</div>
      </div>
    </main>
  );
}
