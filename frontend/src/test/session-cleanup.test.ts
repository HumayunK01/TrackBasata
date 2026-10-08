import { describe, it, expect, beforeEach } from "vitest";
import { clearSessionLocalStorage } from "@/hooks/useAuth";

describe("clearSessionLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("clears counter counts and session keys on logout", () => {
    localStorage.setItem("counter_counts", JSON.stringify({ nextgen: 12, athena: 5 }));
    localStorage.setItem("counter_selected_keys", JSON.stringify(["nextgen", "athena"]));
    localStorage.setItem("basata-session-started-at", String(Date.now()));
    localStorage.setItem("today_daily_goal", "60");
    localStorage.setItem("tz_preference", "local");
    sessionStorage.setItem("temp_key", "val");

    clearSessionLocalStorage();

    expect(localStorage.getItem("counter_counts")).toBeNull();
    expect(localStorage.getItem("counter_selected_keys")).toBeNull();
    expect(localStorage.getItem("basata-session-started-at")).toBeNull();
    expect(localStorage.getItem("today_daily_goal")).toBeNull();
    expect(localStorage.getItem("tz_preference")).toBeNull();
    expect(sessionStorage.getItem("temp_key")).toBeNull();
  });

  it("preserves visual theme and variant preferences across session resets", () => {
    localStorage.setItem("counter_counts", JSON.stringify({ nextgen: 8 }));
    localStorage.setItem("basata-theme", "dark");
    localStorage.setItem("basata-theme-variant", "modern");

    clearSessionLocalStorage();

    expect(localStorage.getItem("counter_counts")).toBeNull();
    expect(localStorage.getItem("basata-theme")).toBe("dark");
    expect(localStorage.getItem("basata-theme-variant")).toBe("modern");
  });

  it("safely handles empty local storage", () => {
    expect(() => clearSessionLocalStorage()).not.toThrow();
    expect(localStorage.getItem("counter_counts")).toBeNull();
    expect(localStorage.getItem("basata-theme")).toBeNull();
  });
});
