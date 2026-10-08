import { describe, it, expect } from "vitest";
import { DOCS, DOC_SLUGS, preloadResources } from "@/pages/Resources";

describe("Resource Docs Configuration", () => {
  it("defines cheat-sheet and test-patients slugs", () => {
    expect(DOC_SLUGS).toContain("cheat-sheet");
    expect(DOC_SLUGS).toContain("test-patients");
  });

  it("has valid preview and external URLs for each doc", () => {
    for (const slug of DOC_SLUGS) {
      const doc = DOCS[slug];
      expect(doc.title).toBeTruthy();
      expect(doc.url).toMatch(/^https:\/\/docs\.google\.com\/document\/d\/.+\/preview$/);
      expect(doc.externalUrl).toMatch(/^https:\/\/docs\.google\.com\/document\/d\/.+/);
    }
  });

  it("handles preloadResources idempotent call without throwing", () => {
    expect(() => preloadResources()).not.toThrow();
    expect(() => preloadResources()).not.toThrow();
  });
});
