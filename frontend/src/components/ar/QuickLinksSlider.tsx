import { useCallback, useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "motion/react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Globe } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export interface QuickLinkItem {
  id: string;
  label: string;
  url: string;
  faviconUrl?: string;
  faviconDomain?: string;
}

export const QUICK_LINKS: QuickLinkItem[] = [
  {
    id: "hrms",
    label: "HRMS",
    url: "https://samhrms.cloud/dashboard",
    faviconUrl: "https://samhrms.cloud/favicon.svg",
  },
  {
    id: "nextgen",
    label: "NextGen RDP",
    url: "https://rdg126572.nextgenmcs.com/RDWeb/Pages/en-US/login.aspx",
    faviconDomain: "nextgen.com",
  },
  {
    id: "basata",
    label: "Basata",
    url: "https://app.basata.ai/login",
    faviconUrl: "https://app.basata.ai/favicon-32x32.png",
    faviconDomain: "basata.ai",
  },
  {
    id: "athena",
    label: "Athena",
    url: "https://myapps.microsoft.com",
  },
];

const OPEN_STORAGE_KEY = "basata_quick_links_open";
// Stored in sessionStorage so position persists across pages/reloads during the
// active session, and automatically resets to 0 (default center-right) on logout
// or when a new session starts.
const POS_SESSION_KEY = "basata_quick_links_y_offset";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
const DRAG_THRESHOLD_PX = 5;
const HEADER_SAFE_TOP_PX = 72; // Below sticky 56px PageHeader + breathing room
const BOTTOM_SAFE_PX = 24;
const DOCK_HALF_HEIGHT_PX = 112; // Keeps the opened 4-favicon dock fully inside viewport

function clampYOffset(offset: number): number {
  if (typeof window === "undefined") return 0;
  const halfViewport = window.innerHeight / 2;
  const minOffset = HEADER_SAFE_TOP_PX + DOCK_HALF_HEIGHT_PX - halfViewport;
  const maxOffset = halfViewport - BOTTOM_SAFE_PX - DOCK_HALF_HEIGHT_PX;
  if (minOffset > maxOffset) return 0;
  return Math.max(minOffset, Math.min(maxOffset, offset));
}

function readSessionYOffset(): number {
  try {
    const raw = sessionStorage.getItem(POS_SESSION_KEY);
    if (raw !== null) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) return clampYOffset(parsed);
    }
  } catch {
    // Ignore storage errors
  }
  return 0;
}

