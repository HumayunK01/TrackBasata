import Skeleton from "react-loading-skeleton";
import { cn } from "@/lib/utils";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";

export function StatCard({
  label,
  value,
  tone,
  loading,
}: {
  label: string;
  value: number;
  tone: "emerald" | "rose" | "sky" | "slate" | "neutral";
  loading: boolean;
}) {
  const toneConfig = {
    emerald: {
      text: "text-emerald-600 dark:text-emerald-400",
      glow: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    rose: {
      text: "text-rose-600 dark:text-rose-400",
      glow: "bg-rose-500/10",
      border: "border-rose-500/20",
    },
    sky: {
      text: "text-sky-600 dark:text-sky-400",
      glow: "bg-sky-500/10",
      border: "border-sky-500/20",
    },
    slate: {
      text: "text-foreground",
      glow: "bg-muted/40",
      border: "border-border/60",
    },
    neutral: {
      text: "text-foreground",
      glow: "bg-primary/10",
      border: "border-primary/25",
    },
  }[tone];

  const display = useAnimatedNumber(value);

  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-card/60 backdrop-blur-md p-4 sm:p-5 shadow-2xs overflow-hidden transition-all duration-200 hover:shadow-md",
        toneConfig.border,
      )}
    >
      {/* Ambient background glow */}
      <div
        className={cn(
          "absolute -top-12 -right-12 size-28 rounded-full blur-2xl pointer-events-none opacity-60",
          toneConfig.glow,
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
    </div>
  );
}

