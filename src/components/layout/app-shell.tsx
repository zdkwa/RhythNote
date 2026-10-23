import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { invalidateAll } from "@/app/queryClient";
import { Sidebar } from "@/components/layout/sidebar";
import { pruneOldDailyData } from "@/data/retention";

export function AppShell() {
  useEffect(() => {
    void pruneOldDailyData()
      .then(() => invalidateAll())
      .catch(() => {
        // 清理失败不阻塞应用启动；记录仍会在下次启动时再次尝试。
      });
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <main className="relative min-w-0 flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto flex min-h-full w-full max-w-[1480px] flex-col px-5 py-6 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
