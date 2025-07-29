import HopinLogo from "../../components/hopin-logo";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col">
      <HopinLogo />
      {children}
   
    </main>
  );
}
