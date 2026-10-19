import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/sidebar";
import { QuickCreate } from "@/components/layout/quick-create";

export function AppShell() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <main className="relative min-w-0 flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto flex min-h-full w-full max-w-[1480px] flex-col px-5 py-6 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>
      <QuickCreate />
    </div>
  );
}
