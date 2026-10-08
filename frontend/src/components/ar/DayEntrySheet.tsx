import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { isoDate, isWeekend, type DailyLog, type DailyLogInsert } from "@/types/log";
import { useUpsertLog } from "@/hooks/useDailyLogs";
import { useCategories } from "@/hooks/useCategories";
import { canonEntry } from "@/lib/log-utils";
import {
  Minus,
  Plus,
  CalendarCheck,
  BedDouble,
  CalendarIcon,
  TriangleAlert,
  PenLine,
} from "@/components/ui/icons";
import { format, parseISO } from "date-fns";
import { colorForKey, withAlpha } from "@/lib/cat-colors";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: DailyLog | null;
  existingDates: string[];
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

export function DayEntrySheet({ open, onOpenChange, editing, existingDates }: Props) {
  const [draft, setDraft] = useState<DailyLogInsert>(() => emptyDraft());
  const [baseline, setBaseline] = useState("");
  const [calOpen, setCalOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const upsert = useUpsertLog();
  const { data: categories = [] } = useCategories();

  useEffect(() => {
    if (!open) return;
    const next = editing
      ? {
          log_date: editing.log_date,
          counts: { ...editing.counts },
          is_off_day: editing.is_off_day,
          notes: editing.notes,
        }
      : emptyDraft();
    setDraft(next);
    setBaseline(canonEntry(next));
  }, [open, editing]);

  const dirty = canonEntry(draft) !== baseline;

  const requestClose = (o: boolean) => {
    if (!o && dirty && !upsert.isPending) {
      setConfirmClose(true);
      return;
    }
    onOpenChange(o);
  };

  const update = <K extends keyof DailyLogInsert>(k: K, v: DailyLogInsert[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const onDateChange = (date: string) =>
    setDraft((d) => ({ ...d, log_date: date, is_off_day: editing ? d.is_off_day : isWeekend(date) }));

  const getCatValue = (key: string): number =>
    (draft.counts as Record<string, number>)[key] ?? 0;

  const setCatValue = (key: string, v: number) =>
    setDraft((d) => ({ ...d, counts: { ...d.counts, [key]: v } }));

  const total = categories.reduce((s, c) => s + getCatValue(c.key), 0);
  const conflict = !editing && existingDates.includes(draft.log_date);
  const isToday = draft.log_date === isoDate();
  const weekend = isWeekend(draft.log_date);

  const save = async () => {
    try {
      await upsert.mutateAsync({ ...draft, notes: draft.notes?.trim() || null });
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
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !upsert.isPending) {
            e.preventDefault();
            void save();
          }
        }}
      >
        {/* ── Header ── */}
        <SheetHeader className="shrink-0 p-0 border-b border-border/60 bg-card">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 text-primary grid place-items-center shrink-0 shadow-2xs">
                <CalendarCheck className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-base font-bold text-foreground truncate">
                    {editing ? "Edit Daily Log" : "Log Daily Work"}
                  </SheetTitle>
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                      conflict
                        ? "bg-warning/15 text-warning border-warning/30"
                        : editing
                        ? "bg-muted/60 text-muted-foreground border-border/40"
                        : "bg-primary/10 text-primary border-primary/20",
                    )}
                  >
                    {conflict ? "Conflict" : editing ? "Editing" : "New Entry"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {editing
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
          </div>
        </SheetHeader>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-5 pb-8 space-y-5">
          {/* Date Picker */}
          <div className="px-5 space-y-2">
            <SectionLabel>
              <CalendarIcon className="size-3 text-muted-foreground" />
              <span>Date</span>
            </SectionLabel>

            {editing ? (
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
                          onDateChange(format(day, "yyyy-MM-dd"));
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
                  onClick={() => onDateChange(isoDate())}
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

          {/* Off-Day Switch Card */}
          <div className="px-5">
            <div
              className={cn(
                "flex items-center justify-between rounded-xl px-4 py-3 border transition-all shadow-2xs",
                draft.is_off_day
                  ? "bg-primary/[0.04] border-primary/25"
                  : "bg-card border-border/60 hover:border-border",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "size-8 rounded-lg grid place-items-center shrink-0 transition-colors",
                    draft.is_off_day ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  <BedDouble className="size-4" />
                </div>
                <div>
                  <p
                    className={cn(
                      "text-xs sm:text-sm font-semibold leading-tight transition-colors",
                      draft.is_off_day ? "text-primary" : "text-foreground",
                    )}
                  >
                    {weekend ? "Weekend Off" : "Scheduled Off Day"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {weekend ? "Saturday or Sunday" : "Leave, holiday, or sick day"}
                  </p>
                </div>
              </div>
              <Switch
                checked={draft.is_off_day}
                onCheckedChange={(v) => update("is_off_day", v)}
                className={draft.is_off_day ? "data-[state=checked]:bg-primary cursor-pointer" : "cursor-pointer"}
              />
            </div>
          </div>

          {/* Category Steppers */}
          {!draft.is_off_day ? (
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
          ) : (
            <div className="px-5">
              <div className="flex flex-col items-center justify-center py-8 gap-2.5 rounded-xl bg-muted/20 border border-border/50 text-center">
                <span className="size-10 rounded-xl bg-primary/[0.06] border border-primary/10 grid place-items-center text-primary/70">
                  <BedDouble className="size-5" />
                </span>
                <p className="text-xs font-medium text-muted-foreground">
                  No document counts needed for an off day
                </p>
              </div>
            </div>
          )}

          {/* Optional Notes */}
          <div className="px-5 space-y-2">
            <SectionLabel>
              <PenLine className="size-3 text-muted-foreground" />
              <span>Notes</span>
              <span className="font-normal normal-case text-muted-foreground/60">(optional)</span>
            </SectionLabel>
            <Textarea
              value={draft.notes ?? ""}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Anything worth noting about this day…"
              maxLength={500}
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
            disabled={upsert.isPending}
            className="flex-1 h-9 text-xs font-semibold rounded-xl gap-2 shadow-xs cursor-pointer"
          >
            <CalendarCheck className="size-4" />
            <span>
              {upsert.isPending
                ? "Saving…"
                : draft.is_off_day
                ? weekend
                  ? "Save Weekend"
                  : "Save Off Day"
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
              The counts and notes you entered for this day have not been saved yet.
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
