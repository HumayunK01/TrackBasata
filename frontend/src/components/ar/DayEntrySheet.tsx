import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  isoDate,
  isWeekend,
  LEAVE_TYPES,
  parseLeaveNotes,
  getDatesInRange,
  addDaysISO,
  formatTableDate,
  type DailyLog,
  type DailyLogInsert,
  type GroupedDailyLog,
  type LeaveTypeId,
} from "@/types/log";
import { useUpsertLog, useUpsertLeaveRange, useDeleteLog } from "@/hooks/useDailyLogs";
import { useCategories } from "@/hooks/useCategories";
import { canonEntry } from "@/lib/log-utils";
import {
  Minus,
  Plus,
  CalendarCheck,
  CalendarRange,
  BedDouble,
  CalendarIcon,
  TriangleAlert,
  PenLine,
  ArrowRight,
  Check,
} from "@/components/ui/icons";
import { format, parseISO } from "date-fns";
import { colorForKey, withAlpha } from "@/lib/cat-colors";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: DailyLog | GroupedDailyLog | null;
  existingDates: string[];
  defaultLeaveMode?: boolean;
  suggestedDate?: string;
}

const emptyDraft = (date = isoDate()): DailyLogInsert => ({
  log_date: date,
  counts: {},
  is_off_day: isWeekend(date),
  notes: null,
});

function Stepper({
  label,
  shortLabel,
  value,
  color,
  onChange,
}: {
  label: string;
  shortLabel: string;
  value: number;
  color: string;
  onChange: (v: number) => void;
}) {
  const dec = () => onChange(Math.max(0, value - 1));
  const inc = () => onChange(value + 1);

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted/15 transition-colors border-b border-border/30 last:border-0">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <span
          className="size-2 rounded-full shrink-0 shadow-2xs"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs sm:text-sm font-medium text-foreground truncate">{label}</span>
        <span
          className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-md uppercase tracking-wider shrink-0 border"
          style={{
            color,
            backgroundColor: withAlpha(color, 0.12),
            borderColor: withAlpha(color, 0.25),
          }}
        >
          {shortLabel}
        </span>
      </div>

      <div
        className={cn(
          "flex items-center rounded-lg border p-0.5 transition-all shadow-2xs shrink-0",
          value > 0
            ? "bg-primary/[0.05] border-primary/35"
            : "bg-muted/30 border-border/60 hover:border-border",
        )}
      >
        <button
          type="button"
          onClick={dec}
          disabled={value === 0}
          aria-label={`Decrease ${label}`}
          className="size-7 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-background transition-all active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent cursor-pointer"
        >
          <Minus className="size-3" />
        </button>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          aria-label={label}
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              inc();
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              dec();
            }
          }}
          className="w-11 h-7 text-center text-xs font-bold tabular-nums bg-transparent border-0 outline-none text-foreground focus:ring-0 select-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          style={{ color: value > 0 ? color : undefined }}
        />
        <button
          type="button"
          onClick={inc}
          aria-label={`Increase ${label}`}
          className="size-7 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-background transition-all active:scale-90 cursor-pointer"
        >
          <Plus className="size-3" />
        </button>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider font-heading flex items-center gap-1.5">
      {children}
    </p>
  );
}

