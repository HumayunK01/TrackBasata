import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DayEntrySheet } from "@/components/ar/DayEntrySheet";
import { DaysTable } from "@/components/ar/DaysTable";
import { useDailyLogs } from "@/hooks/useDailyLogs";
import { useProfile } from "@/hooks/useProfile";
import { CalendarDays, Plus } from "@/components/ui/icons";
import { EmptyState } from "@/components/ar/industrial";
import Skeleton from "react-loading-skeleton";
import type { DailyLog } from "@/types/log";

const DailyLogPage = () => {
  const { data: logs = [], isLoading } = useDailyLogs();
  const { data: profile } = useProfile();
  const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || undefined;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DailyLog | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setEditing(null);
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const existingDates = useMemo(() => logs.map((l) => l.log_date), [logs]);

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (log: DailyLog) => {
    setEditing(log);
    setOpen(true);
  };

  return (
    <>
      <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6">
        <div className="w-full space-y-4">
          {isLoading ? (
            <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3 shadow-xs">
              <Skeleton height={44} className="rounded-xl" />
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} height={44} className="rounded-md" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="bg-card border border-border/60 rounded-xl p-12 text-center shadow-xs">
              <EmptyState
                icon={CalendarDays}
                title="No Logs Recorded Yet"
                hint="Start logging your daily document counts to build your tracking history."
                action={
                  <Button size="sm" onClick={openNew} className="h-9 gap-1.5 cursor-pointer">
                    <Plus className="size-4" /> Log your first day
                  </Button>
                }
              />
            </div>
          ) : (
            <DaysTable
              logs={logs}
              onEdit={openEdit}
              onNew={openNew}
              userName={userName}
            />
          )}
        </div>
      </main>

      <DayEntrySheet
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        existingDates={existingDates}
      />
    </>
  );
};

export default DailyLogPage;
