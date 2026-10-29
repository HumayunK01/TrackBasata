import { useEffect, type RefObject } from "react";
import Lenis from "lenis";
import { useReducedMotion } from "motion/react";

interface UseLenisOptions {
  containerRef?: RefObject<HTMLElement | null>;
  targetSelector?: string;
  lerp?: number;
  wheelMultiplier?: number;
}

/**
 * Reusable hook to mount buttery 120Hz smooth Lenis scrolling.
 * Works seamlessly with document window, custom container, or dynamic target selector.
 * Includes live dynamic limit getters to prevent mid-page scroll lockups.
 */
export function useLenis(options?: UseLenisOptions) {
  const reduce = useReducedMotion();
  const containerRef = options?.containerRef;
  const targetSelector = options?.targetSelector;
  const lerp = options?.lerp ?? 0.12;
  const wheelMultiplier = options?.wheelMultiplier ?? 0.85;

  useEffect(() => {
    if (reduce) return;

    let isCancelled = false;
    let cleanupCurrent: (() => void) | null = null;

    const setupOnContainer = (scrollContainer: HTMLElement | null) => {
      const isWindow = !scrollContainer;

      const lenisInstance = new Lenis({
        ...(scrollContainer ? { wrapper: scrollContainer, content: scrollContainer } : {}),
        autoRaf: true,
        lerp,
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier,
        touchMultiplier: 1,
        prevent: (node) => {
          return (
            node.hasAttribute("data-lenis-prevent") ||
            Boolean(node.closest("[data-lenis-prevent], [role='dialog'], [role='menu'], [role='listbox']"))
          );
        },
      });

      // Ensure Lenis evaluates live scroll boundaries dynamically on every check
      Object.defineProperty(lenisInstance, "limit", {
        get() {
          if (isWindow) {
            return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
          }
          return Math.max(0, scrollContainer!.scrollHeight - scrollContainer!.clientHeight);
        },
        configurable: true,
      });

      if (lenisInstance.dimensions) {
        Object.defineProperty(lenisInstance.dimensions, "limit", {
          get() {
            if (isWindow) {
              return {
                x: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
                y: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
              };
            }
            return {
              x: Math.max(0, scrollContainer!.scrollWidth - scrollContainer!.clientWidth),
              y: Math.max(0, scrollContainer!.scrollHeight - scrollContainer!.clientHeight),
            };
          },
          configurable: true,
        });

        Object.defineProperty(lenisInstance.dimensions, "scrollHeight", {
          get() {
            return isWindow ? document.documentElement.scrollHeight : scrollContainer!.scrollHeight;
          },
          configurable: true,
        });

        Object.defineProperty(lenisInstance.dimensions, "scrollWidth", {
          get() {
            return isWindow ? document.documentElement.scrollWidth : scrollContainer!.scrollWidth;
          },
          configurable: true,
        });

        Object.defineProperty(lenisInstance.dimensions, "height", {
          get() {
            return isWindow ? window.innerHeight : scrollContainer!.clientHeight;
          },
          configurable: true,
        });

        Object.defineProperty(lenisInstance.dimensions, "width", {
          get() {
            return isWindow ? window.innerWidth : scrollContainer!.clientWidth;
          },
          configurable: true,
        });
      }

      // Synchronize Lenis state when native scrollbar is dragged
      const handleNativeScroll = () => {
        const currentScroll = isWindow ? window.scrollY : scrollContainer!.scrollTop;
        if (Math.abs(currentScroll - lenisInstance.animatedScroll) > 1) {
          lenisInstance.animatedScroll = currentScroll;
          lenisInstance.targetScroll = currentScroll;
        }
      };

      const target: EventTarget = isWindow ? window : scrollContainer!;
      target.addEventListener("scroll", handleNativeScroll, { passive: true });

      // Update dimensions without calling lenisInstance.resize() (which resets
      // targetScroll = actualScroll and cancels in-flight smooth wheel momentum).
      const refreshDimensions = () => {
        lenisInstance.dimensions?.resize();
      };

      const resizeObserver = new ResizeObserver(refreshDimensions);
      let mutationObserver: MutationObserver | null = null;

      if (isWindow) {
        resizeObserver.observe(document.body);
      } else {
        resizeObserver.observe(scrollContainer!);
        Array.from(scrollContainer!.children).forEach((child) => resizeObserver.observe(child));

        mutationObserver = new MutationObserver(() => {
          Array.from(scrollContainer!.children).forEach((child) => {
            resizeObserver.observe(child);
          });
          refreshDimensions();
        });
        mutationObserver.observe(scrollContainer!, { childList: true, subtree: true });
      }

      (window as unknown as { __lenis?: Lenis }).__lenis = lenisInstance;

      return () => {
        target.removeEventListener("scroll", handleNativeScroll);
        resizeObserver.disconnect();
        mutationObserver?.disconnect();
        lenisInstance.destroy();
        if ((window as unknown as { __lenis?: Lenis }).__lenis === lenisInstance) {
          delete (window as unknown as { __lenis?: unknown }).__lenis;
        }
      };
    };

    if (containerRef && targetSelector) {
      const parent = containerRef.current;
      if (parent) {
        let activeTarget = parent.querySelector(targetSelector) as HTMLElement | null;
        if (activeTarget) {
          cleanupCurrent = setupOnContainer(activeTarget);
        }
        // Keep observing so if the target <main> is replaced (e.g. after Suspense,
        // loading state transitions, or Vite HMR), Lenis automatically rebinds.
        const mountObserver = new MutationObserver(() => {
          if (isCancelled) return;
          const el = parent.querySelector(targetSelector) as HTMLElement | null;
          if (el && el !== activeTarget) {
            if (cleanupCurrent) cleanupCurrent();
            activeTarget = el;
            cleanupCurrent = setupOnContainer(el);
          }
        });
        mountObserver.observe(parent, { childList: true, subtree: true });
        return () => {
          isCancelled = true;
          mountObserver.disconnect();
          if (cleanupCurrent) cleanupCurrent();
        };
      }
    } else {
      const targetEl = containerRef ? containerRef.current : null;
      cleanupCurrent = setupOnContainer(targetEl);
    }

    return () => {
      isCancelled = true;
      if (cleanupCurrent) cleanupCurrent();
    };
  }, [reduce, containerRef, targetSelector, lerp, wheelMultiplier]);
}
