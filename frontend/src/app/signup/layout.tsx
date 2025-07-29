import HopinLogo from "../../components/hopin-logo";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex items-center p-4 gap-8">
        <HopinLogo />
      </div>
      {/* <div className="flex flex-row gap-8 p-20 pt-0"> */}
        <div className="flex-grow">{children}</div>
      {/* </div> */}
    </main>
  );
}
