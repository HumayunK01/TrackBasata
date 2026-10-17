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
};

export function AnimatedPage({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduce) return;

    let lenisInstance: Lenis | null = null;

    const rafId = requestAnimationFrame(() => {
      const scrollContainer = pageRef.current?.querySelector("main") as HTMLElement | null;
      if (!scrollContainer) return;

      const content = (scrollContainer.firstElementChild as HTMLElement) || scrollContainer;

      lenisInstance = new Lenis({
        wrapper: scrollContainer,
        content,
        autoRaf: true,
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 1.5,
        wheelMultiplier: 1,
        prevent: (node) => {
          return (
            node.hasAttribute("data-lenis-prevent") ||
            Boolean(node.closest("[data-lenis-prevent], [role='dialog'], [role='menu'], [role='listbox']"))
          );
        },
      });

      (window as unknown as { __lenis?: Lenis }).__lenis = lenisInstance;
    });

    return () => {
      cancelAnimationFrame(rafId);
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
