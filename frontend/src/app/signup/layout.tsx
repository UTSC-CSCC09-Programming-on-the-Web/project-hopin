import HopinLogo from "../ui/hopin-logo";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <HopinLogo />
      <div className="flex flex-row gap-8 p-20 pt-0">
        <div className="flex-grow">{children}</div>
      </div>
    </main>
  );
}
