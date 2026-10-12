import { cn } from "@/lib/utils";

// ── Shared SVG Connector Components for System Flowcharts ─────────────
export function VerticalArrow({ height = 22, className }: { height?: number; className?: string }) {
  return (
    <div className={cn("flex justify-center items-center w-full shrink-0 select-none", className)}>
      <svg
        width="16"
        height={height}
        viewBox={`0 0 16 ${height}`}
        className="text-slate-400 block overflow-visible"
      >
        <line
          x1="8"
          y1="0"
          x2="8"
          y2={height - 6}
          stroke="currentColor"
          strokeWidth="2"
        />
        <polygon
          points={`4,${height - 6} 8,${height} 12,${height - 6}`}
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

export function BranchSplitter2({
  leftLabel,
  rightLabel,
  leftColor = "emerald",
  rightColor = "amber",
  ratio = "50-50",
}: {
  leftLabel: string;
  rightLabel: string;
  leftColor?: "emerald" | "purple" | "red";
  rightColor?: "amber" | "red" | "emerald";
  ratio?: "50-50" | "33-67" | "67-33";
}) {
  const is3367 = ratio === "33-67";
  const is6733 = ratio === "67-33";
  const leftX = is3367 ? 16.67 : is6733 ? 33.33 : 25;
  const rightX = is3367 ? 66.67 : is6733 ? 83.33 : 75;

  return (
    <div className="w-full select-none">
      {/* SVG Fork Bar (visible on multi-column screens) */}
      <div className={cn("w-full", is6733 ? "hidden sm:block" : "hidden md:block")}>
        <svg
          className="w-full h-5 text-slate-400 block overflow-visible"
          viewBox="0 0 100 20"
          preserveAspectRatio="none"
        >
          {/* Top stem from decision node */}
          <line
            x1="50"
            y1="0"
            x2="50"
            y2="10"
            stroke="currentColor"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          {/* Horizontal crossbar */}
          <line
            x1={leftX}
            y1="10"
            x2={rightX}
            y2="10"
            stroke="currentColor"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          {/* Left drop line */}
          <line
            x1={leftX}
            y1="10"
            x2={leftX}
            y2="20"
            stroke="currentColor"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          {/* Right drop line */}
          <line
            x1={rightX}
            y1="10"
            x2={rightX}
            y2="20"
            stroke="currentColor"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      {/* Mobile stem */}
      <div className={cn("flex justify-center", is6733 ? "sm:hidden" : "md:hidden")}>
        <VerticalArrow height={18} />
      </div>

      {/* Branch pill labels and directional down arrows to destination cards */}
      <div
        className={cn(
          "w-full",
          is3367 && "grid grid-cols-1 md:grid-cols-12 gap-4",
          is6733 && "grid grid-cols-1 sm:grid-cols-12 gap-3",
          !is3367 && !is6733 && "grid grid-cols-1 md:grid-cols-2 gap-4",
        )}
      >
        <div className={cn("flex flex-col items-center", is3367 && "md:col-span-4", is6733 && "sm:col-span-8")}>
          <span
            className={cn(
              "px-3 py-1 rounded-full text-2xs font-mono font-bold uppercase shadow-2xs border bg-white leading-tight",
              leftColor === "emerald" && "bg-emerald-50 text-emerald-700 border-emerald-300",
              leftColor === "purple" && "bg-purple-50 text-purple-700 border-purple-300",
              leftColor === "red" && "bg-red-50 text-red-700 border-red-300",
            )}
          >
            {leftLabel}
          </span>
          <VerticalArrow height={18} />
        </div>

        <div className={cn("flex flex-col items-center", is3367 && "md:col-span-8", is6733 && "sm:col-span-4")}>
          <span
            className={cn(
              "px-3 py-1 rounded-full text-2xs font-mono font-bold uppercase shadow-2xs border bg-white leading-tight",
              rightColor === "amber" && "bg-amber-50 text-amber-800 border-amber-300",
              rightColor === "red" && "bg-red-50 text-red-700 border-red-300",
              rightColor === "emerald" && "bg-emerald-50 text-emerald-700 border-emerald-300",
            )}
          >
            {rightLabel}
          </span>
          <VerticalArrow height={18} />
        </div>
      </div>
    </div>
  );
}
