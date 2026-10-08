import { useState, useEffect } from "react";
import { useAuthenticatedImage } from "@/hooks/useAuthenticatedImage";

// ponytail: favicon is fetched via the same-origin /api/favicon proxy (which
// itself calls DuckDuckGo server-side), so the production CSP/COEP don't block it.
// The resolved domain is still sent to DuckDuckGo from the server.
function resolveDomain(service: string, website: string | null | undefined): string | null {
  const raw = (website ?? "").trim();
  if (raw) {
    try {
      const url = raw.startsWith("http") ? new URL(raw) : new URL(`https://${raw}`);
      if (url.hostname.includes(".")) return url.hostname;
    } catch {
      // fall through to guessing
    }
  }
  const guessed = service.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (guessed.length >= 2) return `${guessed}.com`;
  return null;
}

export function ServiceLogo({ service, website, className }: { service: string; website: string | null | undefined; className?: string }) {
  const [failed, setFailed] = useState(false);
  const domain = resolveDomain(service, website);
  const letter = service.trim().charAt(0).toUpperCase() || "?";

  // Try same-origin proxy first (with auth header), fall back to direct if proxy fails
  const [stage, setStage] = useState<"proxy" | "direct">("proxy");
  const proxy = domain ? `/api/favicon?domain=${encodeURIComponent(domain)}` : null;
  const direct = domain ? `https://icons.duckduckgo.com/ip3/${domain}.ico` : null;

  const currentUrl = stage === "proxy" ? proxy : direct;
  const { src, error } = useAuthenticatedImage(currentUrl);

  useEffect(() => {
    if (error && stage === "proxy") {
      setStage("direct");
    }
  }, [error, stage]);

  if (!domain || failed || (stage === "direct" && error)) {
    return (
      <span
        className={`grid place-items-center rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-semibold shrink-0 ${className ?? "size-6"}`}
        aria-hidden
      >
        {letter}
      </span>
    );
  }

  if (!src) {
    return (
      <span
        className={`grid place-items-center rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-semibold shrink-0 ${className ?? "size-6"}`}
        aria-hidden
      >
        {letter}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={24}
      height={24}
      loading="lazy"
      onError={() => (stage === "proxy" ? setStage("direct") : setFailed(true))}
      className={`object-contain rounded-md shrink-0 ${className ?? "size-6"}`}
    />
  );
}
