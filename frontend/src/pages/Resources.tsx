import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { BookOpen, ExternalLink, RefreshCw, Tags } from "lucide-react";
import { cn } from "@/lib/utils";

// ponytail: doc ids live in code; to link a new reference doc, add a slug here
// and a sidebar entry pointing at /resources/<slug>.
export const DOCS = {
  "cheat-sheet": {
    id: "cheat-sheet",
    title: "Cheat Sheet",
    path: "/resources/cheat-sheet",
    url: "https://docs.google.com/document/d/1kxOL1qi77tZFXEtyHxikl3f7ebaus4rgQI66OtrobYw/preview",
    externalUrl: "https://docs.google.com/document/d/1kxOL1qi77tZFXEtyHxikl3f7ebaus4rgQI66OtrobYw/edit?usp=sharing",
    icon: BookOpen,
    badge: "Phoenix Heart SOP",
  },
  "test-patients": {
    id: "test-patients",
    title: "Labeling Guide",
    path: "/resources/test-patients",
    url: "https://docs.google.com/document/d/1-ukEpMxL1YvdE4w7DNwhA3xRyGcimeH8ScGjqa03Pr0/preview",
    externalUrl: "https://docs.google.com/document/d/1-ukEpMxL1YvdE4w7DNwhA3xRyGcimeH8ScGjqa03Pr0/edit?usp=sharing",
    icon: Tags,
    badge: "Inbox & Test Patients",
  },
} as const;

export type DocSlug = keyof typeof DOCS;
export const DOC_SLUGS = Object.keys(DOCS) as DocSlug[];

let preloadRequested = false;
const listeners = new Set<() => void>();

export function preloadResources() {
  if (preloadRequested) return;
  preloadRequested = true;
  listeners.forEach((fn) => fn());
}

export function ResourceViewer() {
  const location = useLocation();
  const activeSlug = location.pathname.startsWith("/resources/")
    ? location.pathname.replace("/resources/", "")
    : "";

  const [shouldLoad, setShouldLoad] = useState(() => preloadRequested || Boolean(activeSlug));
  const [loadedMap, setLoadedMap] = useState<Record<string, boolean>>({});
  const [refreshKeys, setRefreshKeys] = useState<Record<string, number>>({
    "cheat-sheet": 0,
    "test-patients": 0,
  });

  useEffect(() => {
    if (activeSlug) {
      preloadResources();
    }
  }, [activeSlug]);

  useEffect(() => {
    const handlePreload = () => setShouldLoad(true);
    listeners.add(handlePreload);
    return () => {
      listeners.delete(handlePreload);
    };
  }, []);

  const handleRefresh = (slug: string) => {
    setLoadedMap((prev) => ({ ...prev, [slug]: false }));
    setRefreshKeys((prev) => ({ ...prev, [slug]: (prev[slug] ?? 0) + 1 }));
  };

  const currentDoc = activeSlug && activeSlug in DOCS ? DOCS[activeSlug as DocSlug] : null;

  // Invalid resource URL redirect
  if (location.pathname.startsWith("/resources/") && !currentDoc) {
    return <Navigate to="/console" replace />;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden p-2 sm:p-4 gap-2">
      {/* Quick switcher & document utility bar */}
      <div className="flex items-center justify-between gap-2 shrink-0 px-2 py-1.5 rounded-lg border border-border/60 bg-card/60 backdrop-blur-xs">
        {/* Document switch tabs */}
        <div className="flex items-center gap-1">
          {DOC_SLUGS.map((slug) => {
            const item = DOCS[slug];
            const isActive = activeSlug === slug;
            const Icon = item.icon;
            return (
              <Link
                key={slug}
                to={item.path}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all select-none",
                  isActive
                    ? "bg-background text-foreground shadow-2xs border border-border/80 font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                )}
              >
                <Icon className={cn("size-3.5", isActive ? "text-primary" : "text-muted-foreground")} />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </div>

        {/* Live status badge & actions */}
        {currentDoc && (
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Reference</span>
            </div>

            <button
              type="button"
              onClick={() => handleRefresh(currentDoc.id)}
              title="Refresh document content"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background border border-transparent hover:border-border transition-colors cursor-pointer"
            >
              <RefreshCw className={cn("size-3.5", !loadedMap[currentDoc.id] && "animate-spin text-primary")} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <a
              href={currentDoc.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open document in Google Docs"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-primary hover:text-primary/80 hover:bg-primary/5 border border-primary/20 transition-colors"
            >
              <span>Open in Docs</span>
              <ExternalLink className="size-3" />
            </a>
          </div>
        )}
      </div>

      {/* Persistent Keep-Alive Frames */}
      <div className="relative flex-1 w-full min-h-0 rounded-md border border-border bg-background overflow-hidden">
        {DOC_SLUGS.map((slug) => {
          const doc = DOCS[slug];
          const isActive = activeSlug === slug;
          const isDocLoaded = loadedMap[slug];

          return (
            <div
              key={slug}
              className={cn(
                "w-full h-full flex flex-col",
                isActive
                  ? "relative opacity-100 z-10 pointer-events-auto"
                  : "absolute inset-0 opacity-0 pointer-events-none -z-10 invisible",
              )}
            >
              {/* Elegant Loading skeleton displayed only while doc is initially bootstrapping */}
              {!isDocLoaded && isActive && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/95 backdrop-blur-xs gap-3 p-6 text-center select-none">
                  <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                    <doc.icon className="size-5 animate-pulse" />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <p className="text-sm font-semibold text-foreground">Loading {doc.title}…</p>
                    <p className="text-xs text-muted-foreground">
                      Connecting to Phoenix Heart live reference guide. Once loaded, page switching is instant.
                    </p>
                  </div>
                  <div className="w-44 h-1 bg-muted rounded-full overflow-hidden mt-1">
                    <div className="w-1/2 h-full bg-primary rounded-full animate-pulse" />
                  </div>
                  <a
                    href={doc.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    <span>Open directly in Google Docs</span>
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              )}

              {/* Keep-alive iframe */}
              {shouldLoad && (
                <iframe
                  key={`${slug}-${refreshKeys[slug] ?? 0}`}
                  aria-label={doc.title}
                  src={doc.url}
                  onLoad={() => setLoadedMap((prev) => ({ ...prev, [slug]: true }))}
                  className="flex-1 w-full h-full border-0 bg-background"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Lightweight route placeholder keeping React Router happy
export default function Resources() {
  return null;
}