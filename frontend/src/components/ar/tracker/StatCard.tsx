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
      text: "text-emerald-600 dark:text-emerald-400",
      glow: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      activeGlow: "bg-emerald-500/20",
    },
    rose: {
      text: "text-rose-600 dark:text-rose-400",
      glow: "bg-rose-500/10",
      border: "border-rose-500/20",
      activeGlow: "bg-rose-500/20",
    },
    sky: {
      text: "text-sky-600 dark:text-sky-400",
      glow: "bg-sky-500/10",
      border: "border-sky-500/20",
      activeGlow: "bg-sky-500/20",
    },
    slate: {
      text: "text-foreground",
      glow: "bg-muted/40",
      border: "border-border/60",
      activeGlow: "bg-muted/60",
    },
    neutral: {
      text: "text-foreground",
      glow: "bg-primary/10",
      border: "border-primary/25",
      activeGlow: "bg-primary/20",
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
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative rounded-2xl border bg-card/60 backdrop-blur-md p-4 sm:p-5 shadow-2xs overflow-hidden select-none",
        toneConfig.border,
        onClick && "cursor-pointer hover:shadow-md",
        active && "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary/50 bg-card/90 shadow-md",
        "transition-[border-color,box-shadow,background-color] duration-200 ease-out",
      )}
    >
      {/* Ambient background glow with dynamic expansion when active */}
      <motion.div
        animate={{
          opacity: active ? 0.9 : 0.5,
          scale: active ? 1.2 : 1,
        }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={cn(
          "absolute -top-12 -right-12 size-28 rounded-full blur-2xl pointer-events-none",
          active ? toneConfig.activeGlow : toneConfig.glow,
        )}
      />

      <p className="font-mono text-2xs uppercase tracking-[0.2em] text-muted-foreground mb-1.5 truncate">
        {label}
      </p>

      {loading ? (
        <Skeleton width={56} height={32} borderRadius={8} />
      ) : (
        <p className={cn("text-2xl sm:text-3xl font-black font-mono tracking-tight tabular-nums", toneConfig.text)}>
          {display}
        </p>
      )}
    </motion.div>
  );
}

