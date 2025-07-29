import SideNav from "../../../components/profile/side-nav";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <div className="flex flex-row gap-8 p-20 pt-0"></div>
      <div className="w-72 min-h-fit p-2">
        <SideNav />
      </div>
      <div className="flex-grow">{children}</div>
    </main>
  );
}
