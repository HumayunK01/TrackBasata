import { describe, it, expect } from "vitest";
import { dehydrateOptions, PERSIST_CACHE_KEY, initQueryPersistence } from "@/lib/queryPersister";
import { QueryClient, type Query } from "@tanstack/react-query";

type MockQuery = Pick<Query, "queryKey" | "state">;

describe("queryPersister", () => {
  const shouldDehydrate = dehydrateOptions.shouldDehydrateQuery as (q: MockQuery) => boolean;

  it("uses the designated cache key", () => {
    expect(PERSIST_CACHE_KEY).toBe("BASATA_REACT_QUERY_OFFLINE_CACHE");
  });

  it("permits standard successful queries for offline hydration", () => {
    expect(
      shouldDehydrate({
        queryKey: ["categories", "user-123"],
        state: { status: "success" } as Query["state"],
      }),
    ).toBe(true);

    expect(
      shouldDehydrate({
        queryKey: ["daily_logs", "user-123"],
        state: { status: "success" } as Query["state"],
      }),
    ).toBe(true);

    expect(
      shouldDehydrate({
        queryKey: ["profile", "user-123"],
        state: { status: "success" } as Query["state"],
      }),
    ).toBe(true);
  });

  it("never persists sensitive credentials to local storage", () => {
    expect(
      shouldDehydrate({
        queryKey: ["credentials", "folder-1", "user-123"],
        state: { status: "success" } as Query["state"],
      }),
    ).toBe(false);
  });

  it("rejects non-successful query states", () => {
    expect(
      shouldDehydrate({
        queryKey: ["categories"],
        state: { status: "pending" } as Query["state"],
      }),
    ).toBe(false);

    expect(
      shouldDehydrate({
        queryKey: ["categories"],
        state: { status: "error" } as Query["state"],
      }),
    ).toBe(false);
  });

  it("initializes without throwing", () => {
    const qc = new QueryClient();
    expect(() => initQueryPersistence(qc)).not.toThrow();
  });
});
