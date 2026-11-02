import { useCallback, useEffect, useRef, useState } from "react";
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

export function CounterCard({
  cat,
  count,
  maxCount,
  total = 0,
  onIncrement,
  onDecrement,
  onRemove,
  hotkeyIndex,
}: CounterCardProps) {
  const clr = colorForKey(cat.key);
  const [bump, setBump] = useState(0);
  const fill = maxCount > 0 ? Math.min(100, (count / maxCount) * 100) : 0;
  const share = total > 0 ? Math.round((count / total) * 100) : 0;
  const cardRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  const inc = useHoldRepeat(() => {
    onIncrement();
    playTapFeedback();
  });
  const dec = useHoldRepeat(() => {
    onDecrement();
    playTapFeedback();
  });

  const tap = () => {
    onIncrement();
    playTapFeedback();
    setBump((n) => n + 1);
  };

  // Pulse ring animation: compositor-driven Web Animations API
  useEffect(() => {
    if (count === 0 || !ringRef.current) return;
    ringRef.current.animate(
      [
        { transform: "scale(1)", opacity: 0.25 },
        { transform: "scale(2)", opacity: 0 },
      ],
      { duration: 350, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
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

      {/* Grounded bottom color baseline accent */}
      <div
        className="absolute inset-x-0 bottom-0 h-0.5 pointer-events-none"
        style={{ backgroundColor: withAlpha(clr, 0.6) }}
        aria-hidden
      />

      {/* Header: Dot, Category Label, Code Badge, Hotkey, and Remove */}
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
          <span className="font-mono text-[10px] font-semibold tabular-nums text-muted-foreground bg-muted/50 border border-border/50 px-1.5 py-0.5 rounded-md shrink-0">
            {cat.short}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {hotkeyIndex !== undefined && (
            <kbd
              className="font-mono text-[10px] font-semibold tabular-nums text-muted-foreground bg-muted/50 border border-border/50 px-1.5 py-0.5 rounded-md min-w-5 text-center shrink-0"
              title={`Press ${hotkeyIndex} key to count (+1), Shift+${hotkeyIndex} to (-1)`}
            >
              {hotkeyIndex}
            </kbd>
          )}
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
            onDecrement();
          }
        }}
        className="relative flex-1 flex flex-col items-center justify-center py-7 sm:py-9 mx-1 rounded-xl active:scale-[0.98] transition-transform duration-100 touch-manipulation select-none outline-none cursor-pointer"
        title="Tap to count (+1)"
        aria-label={`${cat.label}: ${count}. Tap to add one.`}
      >
        <span
          key={bump}
          className="counter-pop text-5xl sm:text-6xl font-bold font-mono tabular-nums leading-none select-none tracking-tight transition-colors"
          style={{
            color: count > 0 ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground) / 0.35)",
          }}
        >
          {count}
        </span>

        {/* Share of total volume */}
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground leading-none">
          {count > 0 ? (
            <>
              <span>{count} {count === 1 ? "doc" : "docs"}</span>
              {total > 0 && (
                <>
                  <span className="text-border">·</span>
                  <span className="text-emerald-500 dark:text-emerald-400 font-semibold">{share}%</span>
                </>
              )}
            </>
          ) : (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">
              zero docs
            </span>
          )}
        </div>
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
          className="flex-[1.4] flex items-center justify-center gap-1.5 h-9 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 font-mono font-semibold text-xs active:scale-[0.96] transition-all duration-100 touch-manipulation cursor-pointer shadow-2xs"
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
