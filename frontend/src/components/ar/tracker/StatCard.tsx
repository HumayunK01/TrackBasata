import { motion } from "motion/react";
import Skeleton from "react-loading-skeleton";
import { cn } from "@/lib/utils";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";

export function StatCard({
  label,
  value,
  tone,
  loading,
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone: "emerald" | "rose" | "sky" | "slate" | "neutral";
  loading: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  const toneConfig = {
    emerald: {
      text: "text-emerald-500 dark:text-emerald-400",
      dot: "bg-emerald-500",
      activeRing: "ring-1.5 ring-emerald-500 border-emerald-500/40 bg-card",
    },
    rose: {
      text: "text-rose-500 dark:text-rose-400",
      dot: "bg-rose-500",
      activeRing: "ring-1.5 ring-rose-500 border-rose-500/40 bg-card",
    },
    sky: {
      text: "text-sky-500 dark:text-sky-400",
      dot: "bg-sky-400",
      activeRing: "ring-1.5 ring-sky-500 border-sky-500/40 bg-card",
    },
    slate: {
      text: "text-foreground",
      dot: "bg-muted-foreground",
      activeRing: "ring-1.5 ring-border border-foreground/30 bg-card",
    },
    neutral: {
      text: "text-foreground",
      dot: "bg-emerald-500",
      activeRing: "ring-1.5 ring-emerald-500 border-emerald-500/40 bg-card",
    },
  }[tone];

  const display = useAnimatedNumber(value);

  return (
    <motion.div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      whileHover={onClick ? { y: -2 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl border border-border/65 bg-card/80 p-4 shadow-2xs transition-colors duration-150 select-none",
        onClick && "cursor-pointer hover:border-border hover:shadow-xs",
        active && toneConfig.activeRing,
      )}
    >
      {/* Top Header: Label & Tone indicator dot */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-xs font-medium text-muted-foreground truncate" title={label}>
          {label}
        </span>
        <span
          className={cn("size-2 rounded-full shrink-0 shadow-2xs", toneConfig.dot)}
          aria-hidden
        />
      </div>

      {/* Main Count */}
      <div className="mt-2.5 flex items-baseline gap-2">
        {loading ? (
          <Skeleton width={56} height={28} borderRadius={8} />
        ) : (
          <>
            <span
              className={cn(
                "text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight leading-none",
                toneConfig.text,
              )}
            >
              {display}
            </span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/70">
              {value === 1 ? "patient" : "patients"}
            </span>
          </>
        )}
      </div>

      {/* Footer divider: Filter state indicator */}
      <div className="mt-3 pt-2.5 border-t border-border/45 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
        <span>{active ? "Active filter" : "Click to filter"}</span>
        {active && (
          <span className="font-semibold text-emerald-500 dark:text-emerald-400">
            Selected
          </span>
        )}
      </div>
    </motion.div>
  );
}
