import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuthenticatedImage, clearImageBlobCache } from "@/hooks/useAuthenticatedImage";
import { logoSrc } from "@/components/ar/facilities/facility-utils";

vi.mock("@/hooks/useAccessToken", () => ({
  useAccessToken: () => "test-access-token-xyz",
}));

describe("logoSrc", () => {
  it("never appends access token into the returned URL", () => {
    const raw = "https://example.com/hospital.png";
    const src = logoSrc(raw);
    expect(src).not.toContain("?t=");
    expect(src).not.toContain("&t=");
    expect(src).not.toContain("test-access-token");
  });
});

describe("useAuthenticatedImage", () => {
  const originalFetch = globalThis.fetch;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    clearImageBlobCache();
    URL.createObjectURL = vi.fn((_blob: Blob) => "blob:http://localhost/mock-blob-uuid");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    clearImageBlobCache();
  });

  it("returns null when url is null or empty", () => {
    const { result } = renderHook(() => useAuthenticatedImage(null));
    expect(result.current.src).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(false);
  });

  it("passes through non-proxy URLs directly without fetch", () => {
    const directUrl = "https://icons.duckduckgo.com/ip3/google.com.ico";
    const { result } = renderHook(() => useAuthenticatedImage(directUrl));
    expect(result.current.src).toBe(directUrl);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(false);
  });

  it("fetches /api/ endpoints with Authorization: Bearer <token> and creates blob URL", async () => {
    let capturedHeaders: Record<string, string> | undefined;

    globalThis.fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      capturedHeaders = init?.headers as Record<string, string>;
      return new Response(new Blob(["fake-image-bytes"], { type: "image/png" }), {
        status: 200,
        headers: { "Content-Type": "image/png" },
      });
    });

    const { result } = renderHook(() =>
      useAuthenticatedImage("/api/logo?url=https%3A%2F%2Fexample.com%2Flogo.png")
    );

    await waitFor(() => {
      expect(result.current.src).toBe("blob:http://localhost/mock-blob-uuid");
    });

    expect(capturedHeaders?.Authorization).toBe("Bearer test-access-token-xyz");
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(false);
  });

  it("reuses cached blob URL on repeated requests without refetching", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(new Blob(["img"], { type: "image/png" }), { status: 200 });
    });
    globalThis.fetch = fetchMock;

    const proxyUrl = "/api/favicon?domain=test.org";

    const { result: first } = renderHook(() => useAuthenticatedImage(proxyUrl));
    await waitFor(() => {
      expect(first.current.src).toBe("blob:http://localhost/mock-blob-uuid");
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Second hook call for the same URL
    const { result: second } = renderHook(() => useAuthenticatedImage(proxyUrl));
    expect(second.current.src).toBe("blob:http://localhost/mock-blob-uuid");
    expect(fetchMock).toHaveBeenCalledTimes(1); // Cached, no second fetch
  });

  it("sets error to true when fetch fails", async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response("Unauthorized", { status: 401 });
    });

    const { result } = renderHook(() =>
      useAuthenticatedImage("/api/logo?url=https%3A%2F%2Fexample.com%2F401.png")
    );

    await waitFor(() => {
      expect(result.current.error).toBe(true);
    });
    expect(result.current.src).toBeNull();
  });
});
