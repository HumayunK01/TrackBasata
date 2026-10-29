import { describe, it, expect, beforeEach } from "vitest";
import { clearSessionLocalStorage } from "@/hooks/useAuth";
import { getCachedProfile, setCachedProfile, type Profile } from "@/hooks/useProfile";

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

  it("preserves visual theme, variant preferences, and profile role cache across session resets", () => {
    const adminProfile: Profile = {
      id: "admin-uid-1",
      first_name: "Humayun",
      last_name: "Khan",
      updated_at: "2026-10-30T00:00:00Z",
      daily_goal: 100,
      role: "admin",
      is_disabled: false,
    };

    localStorage.setItem("counter_counts", JSON.stringify({ nextgen: 8 }));
    localStorage.setItem("basata-theme", "dark");
    localStorage.setItem("basata-theme-variant", "modern");
    setCachedProfile(adminProfile);

    clearSessionLocalStorage();

    expect(localStorage.getItem("counter_counts")).toBeNull();
    expect(localStorage.getItem("basata-theme")).toBe("dark");
    expect(localStorage.getItem("basata-theme-variant")).toBe("modern");
    expect(getCachedProfile("admin-uid-1")).toEqual(adminProfile);
  });

  it("stages dirty counter counts into counter_pending_rescue before clearing", () => {
    localStorage.setItem("counter_counts", JSON.stringify({ moved_to_indexing: 120 }));
    localStorage.setItem("counter_counts_date", "2026-10-29");
    localStorage.setItem("counter_dirty", "true");

    clearSessionLocalStorage();

    expect(localStorage.getItem("counter_counts")).toBeNull();
    expect(JSON.parse(localStorage.getItem("counter_pending_rescue") || "null")).toEqual({
      date: "2026-10-29",
      counts: { moved_to_indexing: 120 },
    });
  });

  it("safely handles empty local storage", () => {
    expect(() => clearSessionLocalStorage()).not.toThrow();
    expect(localStorage.getItem("counter_counts")).toBeNull();
    expect(localStorage.getItem("basata-theme")).toBeNull();
  });
});
