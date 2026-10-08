import { useMemo } from "react";
import { FileText, CalendarCheck, ChevronRight, TrendingUp } from "@/components/ui/icons";
import { isoDate, totalForLog, type DailyLog } from "@/types/log";
import { FigHeader } from "@/components/ar/industrial";

interface Props {
  logs: DailyLog[];
  isLoading: boolean;
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string }) {
  return (
    <div className="bg-card border border-border/80 rounded-lg p-3 sm:p-4 flex items-center gap-3">
      <div className="size-8 sm:size-9 rounded-lg border border-border/60 grid place-items-center text-primary/60 bg-primary/[0.04] shrink-0">
        <Icon className="size-4 sm:size-[18px]" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-foreground uppercase tracking-wider truncate">{label}</p>
        <p className="text-lg sm:text-xl font-bold tabular-nums tracking-tight">{value}</p>
      </div>
    </div>
  );
}

export function ActivitySection({ logs, isLoading }: Props) {
  const today = isoDate();
  const stats = useMemo(() => {
    const working = logs.filter((l) => !l.is_off_day);
    const daysWorked = working.length;
    const totalDocs = working.reduce((s, l) => s + totalForLog(l), 0);
    const avg = working.length > 0 ? Math.round(totalDocs / working.length) : 0;
    const todayLog = logs.find((l) => l.log_date === today);
    const todayCount = todayLog && !todayLog.is_off_day ? totalForLog(todayLog) : 0;
    return { daysWorked, totalDocs, avg, todayCount };
  }, [logs, today]);

  return (
    <div className="space-y-4">
      <FigHeader title="Activity" />

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border/80 rounded-lg p-3 space-y-2 animate-pulse">
              <div className="h-3 w-16 bg-foreground/10 rounded" />
              <div className="h-6 w-10 bg-foreground/10 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <StatCard icon={CalendarCheck} label="Days Worked" value={stats.daysWorked} />
          <StatCard icon={FileText} label="Total Docs" value={stats.totalDocs} />
          <StatCard icon={TrendingUp} label="Avg / Day" value={stats.avg} />
          <StatCard icon={ChevronRight} label="Today" value={stats.todayCount} />
        </div>
      )}
    </div>
  );
}
