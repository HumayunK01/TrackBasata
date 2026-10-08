import { useEffect, useState } from "react";
import { useAccessToken } from "./useAccessToken";

// ponytail: Module-level cache of object URLs keyed by endpoint URL.
// Survives re-renders and page navigation to prevent flicker and redundant proxy requests.
const blobCache = new Map<string, string>();
const inflightRequests = new Map<string, Promise<string | null>>();

export function clearImageBlobCache(): void {
  for (const objectUrl of blobCache.values()) {
    try {
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Ignore if environment lacks full URL.revokeObjectURL
    }
  }
  blobCache.clear();
  inflightRequests.clear();
}

export function useAuthenticatedImage(url: string | null | undefined): {
  src: string | null;
  loading: boolean;
  error: boolean;
} {
  const token = useAccessToken();
  const [src, setSrc] = useState<string | null>(() => {
    if (!url) return null;
    if (!url.startsWith("/api/")) return url;
    return blobCache.get(url) ?? null;
  });
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(() => {
    if (!url) return false;
    if (!url.startsWith("/api/")) return false;
    return !blobCache.has(url);
  });

  useEffect(() => {
    if (!url) {
      setSrc(null);
      setError(false);
      setLoading(false);
      return;
    }

    if (!url.startsWith("/api/")) {
      setSrc(url);
      setError(false);
      setLoading(false);
      return;
    }

    const cached = blobCache.get(url);
    if (cached) {
      setSrc(cached);
      setError(false);
      setLoading(false);
      return;
    }

    if (!token) {
      setLoading(true);
      return;
    }

    let active = true;
    setLoading(true);
    setError(false);

    let promise = inflightRequests.get(url);
    if (!promise) {
      promise = fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          const objectUrl = URL.createObjectURL(blob);
          blobCache.set(url, objectUrl);
          return objectUrl;
        })
        .catch(() => null)
        .finally(() => {
          inflightRequests.delete(url);
        });
      inflightRequests.set(url, promise);
    }

    promise.then((resolvedUrl) => {
      if (!active) return;
      if (resolvedUrl) {
        setSrc(resolvedUrl);
        setError(false);
      } else {
        setError(true);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [url, token]);

  return { src, loading, error };
}
