import { useEffect, type RefObject } from "react";
import Lenis from "lenis";
import { useReducedMotion } from "motion/react";

interface UseLenisOptions {
  containerRef?: RefObject<HTMLElement | null>;
  lerp?: number;
  wheelMultiplier?: number;
}

/**
 * Reusable hook to mount buttery 120Hz smooth Lenis scrolling.
 * Works seamlessly with document window or custom scroll container.
 * Includes live dynamic limit getters to prevent mid-page scroll lockups.
 */
export function useLenis(options?: UseLenisOptions) {
  const reduce = useReducedMotion();
  const containerRef = options?.containerRef;
  const lerp = options?.lerp ?? 0.12;
  const wheelMultiplier = options?.wheelMultiplier ?? 0.85;

  useEffect(() => {
    if (reduce) return;

    const container = containerRef ? containerRef.current : null;
    const isWindow = !container;

    const lenisInstance = new Lenis({
      ...(container ? { wrapper: container, content: container } : {}),
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
        return Math.max(0, container!.scrollHeight - container!.clientHeight);
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
            x: Math.max(0, container!.scrollWidth - container!.clientWidth),
            y: Math.max(0, container!.scrollHeight - container!.clientHeight),
          };
        },
        configurable: true,
      });

      Object.defineProperty(lenisInstance.dimensions, "scrollHeight", {
        get() {
          return isWindow ? document.documentElement.scrollHeight : container!.scrollHeight;
        },
        configurable: true,
      });

      Object.defineProperty(lenisInstance.dimensions, "scrollWidth", {
        get() {
          return isWindow ? document.documentElement.scrollWidth : container!.scrollWidth;
        },
        configurable: true,
      });

      Object.defineProperty(lenisInstance.dimensions, "height", {
        get() {
          return isWindow ? window.innerHeight : container!.clientHeight;
        },
        configurable: true,
      });

      Object.defineProperty(lenisInstance.dimensions, "width", {
        get() {
          return isWindow ? window.innerWidth : container!.clientWidth;
        },
        configurable: true,
      });
    }

    // Synchronize Lenis state when native scrollbar is dragged
    const handleNativeScroll = () => {
      const currentScroll = isWindow ? window.scrollY : container!.scrollTop;
      if (Math.abs(currentScroll - lenisInstance.animatedScroll) > 1) {
        lenisInstance.animatedScroll = currentScroll;
        lenisInstance.targetScroll = currentScroll;
      }
    };

    const target: EventTarget = isWindow ? window : container!;
    target.addEventListener("scroll", handleNativeScroll, { passive: true });

    // Recalculate on content or DOM updates
    const resizeObserver = new ResizeObserver(() => {
      lenisInstance.resize();
    });

    if (isWindow) {
      resizeObserver.observe(document.body);
    } else {
      resizeObserver.observe(container!);
      Array.from(container!.children).forEach((child) => resizeObserver.observe(child));
    }

    (window as unknown as { __lenis?: Lenis }).__lenis = lenisInstance;

    return () => {
      target.removeEventListener("scroll", handleNativeScroll);
      resizeObserver.disconnect();
      lenisInstance.destroy();
      if ((window as unknown as { __lenis?: Lenis }).__lenis === lenisInstance) {
        delete (window as unknown as { __lenis?: unknown }).__lenis;
      }
    };
  }, [reduce, containerRef, lerp, wheelMultiplier]);
}
