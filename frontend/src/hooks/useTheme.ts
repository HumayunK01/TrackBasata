import { createContext, useContext } from "react";

export type Theme = "dark" | "light";
export type ThemeVariant = "modern" | "classic";

export interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  variant: ThemeVariant;
  setVariant: (v: ThemeVariant) => void;
  toggleVariant: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

