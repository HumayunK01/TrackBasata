import { useCallback, useEffect, useRef, useState } from "react";
import { colorForKey, withAlpha } from "@/lib/cat-colors";
import type { Category } from "@/hooks/useCategories";
import { Minus, Plus, X } from "@/components/ui/icons";
import { playTapFeedback } from "@/lib/audio-feedback";

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
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  hotkeyIndex?: number;
}

export function CounterCard({
  cat,
  count,
  maxCount,
  onIncrement,
  onDecrement,
  onRemove,
  hotkeyIndex,
}: CounterCardProps) {
  const clr = colorForKey(cat.key);
  const [bump, setBump] = useState(0);
  const fill = maxCount > 0 ? Math.min(100, (count / maxCount) * 100) : 0;
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

  // Pulse ring animation: compositor-driven Web Animations API (no synchronous offsetHeight reflow)
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
      className="group rounded-2xl border flex flex-col relative overflow-hidden focus-within:ring-2 focus-within:ring-primary/40 active:scale-[0.97] transition-[transform,box-shadow,border-color] duration-150 ease-out shadow-2xs hover:shadow-md"
      style={{
        borderColor: withAlpha(clr, 0.22),
        background: `radial-gradient(ellipse at top, ${withAlpha(clr, 0.08)} 0%, ${withAlpha(clr, 0.02)} 100%)`,
      }}
    >
      {/* Pulse ring */}
      <div
        ref={ringRef}
        className="pulse-ring absolute inset-0 pointer-events-none rounded-2xl opacity-0"
        style={{ backgroundColor: clr }}
      />

      {/* Progress fill from bottom */}
      <div
        className="absolute inset-x-0 bottom-0 transition-[height] duration-500 ease-out pointer-events-none"
        style={{ height: `${fill}%`, backgroundColor: withAlpha(clr, 0.08) }}
        aria-hidden
      />

      {/* Accent baseline line */}
      <div
        className="absolute inset-x-0 bottom-0 h-0.5 pointer-events-none"
        style={{ backgroundColor: withAlpha(clr, 0.35) }}
        aria-hidden
      />

      {/* Card Header */}
      <div className="relative flex items-center justify-between gap-2 p-3.5 pb-1 z-10">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className="size-2 rounded-full shrink-0 shadow-2xs"
            style={{ backgroundColor: clr }}
            aria-hidden
          />
          <h4
            className="text-xs font-semibold truncate text-foreground"
            title={cat.label}
          >
            {cat.label}
          </h4>
          <span
            className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-md uppercase tracking-wider shrink-0 border"
            style={{
              color: clr,
              backgroundColor: withAlpha(clr, 0.12),
              borderColor: withAlpha(clr, 0.25),
            }}
          >
            {cat.short}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {hotkeyIndex !== undefined && (
            <kbd
              className="hidden sm:inline-block text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md border border-border/50 bg-background/70 text-muted-foreground shadow-2xs"
              title={`Press ${hotkeyIndex} key to count`}
            >
              {hotkeyIndex}
            </kbd>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="size-6 rounded-md grid place-items-center text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors touch-manipulation opacity-50 group-hover:opacity-100 cursor-pointer"
            title={`Remove ${cat.label}`}
            aria-label={`Remove ${cat.label}`}
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Big Tap Area */}
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
        className="relative flex-1 flex items-center justify-center py-6 sm:py-8 mx-2 rounded-xl active:scale-95 transition-transform duration-100 touch-manipulation select-none outline-none cursor-pointer overflow-hidden"
        title="Tap to count (or press ↑ / +)"
        aria-label={`${cat.label}: ${count}. Tap to add one.`}
      >
        {/* Category watermark */}
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center font-mono font-extrabold text-[4.5rem] sm:text-[6rem] leading-none select-none pointer-events-none"
          style={{ color: withAlpha(clr, 0.065) }}
        >
          {cat.short}
        </span>
        <span
          key={bump}
          className="counter-pop relative text-5xl sm:text-6xl font-bold font-mono tabular-nums leading-none select-none tracking-tight"
          style={{
            color: count > 0 ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground) / 0.35)",
          }}
        >
          {count}
        </span>
      </button>

      {/* +/- Hold Controls */}
      <div className="relative flex items-center gap-2 p-2.5 pt-1 z-10">
        <button
          type="button"
          onPointerDown={dec.start}
          onPointerUp={dec.stop}
          onPointerLeave={dec.stop}
          onPointerCancel={dec.stop}
          disabled={count === 0}
          className="flex-1 flex items-center justify-center h-10 rounded-xl border border-border/50 bg-background/60 hover:bg-muted active:scale-[0.96] transition-transform duration-100 ease-out disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation cursor-pointer shadow-2xs"
          aria-label={`Decrease ${cat.label}`}
        >
          <Minus className="size-4 text-muted-foreground" />
        </button>
        <button
          type="button"
          onPointerDown={inc.start}
          onPointerUp={inc.stop}
          onPointerLeave={inc.stop}
          onPointerCancel={inc.stop}
          className="flex-1 flex items-center justify-center h-10 rounded-xl border active:scale-[0.96] transition-transform duration-100 ease-out touch-manipulation cursor-pointer shadow-2xs"
          style={{
            backgroundColor: withAlpha(clr, 0.12),
            borderColor: withAlpha(clr, 0.3),
            color: clr,
          }}
          aria-label={`Increase ${cat.label}`}
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
