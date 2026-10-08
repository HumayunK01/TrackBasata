import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FigHeader({ title, sub, className }: { title: string; sub?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 mb-3", className)}>
      <h2 className="font-heading text-sm font-semibold text-foreground">{title}</h2>
      {sub && <span className="text-[11px] text-muted-foreground font-medium">{sub}</span>}
      <span className="flex-1 h-px bg-border/50" />
    </div>
  );
}

export function Panel({ tag, className, children, ticks = true }: { tag: string; className?: string; children: ReactNode; ticks?: boolean }) {
  return (
    <section className={cn("relative bg-card border border-border/80 rounded-lg", className)}>
      <header className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <span className="font-mono text-[11px] font-medium tracking-wide text-foreground uppercase">{tag}</span>
        {ticks && <span className="size-1.5 rounded-full bg-primary/70" title="active" />}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center gap-4 py-12 sm:py-14", className)}>
      <div className="size-12 rounded-xl border border-border/60 grid place-items-center text-primary/50 bg-primary/[0.03]">
        <Icon className="size-6" />
      </div>
      <div className="space-y-1.5">
        <p className="font-heading text-sm font-semibold text-foreground">{title}</p>
        {hint &&       <p className="text-xs text-foreground max-w-xs">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono tabular-nums text-xs text-foreground">
      {now.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Chicago" })} (America/Chicago)
    </span>
  );
}

function MiniSparkline({
  data,
  color,
  width = 64,
  height = 28,
}: {
  data?: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const n = data.length;

  const points = data.map((v, i) => ({
    x: (i / (n - 1)) * width,
    y: height - ((v - min) / range) * (height - 6) - 3,
  }));

  const d = points.reduce((acc, p, i, arr) => {
    if (i === 0) return `M ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    const prev = arr[i - 1];
    const cx1 = (prev.x + (p.x - prev.x) / 2).toFixed(1);
    const cy1 = prev.y.toFixed(1);
    const cx2 = (prev.x + (p.x - prev.x) / 2).toFixed(1);
    const cy2 = p.y.toFixed(1);
    return `${acc} C ${cx1},${cy1} ${cx2},${cy2} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }, "");

  const areaD = `${d} L ${width},${height} L 0,${height} Z`;
  const gradId = `spark-${Math.abs(data.reduce((s, v, i) => s + (v + 1) * (i + 1), 0))}-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CategoryStatCard({
  label,
  value,
  color,
  share,
  sparkline,
  todayCount,
}: {
  label: string;
  value: number;
  color: string;
  share?: number;
  sparkline?: number[];
  todayCount?: number;
}) {
  const patternId = `cat-grid-${label.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-4.5 shadow-sm transition-all duration-200 hover:border-border/80 hover:shadow-md hover:-translate-y-0.5">
      {/* Ambient corner glow matching category color */}
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-xl transition-opacity duration-300 group-hover:opacity-40"
        style={{ background: color, opacity: 0.16 }}
      />

      {/* Subtle dot matrix matching ProgressMetricCard */}
      <div
        className="pointer-events-none absolute inset-0 text-foreground/[0.04]"
        style={{
          WebkitMaskImage: "linear-gradient(to right, transparent, black 70%)",
          maskImage: "linear-gradient(to right, transparent, black 70%)",
        }}
      >
        <svg className="h-full w-full" aria-hidden>
          <defs>
            <pattern id={patternId} width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${patternId})`} />
        </svg>
      </div>

      {/* Header: Label and share badge */}
      <div className="relative z-10 flex items-center justify-between gap-2 min-w-0">
        <p className="text-xs font-semibold text-foreground/90 truncate tracking-tight">{label}</p>
        {share !== undefined && (
          <span className="font-mono text-[10px] font-semibold text-muted-foreground/80 bg-muted/50 border border-border/50 px-1.5 py-0.5 rounded-md shrink-0">
            {share.toFixed(1)}%
          </span>
        )}
      </div>

      {/* Main stats + sparkline */}
      <div className="relative z-10 mt-3 flex items-end justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground dark:text-white leading-none">
            {value.toLocaleString()}
          </span>
          <span className="mt-1.5 text-[11px] font-mono leading-none">
            {todayCount !== undefined && todayCount > 0 ? (
              <span className="text-emerald-400 font-semibold">+{todayCount} today</span>
            ) : (
              <span className="text-muted-foreground/60 text-[10px] uppercase tracking-wider font-sans">
                docs
              </span>
            )}
          </span>
        </div>

        {sparkline && sparkline.length >= 2 && (
          <div className="pb-0.5">
            <MiniSparkline data={sparkline} color={color} width={64} height={28} />
          </div>
        )}
      </div>
    </div>
  );
}
