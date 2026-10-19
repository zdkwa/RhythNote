import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { repository } from "@/data";
import type { ThemeMode } from "@/types/domain";

interface ThemeContextValue {
  theme: ThemeMode;
  resolved: "light" | "dark";
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "rhythnote-theme";

function systemDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function resolve(theme: ThemeMode): "light" | "dark" {
  return theme === "dark" || (theme === "system" && systemDark())
    ? "dark"
    : "light";
}

function apply(theme: ThemeMode): void {
  const resolved = resolve(theme);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached === "light" || cached === "dark" || cached === "system") {
        return cached;
      }
    } catch {
      // ignore storage errors
    }
    return "system";
  });

  useEffect(() => {
    let active = true;
    void repository
      .getTheme()
      .then((stored) => {
        if (!active) return;
        setThemeState(stored);
        try {
          localStorage.setItem(STORAGE_KEY, stored);
        } catch {
          // ignore
        }
      })
      .catch(() => {
        // DB failure is handled by the page-level error boundary.
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    apply(theme);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (theme === "system") apply(theme);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
    apply(next);
    void repository.setTheme(next).catch(() => {
      // The visible theme still changes; a toast is shown by the settings page.
    });
  }, []);

  const value = useMemo(
    () => ({ theme, resolved: resolve(theme), setTheme }),
    [theme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