export function DayEntrySheet({
  open,
  onOpenChange,
  editing,
  existingDates,
  defaultLeaveMode = false,
  suggestedDate,
}: Props) {
  const [draft, setDraft] = useState<DailyLogInsert>(() => emptyDraft());
  const [endDate, setEndDate] = useState<string>(() => isoDate());
  const [leaveType, setLeaveType] = useState<LeaveTypeId>("Planned Leave");
  const [baseline, setBaseline] = useState("");
  const [calOpen, setCalOpen] = useState(false);
  const [endCalOpen, setEndCalOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const upsert = useUpsertLog();
  const upsertLeaveRange = useUpsertLeaveRange();
  const deleteLog = useDeleteLog();
  const { data: categories = [] } = useCategories();

  const isPending = upsert.isPending || upsertLeaveRange.isPending || deleteLog.isPending;

  const previousDates =
    editing && "dates" in editing && Array.isArray(editing.dates)
      ? editing.dates
      : editing
      ? [editing.log_date]
      : [];

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const startIso = "start_date" in editing ? editing.start_date : editing.log_date;
      const endIso = "end_date" in editing ? editing.end_date : editing.log_date;
      const parsed = editing.is_off_day
        ? parseLeaveNotes(editing.notes, startIso)
        : { leaveType: "Planned Leave" as LeaveTypeId, cleanNotes: editing.notes ?? "" };

      const next: DailyLogInsert = {
        log_date: startIso,
        counts: { ...editing.counts },
        is_off_day: editing.is_off_day,
        notes: editing.is_off_day ? parsed.cleanNotes : editing.notes,
      };
      setDraft(next);
      setEndDate(endIso);
      setLeaveType(parsed.leaveType);
      setBaseline(`${canonEntry(next)}|${endIso}|${parsed.leaveType}`);
    } else {
      const initialDate = suggestedDate ?? isoDate();
      const isLeave = defaultLeaveMode || isWeekend(initialDate);
      const initialLeaveType: LeaveTypeId = defaultLeaveMode
        ? "Planned Leave"
        : isWeekend(initialDate)
        ? "Weekend Off"
        : "Planned Leave";
      const next: DailyLogInsert = {
        log_date: initialDate,
        counts: {},
        is_off_day: isLeave,
        notes: null,
      };
      setDraft(next);
      setEndDate(initialDate);
      setLeaveType(initialLeaveType);
      setBaseline(`${canonEntry(next)}|${initialDate}|${initialLeaveType}`);
    }
  }, [open, editing, defaultLeaveMode, suggestedDate]);

  const currentFingerprint = `${canonEntry(draft)}|${draft.is_off_day ? endDate : draft.log_date}|${
    draft.is_off_day ? leaveType : ""
  }`;
  const dirty = currentFingerprint !== baseline;

  const requestClose = (o: boolean) => {
    if (!o && dirty && !isPending) {
      setConfirmClose(true);
      return;
    }
    onOpenChange(o);
  };

  const update = <K extends keyof DailyLogInsert>(k: K, v: DailyLogInsert[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const onStartDateChange = (date: string) => {
    setDraft((d) => ({
      ...d,
      log_date: date,
      is_off_day: editing || defaultLeaveMode ? d.is_off_day : isWeekend(date),
    }));
    setEndDate((prevEnd) => (prevEnd < date || !draft.is_off_day ? date : prevEnd));
  };

  const onEndDateChange = (date: string) => {
    if (date < draft.log_date) {
      setDraft((d) => ({ ...d, log_date: date }));
      setEndDate(draft.log_date);
    } else {
      setEndDate(date);
    }
  };

  const setDurationDays = (days: number) => {
    setEndDate(addDaysISO(draft.log_date, Math.max(0, days - 1)));
  };

  const getCatValue = (key: string): number =>
    (draft.counts as Record<string, number>)[key] ?? 0;

  const setCatValue = (key: string, v: number) =>
    setDraft((d) => ({ ...d, counts: { ...d.counts, [key]: v } }));

  const total = categories.reduce((s, c) => s + getCatValue(c.key), 0);
  const leaveDates = draft.is_off_day
    ? getDatesInRange(draft.log_date, endDate >= draft.log_date ? endDate : draft.log_date)
    : [draft.log_date];
  const leaveDayCount = leaveDates.length;
  const resumesOnDate = addDaysISO(leaveDates[leaveDates.length - 1], 1);

  const conflict = !editing
    ? leaveDates.some((d) => existingDates.includes(d))
    : leaveDates.some((d) => !previousDates.includes(d) && existingDates.includes(d));

  const isToday = draft.log_date === isoDate();

  const save = async () => {
    try {
      if (draft.is_off_day) {
        await upsertLeaveRange.mutateAsync({
          startDate: draft.log_date,
          endDate: endDate >= draft.log_date ? endDate : draft.log_date,
          leaveType,
          notes: draft.notes?.trim() || null,
          previousDates,
        });
      } else {
        // If converting a multi-day leave to a single working day, clean up extra dates
        const extraDates = previousDates.filter((d) => d !== draft.log_date);
        if (extraDates.length > 0) {
          await deleteLog.mutateAsync(extraDates);
        }
        await upsert.mutateAsync({ ...draft, notes: draft.notes?.trim() || null });
      }
      setConfirmClose(false);
      onOpenChange(false);
    } catch {
      // Error handled by mutation toast
    }
  };

  return (
    <Sheet open={open} onOpenChange={requestClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col p-0 gap-0 bg-sidebar font-sans border-l border-border/70 shadow-2xl"
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !isPending) {
            e.preventDefault();
            void save();
          }
        }}
      >
        {/* ── Header ── */}
        <SheetHeader className="shrink-0 p-0 border-b border-border/60 bg-card">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "size-10 rounded-xl border grid place-items-center shrink-0 shadow-2xs transition-colors",
                  draft.is_off_day
                    ? "bg-sky-500/10 border-sky-500/25 text-sky-600 dark:text-sky-400"
                    : "bg-primary/10 border-primary/20 text-primary",
                )}
              >
                {draft.is_off_day ? (
                  <CalendarRange className="size-5" />
                ) : (
                  <CalendarCheck className="size-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-base font-bold text-foreground truncate">
                    {editing
                      ? draft.is_off_day
                        ? "Edit Leave / Off Day"
                        : "Edit Daily Log"
                      : draft.is_off_day
                      ? "Plan or Log Leave"
                      : "Log Daily Work"}
                  </SheetTitle>
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                      conflict
                        ? "bg-warning/15 text-warning border-warning/30"
                        : editing
                        ? "bg-muted/60 text-muted-foreground border-border/40"
                        : draft.is_off_day
                        ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25"
                        : "bg-primary/10 text-primary border-primary/20",
                    )}
                  >
                    {conflict ? "Conflict" : editing ? "Editing" : draft.is_off_day ? "1-Row Leave" : "New Entry"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {draft.is_off_day
                    ? "Short or long leaves consolidate into 1 row automatically"
                    : editing
                    ? "Update counts and notes for this date"
                    : "Record completed throughput and off days"}
                </p>
              </div>
            </div>

            {!draft.is_off_day && total > 0 && (
              <div className="shrink-0 text-right pr-6 sm:pr-8">
                <div className="text-xl font-bold tabular-nums text-primary leading-none">{total}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-heading mt-0.5">
                  docs
                </div>
              </div>
            )}
            {draft.is_off_day && (
              <div className="shrink-0 text-right pr-6 sm:pr-8">
                <div className="text-xl font-bold tabular-nums text-sky-600 dark:text-sky-400 leading-none">
                  {leaveDayCount}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-heading mt-0.5">
                  {leaveDayCount === 1 ? "day" : "days"}
                </div>
              </div>
            )}
          </div>
        </SheetHeader>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-5 pb-8 space-y-5">
          {/* Segmented Mode Switcher: Work Day vs Leave / Planned Leave */}
          <div className="px-5">
            <div className="grid grid-cols-2 p-1 rounded-xl bg-muted/50 border border-border/60">
              <button
                type="button"
                onClick={() => update("is_off_day", false)}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  !draft.is_off_day
                    ? "bg-card text-foreground shadow-xs border border-border/50"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <CalendarCheck className="size-3.5 text-primary" />
                <span>Work Day</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  update("is_off_day", true);
                  if (endDate < draft.log_date) setEndDate(draft.log_date);
                }}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  draft.is_off_day
                    ? "bg-card text-sky-600 dark:text-sky-400 shadow-xs border border-sky-500/30"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <CalendarRange className="size-3.5 text-sky-500" />
                <span>Leave / Off Day</span>
              </button>
            </div>
          </div>

          {/* Date Picker (Single Date for Work Day, Start -> End Range for Leave) */}
          {!draft.is_off_day ? (
            <div className="px-5 space-y-2">
              <SectionLabel>
                <CalendarIcon className="size-3 text-muted-foreground" />
                <span>Work Date</span>
              </SectionLabel>

              {editing && previousDates.length === 1 && !editing.is_off_day ? (
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20">
                  <div className="flex items-center gap-2.5">
                    <CalendarIcon className="size-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground">
                      {format(parseISO(draft.log_date), "EEEE, MMMM d, yyyy")}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/40 uppercase">
                    Locked
                  </span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Popover open={calOpen} onOpenChange={setCalOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 h-9.5 justify-start text-left font-normal tabular-nums rounded-xl border-border/60 bg-card text-xs cursor-pointer shadow-2xs"
                      >
                        <CalendarIcon className="size-3.5 mr-2 text-muted-foreground" />
                        {format(parseISO(draft.log_date), "EEE, MMM d, yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-xl shadow-lg" align="start">
                      <Calendar
                        mode="single"
                        selected={parseISO(draft.log_date)}
                        onSelect={(day) => {
                          if (day) {
                            onStartDateChange(format(day, "yyyy-MM-dd"));
                            setCalOpen(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Button
                    type="button"
                    variant={isToday ? "default" : "outline"}
                    className="h-9.5 px-3.5 shrink-0 rounded-xl text-xs cursor-pointer"
                    onClick={() => onStartDateChange(isoDate())}
                  >
                    Today
                  </Button>
                </div>
              )}

              {conflict && (
                <div className="flex items-start gap-2.5 text-xs rounded-xl px-3.5 py-2.5 bg-warning/[0.08] border border-warning/25 mt-2">
                  <TriangleAlert className="size-4 shrink-0 mt-0.5 text-warning" />
                  <span className="text-foreground/90">
                    A log already exists for this date. Saving will overwrite the previous counts.
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="px-5 space-y-4">
              {/* Leave Type Selector */}
              <div className="space-y-2">
                <SectionLabel>
                  <BedDouble className="size-3 text-muted-foreground" />
                  <span>Leave Type</span>
                </SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  {LEAVE_TYPES.map((lt) => {
                    const active = leaveType === lt.id;
                    return (
                      <button
                        key={lt.id}
                        type="button"
                        onClick={() => setLeaveType(lt.id)}
                        className={cn(
                          "flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer",
                          active
                            ? cn(lt.badgeCls, "font-semibold shadow-2xs")
                            : "bg-card border-border/60 text-muted-foreground hover:text-foreground hover:border-border",
                        )}
                      >
                        <span className="truncate">{lt.label}</span>
                        {active && <Check className="size-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Leave Date Range (Start -> End) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <SectionLabel>
                    <CalendarIcon className="size-3 text-muted-foreground" />
                    <span>Leave Dates (Short or Long)</span>
                  </SectionLabel>
                  <span className="text-[10px] font-mono font-semibold text-sky-600 dark:text-sky-400">
                    {leaveDayCount} {leaveDayCount === 1 ? "day" : "days"} · 1 row
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* From Date */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-0.5">
                      From
                    </span>
                    <Popover open={calOpen} onOpenChange={setCalOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full h-9.5 justify-start text-left font-normal tabular-nums rounded-xl border-border/60 bg-card text-xs cursor-pointer shadow-2xs px-2.5"
                        >
                          <CalendarIcon className="size-3.5 mr-1.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{format(parseISO(draft.log_date), "MMM d, yyyy")}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-xl shadow-lg" align="start">
                        <Calendar
                          mode="single"
                          selected={parseISO(draft.log_date)}
                          onSelect={(day) => {
                            if (day) {
                              onStartDateChange(format(day, "yyyy-MM-dd"));
                              setCalOpen(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* To Date */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-0.5">
                      To (Inclusive)
                    </span>
                    <Popover open={endCalOpen} onOpenChange={setEndCalOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full h-9.5 justify-start text-left font-normal tabular-nums rounded-xl border-border/60 bg-card text-xs cursor-pointer shadow-2xs px-2.5"
                        >
                          <CalendarIcon className="size-3.5 mr-1.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{format(parseISO(endDate), "MMM d, yyyy")}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-xl shadow-lg" align="end">
                        <Calendar
                          mode="single"
                          selected={parseISO(endDate)}
                          onSelect={(day) => {
                            if (day) {
                              onEndDateChange(format(day, "yyyy-MM-dd"));
                              setEndCalOpen(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Quick Duration Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {[
                    { label: "1 Day", days: 1 },
                    { label: "2 Days", days: 2 },
                    { label: "3 Days", days: 3 },
                    { label: "5 Days", days: 5 },
                    { label: "1 Week", days: 7 },
                    { label: "2 Weeks", days: 14 },
                  ].map((preset) => {
                    const isSelected = leaveDayCount === preset.days;
                    return (
                      <button
                        key={preset.days}
                        type="button"
                        onClick={() => setDurationDays(preset.days)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer",
                          isSelected
                            ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/35 font-semibold"
                            : "bg-muted/35 text-muted-foreground border-border/50 hover:text-foreground hover:bg-muted/60",
                        )}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {conflict && (
                  <div className="flex items-start gap-2.5 text-xs rounded-xl px-3.5 py-2.5 bg-warning/[0.08] border border-warning/25 mt-2">
                    <TriangleAlert className="size-4 shrink-0 mt-0.5 text-warning" />
                    <span className="text-foreground/90">
                      One or more dates in this range already have logs. Saving will update them as leave.
                    </span>
                  </div>
                )}
              </div>

              {/* Consolidated 1-Row Preview Card */}
              <div className="rounded-xl bg-sky-500/[0.05] border border-sky-500/20 p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <CalendarRange className="size-3.5 text-sky-500" />
                    <span>
                      {leaveDayCount === 1
                        ? formatTableDate(draft.log_date)
                        : `${formatTableDate(draft.log_date)} → ${formatTableDate(endDate)}`}
                    </span>
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25">
                    1 Compact Row ({leaveDayCount} {leaveDayCount === 1 ? "Day" : "Days"})
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <ArrowRight className="size-3 text-sky-500 shrink-0" />
                  <span>
                    Next log row continues automatically from{" "}
                    <strong className="text-foreground font-semibold">{formatTableDate(resumesOnDate)}</strong>
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Category Steppers */}
          {!draft.is_off_day && (
            <div className="space-y-2">
              <div className="px-5 flex items-center justify-between">
                <SectionLabel>
                  <span className="size-1.5 rounded-full bg-primary" />
                  <span>Document Counts</span>
                </SectionLabel>
                {total > 0 && (
                  <span className="text-[11px] font-semibold tabular-nums text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                    {total} total docs
                  </span>
                )}
              </div>
              <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-2xs mx-5">
                {categories.length === 0 ? (
                  <p className="px-5 py-8 text-xs text-center text-muted-foreground">
                    No categories found. Configure them in Settings.
                  </p>
                ) : (
                  categories.map((c) => (
                    <Stepper
                      key={c.key}
                      label={c.label}
                      shortLabel={c.short}
                      value={getCatValue(c.key)}
                      color={colorForKey(c.key)}
                      onChange={(v) => setCatValue(c.key, v)}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* Optional Notes */}
          <div className="px-5 space-y-2">
            <SectionLabel>
              <PenLine className="size-3 text-muted-foreground" />
              <span>{draft.is_off_day ? "Leave Reason / Notes" : "Notes"}</span>
              <span className="font-normal normal-case text-muted-foreground/60">(optional)</span>
            </SectionLabel>
            <Textarea
              value={draft.notes ?? ""}
              onChange={(e) => update("notes", e.target.value)}
              placeholder={
                draft.is_off_day
                  ? "E.g. Family trip, medical appointment, planned vacation…"
                  : "Anything worth noting about this day…"
              }
              maxLength={450}
              rows={2}
              className="resize-none text-xs bg-card border-border/60 rounded-xl focus-visible:border-primary/50 shadow-2xs"
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 px-5 py-3.5 border-t border-border/60 bg-card flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => requestClose(false)}
            className="flex-1 h-9 text-xs font-medium rounded-xl border-border/60 hover:bg-muted cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={isPending}
            className="flex-1 h-9 text-xs font-semibold rounded-xl gap-2 shadow-xs cursor-pointer"
          >
            <CalendarCheck className="size-4" />
            <span>
              {isPending
                ? "Saving…"
                : draft.is_off_day
                ? leaveDayCount > 1
                  ? `Save ${leaveType} (${leaveDayCount}d)`
                  : `Save ${leaveType}`
                : total > 0
                ? `Save · ${total} docs`
                : "Save Day"}
            </span>
            <kbd className="ml-1 text-[10px] font-mono border border-primary-foreground/30 bg-primary-foreground/10 rounded px-1.5 py-0.2 hidden sm:inline">
              Ctrl ↵
            </kbd>
          </Button>
        </div>
      </SheetContent>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent className="sm:max-w-md border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              The changes you entered have not been saved yet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/60 text-xs">Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs"
              onClick={() => {
                setConfirmClose(false);
                onOpenChange(false);
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
