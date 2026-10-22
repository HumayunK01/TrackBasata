import { Suspense, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import Lenis from "lenis";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/ar/AppSidebar";
import { MobileTabBar } from "@/components/ar/MobileTabBar";
import { PageHeader } from "@/components/ar/PageHeader";
import { HrmsReminder } from "@/components/ar/HrmsReminder";
import { ResourceViewer, preloadResources } from "@/pages/Resources";
import { CommandPalette } from "@/components/ar/CommandPalette";
import { cn } from "@/lib/utils";

const pageTitles: Record<string, string> = {
  "/log": "Daily Log",
  "/counter": "Counter",
  "/tracker": "Tracker",
  "/report": "Report",
  "/vault": "Vault",
  "/console": "Console",
  "/settings": "Settings",
  "/team": "Team",
  "/facilities": "Facilities",
  "/resources/cheat-sheet": "Cheat Sheet",
  "/resources/test-patients": "Labeling Guide",
  "/privacy": "Privacy Policy",
  "/cookies": "Cookie Policy",
  "/terms": "Terms of Service",
};

export function AnimatedPage({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduce) return;

    let lenisInstance: Lenis | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let isCancelled = false;

    const setupLenis = (scrollContainer: HTMLElement) => {
      lenisInstance = new Lenis({
        wrapper: scrollContainer,
        content: scrollContainer,
        autoRaf: true,
        lerp: 0.12, // Snappy 120Hz responsive interpolation; eliminates lag
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier: 0.85,
        touchMultiplier: 1,
        prevent: (node) => {
          return (
            node.hasAttribute("data-lenis-prevent") ||
            Boolean(node.closest("[data-lenis-prevent], [role='dialog'], [role='menu'], [role='listbox']"))
          );
        },
      });

      // Ensure Lenis evaluates live scroll boundaries dynamically on every check instead of
      // relying on stale cached initial height, preventing mid-page scroll lockups on dynamic content.
      Object.defineProperty(lenisInstance, "limit", {
        get() {
          return Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
        },
        configurable: true,
      });

      if (lenisInstance.dimensions) {
        Object.defineProperty(lenisInstance.dimensions, "limit", {
          get() {
            return {
              x: Math.max(0, scrollContainer.scrollWidth - scrollContainer.clientWidth),
              y: Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight),
            };
          },
          configurable: true,
        });
        Object.defineProperty(lenisInstance.dimensions, "scrollHeight", {
          get() {
            return scrollContainer.scrollHeight;
          },
          configurable: true,
        });
        Object.defineProperty(lenisInstance.dimensions, "scrollWidth", {
          get() {
            return scrollContainer.scrollWidth;
          },
          configurable: true,
        });
        Object.defineProperty(lenisInstance.dimensions, "height", {
          get() {
            return scrollContainer.clientHeight;
          },
          configurable: true,
        });
        Object.defineProperty(lenisInstance.dimensions, "width", {
          get() {
            return scrollContainer.clientWidth;
          },
          configurable: true,
        });
      }

      // Synchronize Lenis state when native scrollbar is dragged
      const handleNativeScroll = () => {
        if (!lenisInstance) return;
        const currentScroll = scrollContainer.scrollTop;
        if (Math.abs(currentScroll - lenisInstance.animatedScroll) > 1) {
          lenisInstance.animatedScroll = currentScroll;
          lenisInstance.targetScroll = currentScroll;
        }
      };
      scrollContainer.addEventListener("scroll", handleNativeScroll, { passive: true });

      // Observe content and child elements to trigger recalculations whenever content updates
      resizeObserver = new ResizeObserver(() => {
        lenisInstance?.resize();
      });
      resizeObserver.observe(scrollContainer);
      Array.from(scrollContainer.children).forEach((child) => {
        resizeObserver?.observe(child);
      });

      mutationObserver = new MutationObserver(() => {
        Array.from(scrollContainer.children).forEach((child) => {
          resizeObserver?.observe(child);
        });
        lenisInstance?.resize();
      });
      mutationObserver.observe(scrollContainer, {
        childList: true,
        subtree: true,
      });

      (window as unknown as { __lenis?: Lenis }).__lenis = lenisInstance;

      return () => {
        scrollContainer.removeEventListener("scroll", handleNativeScroll);
        resizeObserver?.disconnect();
        mutationObserver?.disconnect();
      };
    };

    let cleanupListeners: (() => void) | null = null;
    const initialMain = pageRef.current?.querySelector("main") as HTMLElement | null;

    if (initialMain) {
      cleanupListeners = setupLenis(initialMain);
    } else {
      const mountObserver = new MutationObserver(() => {
        const main = pageRef.current?.querySelector("main") as HTMLElement | null;
        if (main && !isCancelled) {
          mountObserver.disconnect();
          cleanupListeners = setupLenis(main);
        }
      });
      if (pageRef.current) {
        mountObserver.observe(pageRef.current, { childList: true, subtree: true });
      }
      cleanupListeners = () => mountObserver.disconnect();
    }

    return () => {
      isCancelled = true;
      if (cleanupListeners) cleanupListeners();
      if (lenisInstance) {
        lenisInstance.destroy();
        if ((window as unknown as { __lenis?: Lenis }).__lenis === lenisInstance) {
          delete (window as unknown as { __lenis?: unknown }).__lenis;
        }
      }
    };
  }, [reduce]);

  return (
    <motion.div
      ref={pageRef}
      initial={reduce ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={reduce ? { duration: 0 } : { duration: 0.15, ease: "easeOut" }}
      className="flex-1 min-h-0 flex flex-col min-w-0 overflow-hidden"
    >
      {children}
    </motion.div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // Idle background warmup for external Google Docs
    const timer = setTimeout(() => {
      preloadResources();
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const title = pageTitles[location.pathname] ?? "";
  const isResourceRoute = location.pathname.startsWith("/resources/");

  return (
    <div className="flex h-dvh w-full bg-background text-foreground overflow-hidden relative">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <PageHeader now={now} title={title} />

        {/* Persistent keep-alive Resource Viewer */}
        <div
          className={cn(
            "flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden",
            isResourceRoute
              ? "relative flex"
              : "absolute inset-0 invisible pointer-events-none -z-50",
          )}
        >
          <ResourceViewer />
        </div>

        {/* Regular route pages with animated transitions */}
        <div
          className={cn(
            "flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden",
            isResourceRoute && "hidden",
          )}
        >
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center text-xs font-mono uppercase tracking-widest text-muted-foreground">
                <div className="size-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin mr-2.5" />
                <span>Loading...</span>
              </div>
            }
          >
            <AnimatedPage key={location.pathname}>
              {children}
            </AnimatedPage>
          </Suspense>
        </div>

        <MobileTabBar />
      </div>
      <HrmsReminder />
      <CommandPalette />
    </div>
  );
}
