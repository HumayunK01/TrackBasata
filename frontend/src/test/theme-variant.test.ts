import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { ThemeProvider } from "@/components/ar/ThemeProvider";
import { useTheme } from "@/hooks/useTheme";

describe("Theme Variant Switcher", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme-variant");
  });

  it("defaults to classic variant", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      React.createElement(ThemeProvider, null, children)
    );
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.variant).toBe("classic");
    expect(document.documentElement.getAttribute("data-theme-variant")).toBe("classic");
  });

  it("toggles between classic and modern variants", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      React.createElement(ThemeProvider, null, children)
    );
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.variant).toBe("classic");

    act(() => {
      result.current.toggleVariant();
    });

    expect(result.current.variant).toBe("modern");
    expect(document.documentElement.getAttribute("data-theme-variant")).toBe("modern");
    expect(localStorage.getItem("basata-theme-variant")).toBe("modern");

    act(() => {
      result.current.toggleVariant();
    });

    expect(result.current.variant).toBe("classic");
    expect(document.documentElement.getAttribute("data-theme-variant")).toBe("classic");
    expect(localStorage.getItem("basata-theme-variant")).toBe("classic");
  });

  it("toggles between dark and light mode and sets classes", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      React.createElement(ThemeProvider, null, children)
    );
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.theme).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("basata-theme")).toBe("light");

    act(() => {
      result.current.toggle();
    });

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });
});
