import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { colorForKey, withAlpha } from "@/lib/cat-colors";
import type { Category } from "@/hooks/useCategories";
import { Minus, Plus, X } from "@/components/ui/icons";
import { playTapFeedback } from "@/lib/audio-feedback";
import { cn } from "@/lib/utils";

/** Press-and-hold auto-repeat for the +/- buttons. */
function useHoldRepeat(action: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (interval.current) clearInterval(interval.current);
    timer.current = null;
    interval.current = null;
  }, []);

  const start = useCallback(() => {
    action();
    timer.current = setTimeout(() => {
      interval.current = setInterval(action, 80);
    }, 400);
  }, [action]);

  useEffect(() => stop, [stop]);
  return { start, stop };
}

interface CounterCardProps {
  cat: Category;
  count: number;
  maxCount: number;
  total?: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  hotkeyIndex?: number;
}

interface FloatingBadge {
  id: number;
  text: string;
}

export function CounterCard({
  cat,
  count,
  maxCount,
  onIncrement,
  onDecrement,
  onRemove,
}: CounterCardProps) {
  const clr = colorForKey(cat.key);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const [floatingBadges, setFloatingBadges] = useState<FloatingBadge[]>([]);
  const prevCountRef = useRef(count);
  const fill = maxCount > 0 ? Math.min(100, (count / maxCount) * 100) : 0;
  const cardRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const rawPatternId = useId();
  const patternId = `doc-doodle-${rawPatternId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const patternOffset = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < cat.key.length; i++) {
      hash = (hash * 31 + cat.key.charCodeAt(i)) | 0;
    }
    return {
      x: Math.abs(hash) % 140,
      y: Math.abs(hash >> 4) % 140,
    };
  }, [cat.key]);

  const spawnBadge = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setFloatingBadges((prev) => [...prev.slice(-3), { id, text }]);
    setTimeout(() => {
      setFloatingBadges((prev) => prev.filter((b) => b.id !== id));
    }, 650);
  }, []);

  const triggerIncrement = useCallback(() => {
    setDirection("up");
    spawnBadge("+1");
    onIncrement();
    playTapFeedback();
  }, [onIncrement, spawnBadge]);

  const triggerDecrement = useCallback(() => {
    setDirection("down");
    spawnBadge("-1");
    onDecrement();
    playTapFeedback();
  }, [onDecrement, spawnBadge]);

  const inc = useHoldRepeat(triggerIncrement);
  const dec = useHoldRepeat(triggerDecrement);

  const tap = () => {
    triggerIncrement();
  };

  // Sync animation when count changes from external sources (e.g. keyboard shortcuts)
  useEffect(() => {
    if (prevCountRef.current !== count) {
      if (count > prevCountRef.current) {
        setDirection("up");
        spawnBadge(`+${count - prevCountRef.current}`);
      } else if (count < prevCountRef.current) {
        setDirection("down");
        spawnBadge(`${count - prevCountRef.current}`);
      }
      prevCountRef.current = count;
    }
  }, [count, spawnBadge]);

  // Pulse ring animation: compositor-driven Web Animations API
  useEffect(() => {
    if (count === 0 || !ringRef.current) return;
    ringRef.current.animate(
      [
        { transform: "scale(1)", opacity: 0.35 },
        { transform: "scale(2.2)", opacity: 0 },
      ],
      { duration: 400, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
    );
  }, [count]);

  return (
    <div
      ref={cardRef}
      className="group rounded-2xl border border-border/65 bg-card/80 p-4 shadow-2xs transition-all duration-150 hover:border-border hover:shadow-sm flex flex-col justify-between relative overflow-hidden"
    >
      {/* Pulse ring on tap */}
      <div
        ref={ringRef}
        className="pulse-ring absolute inset-0 pointer-events-none rounded-2xl opacity-0"
        style={{ backgroundColor: clr }}
      />

      {/* Subtle relative progress fill from bottom */}
      <div
        className="absolute inset-x-0 bottom-0 transition-[height] duration-500 ease-out pointer-events-none opacity-20"
        style={{ height: `${fill}%`, backgroundColor: clr }}
        aria-hidden
      />

      {/* Seamless Document & Clinical Doodle Wallpaper */}
      <svg
        className="absolute inset-0 size-full pointer-events-none select-none text-foreground opacity-[0.065] dark:opacity-[0.075] group-hover:opacity-[0.09] dark:group-hover:opacity-[0.105] transition-opacity duration-200"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id={patternId}
            width="168"
            height="168"
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${patternOffset.x} ${patternOffset.y})`}
          >
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* 1. Folded-corner document */}
              <g transform="translate(26 26) rotate(-13)">
                <path d="M -8 -10 H 3 L 8 -5 V 10 C 8 11.1 7.1 12 6 12 H -6 C -7.1 12 -8 11.1 -8 10 Z" />
                <path d="M 3 -10 V -5 H 8" />
                <path d="M -4 -1 H 4 M -4 3.5 H 4 M -4 8 H 1" />
              </g>

              {/* 2. Medical chart clipboard */}
              <g transform="translate(86 24) rotate(11)">
                <rect x="-8" y="-9" width="16" height="20" rx="2.5" />
                <rect x="-4" y="-11.5" width="8" height="4" rx="1.2" />
                <path d="M -4 -1 L -2 1 L 3 -3.5 M -4 4.5 H 4 M -4 8 H 1.5" />
              </g>

              {/* 3. Paperclip doodle */}
              <g transform="translate(144 28) rotate(-16)">
                <path d="M -2.5 -4 V 5.5 C -2.5 8 0 10 2.2 10 C 4.7 10 6.5 8 6.5 5.5 V -5.5 C 6.5 -9 3.6 -11.5 0 -11.5 C -3.6 -11.5 -6.5 -9 -6.5 -5.5 V 4" />
              </g>

              {/* 4. Fax / Intake tray */}
              <g transform="translate(54 68) rotate(14)">
                <path d="M -5 -10 H 5 V -2 H -5 Z" />
                <rect x="-9" y="-2" width="18" height="10" rx="2" />
                <path d="M -5 8 V 11 H 5 V 8 M 5 1.5 H 6.5" />
              </g>

              {/* 5. Verified / Stamped page */}
              <g transform="translate(120 72) rotate(-11)">
                <rect x="-8" y="-10" width="16" height="20" rx="2.5" />
                <path d="M -4.5 -5 H 4.5 M -4.5 -1 H 1.5" />
                <circle cx="2.5" cy="5" r="3.5" />
                <path d="M 1 5 L 2.1 6.1 L 4.1 3.9" />
              </g>

              {/* 6. File folder tab */}
              <g transform="translate(24 106) rotate(9)">
                <path d="M -10 -6 C -10 -7.1 -9.1 -8 -8 -8 H -3 L -1 -5.5 H 8 C 9.1 -5.5 10 -4.6 10 -3.5 V 6.5 C 10 7.6 9.1 8.5 8 8.5 H -8 C -9.1 8.5 -10 7.6 -10 6.5 Z" />
                <path d="M -6 2 H 2" />
              </g>

              {/* 7. EKG rhythm slip */}
              <g transform="translate(84 114) rotate(-9)">
                <rect x="-10" y="-7.5" width="20" height="15" rx="2.5" />
                <path d="M -7 1 H -3.5 L -2 -4.5 L 0.5 4.5 L 2.2 1 H 7" />
              </g>

              {/* 8. Stacked documents */}
              <g transform="translate(144 116) rotate(13)">
                <path d="M -5 -10 H 6 C 7.1 -10 8 -9.1 8 -8 V 6" />
                <rect x="-8" y="-7" width="13" height="17" rx="2" />
                <path d="M -4.5 -2 H 1.5 M -4.5 2 H 1.5 M -4.5 6 H -0.5" />
              </g>

              {/* 9. Referral envelope */}
              <g transform="translate(50 148) rotate(-8)">
                <rect x="-9.5" y="-6.5" width="19" height="13" rx="2" />
                <path d="M -8.5 -5.5 L 0 1 L 8.5 -5.5" />
              </g>

              {/* 10. Index tag */}
              <g transform="translate(116 148) rotate(10)">
                <path d="M -8 -5 H 3 L 8.5 0 L 3 5 H -8 C -9.1 5 -10 4.1 -10 3 V -3 C -10 -4.1 -9.1 -5 -8 -5 Z" />
                <circle cx="3.2" cy="0" r="1.2" />
              </g>

              {/* Subtle micro-accents */}
              <circle cx="56" cy="28" r="1" />
              <path d="M 18 64 H 21.5 M 19.75 62.25 V 65.75" />
              <path d="M 85 66 H 88.5 M 86.75 64.25 V 67.75" />
              <circle cx="150" cy="72" r="1" />
              <circle cx="18" cy="148" r="1" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>

      {/* Grounded bottom color baseline accent */}
      <div
        className="absolute inset-x-0 bottom-0 h-0.5 pointer-events-none"
        style={{ backgroundColor: withAlpha(clr, 0.6) }}
        aria-hidden
      />

      {/* Header: Dot, Category Label, Hotkey, and Remove */}
      <div className="relative z-10 flex items-center justify-between gap-2 pb-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className="size-2 rounded-full shrink-0 shadow-2xs"
            style={{ backgroundColor: clr }}
            aria-hidden
          />
          <h4
            className="text-xs sm:text-sm font-semibold truncate text-foreground/90 tracking-tight leading-snug"
            title={cat.label}
          >
            {cat.label}
          </h4>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onRemove}
            className="size-6 rounded-md grid place-items-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors touch-manipulation opacity-40 group-hover:opacity-100 cursor-pointer"
            title={`Remove ${cat.label}`}
            aria-label={`Remove ${cat.label}`}
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Main Tap Counter Area: Monospace tabular numbers matching Console/Report */}
      <button
        type="button"
        onClick={tap}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "+" || e.key === "=") {
            e.preventDefault();
            tap();
          } else if (e.key === "ArrowDown" || e.key === "-") {
            e.preventDefault();
            triggerDecrement();
          }
        }}
        className="relative z-10 flex-1 flex flex-col items-center justify-center py-7 sm:py-9 mx-1 rounded-xl active:scale-[0.97] transition-transform duration-100 touch-manipulation select-none outline-none cursor-pointer"
        title="Tap to count (+1)"
        aria-label={`${cat.label}: ${count}. Tap to add one.`}
      >
        {/* Floating +1 / -1 particles */}
        <div className="absolute inset-x-0 top-3 bottom-0 pointer-events-none flex items-center justify-center overflow-visible z-20">
          {floatingBadges.map((badge) => (
            <span
              key={badge.id}
              className={cn(
                "float-badge absolute text-sm sm:text-base font-bold font-mono px-2 py-0.5 rounded-full border shadow-sm",
                badge.text.startsWith("+")
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                  : "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-400"
              )}
            >
              {badge.text}
            </span>
          ))}
        </div>

        <span
          key={`${count}-${direction}`}
          className={cn(
            "text-5xl sm:text-6xl font-bold font-mono tabular-nums leading-none select-none tracking-tight transition-colors",
            direction === "up" && "counter-pop-up",
            direction === "down" && "counter-pop-down",
            direction === null && "counter-pop"
          )}
          style={{
            color: count > 0 ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground) / 0.35)",
          }}
        >
          {String(count).padStart(2, "0")}
        </span>

        {/* Unit label */}
        <span
          className={cn(
            "mt-2.5 text-[10px] font-mono font-bold uppercase tracking-wider leading-none",
            count > 0 ? "text-muted-foreground/75" : "text-muted-foreground/45"
          )}
        >
          DOCS
        </span>
      </button>

      {/* Tactile Bottom Stepper Controls matching Console/Report buttons */}
      <div className="relative flex items-center gap-2 pt-1 z-10">
        <button
          type="button"
          onPointerDown={dec.start}
          onPointerUp={dec.stop}
          onPointerLeave={dec.stop}
          onPointerCancel={dec.stop}
          disabled={count === 0}
          className={cn(
            "flex-1 flex items-center justify-center gap-1 h-9 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted text-xs font-mono font-medium text-muted-foreground hover:text-foreground active:scale-[0.96] transition-all duration-100 touch-manipulation cursor-pointer shadow-2xs disabled:opacity-25 disabled:cursor-not-allowed",
          )}
          aria-label={`Decrease ${cat.label}`}
          title="Hold to decrease rapidly"
        >
          <Minus className="size-3.5" />
          <span className="text-[11px] hidden xs:inline">1</span>
        </button>

        <button
          type="button"
          onPointerDown={inc.start}
          onPointerUp={inc.stop}
          onPointerLeave={inc.stop}
          onPointerCancel={inc.stop}
          className="flex-[1.4] flex items-center justify-center gap-1.5 h-9 rounded-xl border border-emerald-600/25 dark:border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-mono font-semibold text-xs active:scale-[0.96] transition-all duration-100 touch-manipulation cursor-pointer shadow-2xs"
          aria-label={`Increase ${cat.label}`}
          title="Hold to count rapidly"
        >
          <Plus className="size-3.5" />
          <span>Count</span>
        </button>
      </div>
    </div>
  );
}
