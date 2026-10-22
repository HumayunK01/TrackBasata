import { describe, it, expect } from "vitest";

describe("Team URL Parameters & State Sync", () => {
  function updateParams(
    current: string,
    updates: Record<string, string | null | undefined>
  ): string {
    const next = new URLSearchParams(current);
    for (const [key, val] of Object.entries(updates)) {
      if (val === null || val === undefined || val === "") {
        next.delete(key);
      } else {
        next.set(key, val);
      }
    }
    return next.toString();
  }

  function resolveTab(raw: string | null): string {
    const t = raw?.toLowerCase();
    if (
      t === "overview" ||
      t === "logs" ||
      t === "faxed-back" ||
      t === "categories" ||
      t === "activity"
    ) {
      return t;
    }
    return "overview";
  }

  function resolveMember(
    rawUserParam: string | null,
    profiles: Array<{ id: string; first_name: string; last_name: string }>
  ) {
    if (!rawUserParam) return null;
    const q = rawUserParam.toLowerCase();
    return (
      profiles.find(
        (p) =>
          p.id.toLowerCase() === q ||
          `${p.first_name || ""} ${p.last_name || ""}`.trim().toLowerCase().replace(/\s+/g, "-") === q ||
          `${p.first_name || ""} ${p.last_name || ""}`.trim().toLowerCase() === q
      ) || null
    );
  }

  it("updates URL search parameters cleanly and removes null/empty keys", () => {
    let query = updateParams("", { user: "usr_1", tab: "overview" });
    expect(query).toBe("user=usr_1&tab=overview");

    query = updateParams(query, { tab: "logs", page: "2" });
    expect(query).toBe("user=usr_1&tab=logs&page=2");

    query = updateParams(query, { page: null, date: "2026-10-22" });
    expect(query).toBe("user=usr_1&tab=logs&date=2026-10-22");

    // Going back to team clears user details
    query = updateParams(query, { user: null, tab: null, page: null, date: null, fb_search: null });
    expect(query).toBe("");
  });

  it("handles team filters and views in URL parameters", () => {
    let query = updateParams("", { view: "table", role: "admin", status: "active-today", sort: "docs" });
    expect(query).toContain("view=table");
    expect(query).toContain("role=admin");
    expect(query).toContain("status=active-today");
    expect(query).toContain("sort=docs");

    // Switching back to default grid removes view
    query = updateParams(query, { view: null, role: null });
    expect(query).not.toContain("view=");
    expect(query).not.toContain("role=");
    expect(query).toContain("status=active-today");
    expect(query).toContain("sort=docs");
  });

  it("resolves valid drilldown tabs and defaults to overview", () => {
    expect(resolveTab("overview")).toBe("overview");
    expect(resolveTab("logs")).toBe("logs");
    expect(resolveTab("faxed-back")).toBe("faxed-back");
    expect(resolveTab("categories")).toBe("categories");
    expect(resolveTab("activity")).toBe("activity");

    expect(resolveTab(null)).toBe("overview");
    expect(resolveTab("invalid-tab")).toBe("overview");
    expect(resolveTab("")).toBe("overview");
  });

  it("resolves member by ID or friendly name slug", () => {
    const mockProfiles = [
      { id: "uuid-1234", first_name: "John", last_name: "Doe" },
      { id: "uuid-5678", first_name: "Sarah", last_name: "Connor" },
    ];

    expect(resolveMember("uuid-1234", mockProfiles)?.first_name).toBe("John");
    expect(resolveMember("UUID-1234", mockProfiles)?.first_name).toBe("John");
    expect(resolveMember("john-doe", mockProfiles)?.id).toBe("uuid-1234");
    expect(resolveMember("sarah-connor", mockProfiles)?.id).toBe("uuid-5678");
    expect(resolveMember("Sarah Connor", mockProfiles)?.id).toBe("uuid-5678");
    expect(resolveMember("unknown", mockProfiles)).toBeNull();
  });
});
