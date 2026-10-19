import { useEffect, useState } from "react";
import { todayKey } from "@/lib/date";

export function useToday(): string {
  const [today, setToday] = useState(() => todayKey());

  useEffect(() => {
    let timer = 0;
    const refresh = () => setToday(todayKey());
    const schedule = () => {
      window.clearTimeout(timer);
      const now = new Date();
      const next = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        0,
        250,
      );
      timer = window.setTimeout(() => {
        refresh();
        schedule();
      }, Math.max(500, next.getTime() - now.getTime()));
    };
    schedule();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return today;
}

export function useClock(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    const refresh = () => setNow(new Date());
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [intervalMs]);
  return now;
}
