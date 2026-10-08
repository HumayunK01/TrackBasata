import { useState, useCallback, useEffect } from "react";
import { flushSync } from "react-dom";
import { ThemeContext, type Theme, type ThemeVariant } from "@/hooks/useTheme";

const STORAGE_KEY = "basata-theme";
const VARIANT_STORAGE_KEY = "basata-theme-variant";

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Ignore localStorage access failures
  }
  return "dark";
}

function getInitialVariant(): ThemeVariant {
  try {
    localStorage.removeItem(VARIANT_STORAGE_KEY);
  } catch {
    // Ignore localStorage access failures
  }
  return "classic";
}

function applyTheme(theme: Theme) {
  if (theme === "light") {
    document.documentElement.classList.add("light");
    document.documentElement.classList.remove("dark");
  } else {
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
  }
}

function applyVariant(variant: ThemeVariant) {
  document.documentElement.setAttribute("data-theme-variant", variant);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [variant, setVariant] = useState<ThemeVariant>(getInitialVariant);

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {
      // Ignore localStorage access failures
    }
  }, [theme]);

  useEffect(() => {
    applyVariant(variant);
    try { localStorage.setItem(VARIANT_STORAGE_KEY, variant); } catch {
      // Ignore localStorage access failures
    }
  }, [variant]);

  const toggle = useCallback(() => {
    const next: Theme = document.documentElement.classList.contains("light")
      ? "dark"
      : "light";

    // The class flip must happen synchronously inside the view-transition
    // callback so the browser snapshots the correct before/after frames.
    const flip = () => {
      applyTheme(next);
      flushSync(() => setTheme(next));
    };

    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => void;
    };
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (doc.startViewTransition && !reduceMotion) {
      doc.startViewTransition(flip);
    } else {
      flip();
    }
  }, []);

  const toggleVariant = useCallback(() => {
    setVariant((prev) => (prev === "modern" ? "classic" : "modern"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle, variant, setVariant, toggleVariant }}>
      {children}
    </ThemeContext.Provider>
  );
}