function writeSessionYOffset(offset: number) {
  try {
    sessionStorage.setItem(POS_SESSION_KEY, String(Math.round(offset)));
  } catch {
    // Ignore storage errors
  }
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function FaviconGlyph({ item }: { item: QuickLinkItem }) {
  const host = item.faviconDomain || getHostname(item.url);
  const sources = [
    ...(item.faviconUrl ? [item.faviconUrl] : []),
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`,
    `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`,
  ];
  const [idx, setIdx] = useState(0);

  if (idx >= sources.length) {
    return <Globe className="size-4 text-muted-foreground" strokeWidth={1.8} />;
  }

  return (
    <img
      src={sources[idx]}
      alt={item.label}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setIdx((prev) => prev + 1)}
      className="size-5 rounded-[4px] object-contain select-none"
    />
  );
}

export function QuickLinksSlider() {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const asideRef = useRef<HTMLElement | null>(null);

  const [open, setOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(OPEN_STORAGE_KEY);
      if (saved !== null) return saved === "true";
    } catch {
      // Ignore storage read errors
    }
    return typeof window !== "undefined" ? window.innerWidth >= 768 : true;
  });

  const [isDragging, setIsDragging] = useState(false);

  // Smooth spring-coupled vertical offset from viewport midpoint (50%)
  const rawY = useMotionValue<number>(readSessionYOffset());
  const rawX = useMotionValue<number>(0);
  const springY = useSpring(rawY, { stiffness: 420, damping: 34, mass: 0.55 });
  const springX = useSpring(rawX, { stiffness: 460, damping: 32, mass: 0.5 });

  const dragStateRef = useRef<{
    active: boolean;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    originOffset: number;
    moved: boolean;
  } | null>(null);

  // Reset to default center-right whenever session storage is cleared / user session resets
  useEffect(() => {
    const savedOffset = readSessionYOffset();
    rawY.set(savedOffset);
    rawX.set(0);
  }, [user?.id, rawY, rawX]);

  // Keep offset safely clamped if browser window is resized
  useEffect(() => {
    const onResize = () => {
      const clamped = clampYOffset(rawY.get());
      if (clamped !== rawY.get()) {
        rawY.set(clamped);
        writeSessionYOffset(clamped);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [rawY]);

  const toggleOpen = useCallback((next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem(OPEN_STORAGE_KEY, String(next));
    } catch {
      // Ignore storage write errors
    }
  }, []);

  // Close when clicking anywhere outside the slider or pressing Escape
  useEffect(() => {
    if (!open) return;

    const handlePointerDownOutside = (e: PointerEvent) => {
      if (asideRef.current && !asideRef.current.contains(e.target as Node)) {
        toggleOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        toggleOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDownOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDownOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, toggleOpen]);

  const handleClosedPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      active: true,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      originOffset: rawY.get(),
      moved: false,
    };
  };

  const handleClosedPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const st = dragStateRef.current;
    if (!st || !st.active || st.pointerId !== e.pointerId) return;

    const dx = e.clientX - st.startClientX;
    const dy = e.clientY - st.startClientY;

    if (!st.moved && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
      st.moved = true;
      setIsDragging(true);
    }

    if (st.moved) {
      const nextY = clampYOffset(st.originOffset + dy);
      rawY.set(nextY);
      // Subtle horizontal rubber-band pull that snaps back to right edge on release
      const rubberX = Math.max(-24, Math.min(0, dx * 0.18));
      rawX.set(rubberX);
    }
  };

  const finishClosedPointer = (e: React.PointerEvent<HTMLButtonElement>, cancelled = false) => {
    const st = dragStateRef.current;
    if (!st || st.pointerId !== e.pointerId) return;

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore capture release errors
    }

    dragStateRef.current = null;
    rawX.set(0);

    if (st.moved) {
      const finalY = clampYOffset(rawY.get());
      rawY.set(finalY);
      writeSessionYOffset(finalY);
      setIsDragging(false);
    } else if (!cancelled) {
      setIsDragging(false);
      toggleOpen(true);
    } else {
      setIsDragging(false);
    }
  };

  return (
    <motion.aside
      ref={asideRef}
      aria-label="Quick external links"
      style={{
        y: reduceMotion ? rawY : springY,
        x: reduceMotion ? 0 : springX,
      }}
      className="fixed right-0 top-1/2 -translate-y-1/2 z-30 pointer-events-none select-none print-hidden"
      data-print-hidden="true"
    >
      <AnimatePresence mode="wait" initial={false}>
        {open ? (
          <motion.div
            key="dock-open"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 28, scale: 0.96 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 28, scale: 0.96 }}
            transition={reduceMotion ? { duration: 0.1 } : { duration: 0.2, ease: EASE_OUT }}
            className="pointer-events-auto mr-2.5 flex flex-col items-center gap-1.5 rounded-2xl border border-border/75 dark:border-white/[0.11] bg-card/95 dark:bg-[#161F31]/95 backdrop-blur-xl p-1.5 shadow-[0_12px_28px_-8px_rgba(15,23,42,0.14),0_2px_6px_-1px_rgba(15,23,42,0.05)] dark:shadow-[0_16px_36px_-8px_rgba(0,0,0,0.55)]"
          >
            {QUICK_LINKS.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${link.label}`}
                className={cn(
                  "group relative size-9 rounded-xl flex items-center justify-center",
                  "bg-muted/35 dark:bg-white/[0.04] hover:bg-muted/85 dark:hover:bg-white/[0.1]",
                  "border border-transparent hover:border-border/80 dark:hover:border-white/[0.14]",
                  "transition-[transform,background-color,border-color] duration-150",
                  "hover:scale-[1.06] active:scale-[0.93] cursor-pointer outline-none focus-visible:border-primary"
                )}
              >
                <FaviconGlyph item={link} />

                {/* Floating Left-Side Label Tooltip */}
                <span
                  role="tooltip"
                  className="pointer-events-none absolute right-full mr-2.5 top-1/2 -translate-y-1/2 whitespace-nowrap inline-flex items-center gap-1 rounded-lg bg-white dark:bg-[#161F31] text-slate-900 dark:text-foreground border border-slate-200/90 dark:border-white/[0.12] px-2.5 py-1 text-[11px] font-medium shadow-[0_6px_18px_-4px_rgba(15,23,42,0.12)] dark:shadow-md opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 transition-[opacity,transform] duration-150"
                >
                  <span>{link.label}</span>
                  <ArrowUpRight className="size-3 text-slate-500 dark:text-muted-foreground" strokeWidth={2} />
                </span>
              </a>
            ))}

            {/* Subtle Separator & Collapse Trigger */}
            <div className="w-5 h-px bg-border/60 dark:bg-white/[0.09] my-0.5" aria-hidden="true" />

            <button
              type="button"
              onClick={() => toggleOpen(false)}
              title="Hide quick links"
              aria-label="Hide quick links"
              className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/75 dark:hover:bg-white/[0.08] active:scale-[0.92] transition-[transform,background-color,color] duration-150 cursor-pointer outline-none focus-visible:text-foreground"
            >
              <ChevronRight className="size-3.5" strokeWidth={2} />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="dock-closed"
            type="button"
            onPointerDown={handleClosedPointerDown}
            onPointerMove={handleClosedPointerMove}
            onPointerUp={(e) => finishClosedPointer(e, false)}
            onPointerCancel={(e) => finishClosedPointer(e, true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleOpen(true);
              }
            }}
            title="Click to open · Drag to reposition"
            aria-label="Open quick links (drag up or down to reposition)"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 16 }}
            animate={
              reduceMotion
                ? { opacity: 1 }
                : { opacity: 1, x: 0, scale: isDragging ? 1.07 : 1 }
            }
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 16 }}
            transition={reduceMotion ? { duration: 0.1 } : { duration: 0.18, ease: EASE_OUT }}
            className={cn(
              "pointer-events-auto group relative w-8 hover:w-9 h-14 rounded-l-2xl border border-r-0 backdrop-blur-xl flex items-center justify-center text-foreground shadow-[0_10px_24px_-6px_rgba(15,23,42,0.16)] dark:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.6)] transition-[width,border-color,background-color] duration-150 touch-none outline-none",
              isDragging
                ? "cursor-grabbing w-9 border-primary bg-card dark:bg-[#1A253B]"
                : "cursor-grab border-primary/35 hover:border-primary/60 bg-card/95 dark:bg-[#161F31]/95"
            )}
          >
            <ChevronLeft
              className={cn(
                "size-[18px] text-primary transition-transform duration-150 shrink-0",
                !isDragging && "group-hover:-translate-x-0.5"
              )}
              strokeWidth={2.4}
            />

            {/* Hover label (suppressed mid-drag) */}
            <span
              role="tooltip"
              className={cn(
                "pointer-events-none absolute right-full mr-2.5 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-white dark:bg-[#161F31] text-slate-900 dark:text-foreground border border-slate-200/90 dark:border-white/[0.12] px-2.5 py-1 text-[11px] font-medium shadow-[0_6px_18px_-4px_rgba(15,23,42,0.12)] dark:shadow-md opacity-0 translate-x-1 transition-[opacity,transform] duration-150",
                !isDragging && "group-hover:opacity-100 group-hover:translate-x-0"
              )}
            >
              Quick Links
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
