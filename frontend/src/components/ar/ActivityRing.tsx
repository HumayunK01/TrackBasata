import { cn } from "@/lib/utils";

interface ActivityRingProps {
  value: number;
  target: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
  children?: React.ReactNode;
}

export function ActivityRing({
  value,
  target,
  size = 40,
  strokeWidth = 4.5,
  color = "hsl(var(--primary))",
  className,
  children,
}: ActivityRingProps) {
  const safeTarget = target <= 0 ? 1 : target;
  const pct = Math.min(100, Math.max(0, (value / safeTarget) * 100));
  
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div 
      className={cn("relative flex items-center justify-center shrink-0", className)} 
      style={{ width: size, height: size }}
    >
      <svg 
        width={size} 
        height={size} 
        className="rotate-[-90deg] transform"
      >
        {/* Track Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/25"
        />
        {/* Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="motion-reduce:transition-none transition-[stroke-dashoffset] duration-700 ease-out"
          style={{ filter: "drop-shadow(0 0 4px hsl(var(--primary) / 0.2))" }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
          {children}
        </div>
      )}
    </div>
  );
}
