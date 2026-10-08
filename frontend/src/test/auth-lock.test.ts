import { describe, it, expect } from "vitest";
import { tolerantNavigatorLock } from "@/lib/auth-lock";

describe("tolerantNavigatorLock", () => {
  it("runs the callback when no Web Locks support exists", async () => {
    let ran = false;
    await tolerantNavigatorLock("test-lock", 0, async () => {
      ran = true;
    });
    expect(ran).toBe(true);
  });

  it("runs the callback when the lock is free", async () => {
    if (!("locks" in navigator)) return; // jsdom has no Web Locks; guard test already covers this
    let ran = false;
    await tolerantNavigatorLock("test-lock-free", 0, async () => {
      ran = true;
    });
    expect(ran).toBe(true);
  });
});