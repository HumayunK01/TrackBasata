import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addMinutesToTime,
  computeDurationMinutes,
  formatDuration,
  formatTime12h,
  isOvernightWindow,
  useUpsertOvertimeLog,
  type OvertimeLog,
} from "@/hooks/useOvertimeLogs";
import { addDaysISO, isoDate } from "@/types/log";
import {
  CalendarIcon,
  Check,
  Clock,
  Info,
  Loader2,
  Pencil,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface OvertimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row?: OvertimeLog | null;
}

const DURATION_PRESETS = [
  { label: "+30m", minutes: 30 },
  { label: "+1h", minutes: 60 },
  { label: "+1.5h", minutes: 90 },
  { label: "+2h", minutes: 120 },
  { label: "+3h", minutes: 180 },
  { label: "+4h", minutes: 240 },
] as const;

const DEFAULT_START = "17:00";
const DEFAULT_END = "19:00";

export function OvertimeEntryDialog({
  open,
  onOpenChange,
  row,
}: OvertimeEntryDialogProps) {
  const upsert = useUpsertOvertimeLog();

  const [otDate, setOtDate] = useState(() => isoDate());
  const [startTime, setStartTime] = useState(DEFAULT_START);
  const [endTime, setEndTime] = useState(DEFAULT_END);
  const [notes, setNotes] = useState("");
  const [calOpen, setCalOpen] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsSuccess(false);
      return;
    }
    setIsSuccess(false);
    setError("");
    if (row) {
      setOtDate(row.ot_date);
      setStartTime(row.start_time);
      setEndTime(row.end_time);
      setNotes(row.notes ?? "");
    } else {
      setOtDate(isoDate());
      setStartTime(DEFAULT_START);
      setEndTime(DEFAULT_END);
      setNotes("");
    }
  }, [open, row]);

  const durationMinutes = useMemo(
    () => computeDurationMinutes(startTime, endTime),
    [startTime, endTime],
  );
  const overnight = useMemo(
    () => isOvernightWindow(startTime, endTime),
    [startTime, endTime],
  );

  const todayIso = isoDate();
  const yesterdayIso = addDaysISO(todayIso, -1);

  const save = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (upsert.isPending || isSuccess) return;

    if (durationMinutes <= 0) {
      setError("End time must be different from start time.");
      return;
    }

    upsert.mutate(
      {
        id: row?.id,
        input: {
          ot_date: otDate,
          start_time: startTime,
          end_time: endTime,
          duration_minutes: durationMinutes,
          notes: notes.trim() || null,
        },
      },
      {
        onSuccess: () => {
          setIsSuccess(true);
          setTimeout(() => {
            onOpenChange(false);
          }, 550);
        },
        onError: (err) => setError(err.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] w-full p-0 gap-0 overflow-hidden bg-card border border-border/80 dark:border-white/10 shadow-2xl rounded-3xl sm:rounded-3xl">
        {/* ── Dialog Header ── */}
        <DialogHeader className="px-5 py-4 border-b border-border/60 bg-muted/20 flex flex-row items-center justify-between pr-12 space-y-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/12 border border-primary/25 text-primary shrink-0 shadow-2xs">
              {row ? <Pencil className="size-4" /> : <Clock className="size-4" />}
            </div>
            <div className="min-w-0 text-left">
              <DialogTitle className="text-sm sm:text-[15px] font-bold text-foreground tracking-tight leading-snug">
                {row ? "Edit Overtime Entry" : "Log Overtime (OT)"}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                {row
                  ? "Update overtime date, window, or notes."
                  : "Record your overtime date, shift window, and notes."}
              </DialogDescription>
            </div>
          </div>

          {durationMinutes > 0 && (
            <div className="shrink-0 text-right hidden sm:block">
              <div className="text-base font-bold font-mono tabular-nums text-primary leading-none">
                {formatDuration(durationMinutes)}
              </div>
              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                {durationMinutes} mins
              </div>
            </div>
          )}
        </DialogHeader>

        {/* ── Form Body ── */}
        <form onSubmit={save} className="p-5 space-y-4">
          {/* OT Date Picker + Today / Yesterday shortcuts */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>OT Date</span>
              <span className="text-[10px] text-muted-foreground font-normal">Required</span>
            </Label>
            <div className="flex items-center gap-2">
              <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-9.5 justify-start text-left font-medium tabular-nums rounded-xl border-border/60 bg-muted/20 text-xs cursor-pointer shadow-2xs"
                  >
                    <CalendarIcon className="size-3.5 mr-2 text-muted-foreground shrink-0" />
                    <span className="truncate">{format(parseISO(otDate), "EEE, MMM d, yyyy")}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-xl shadow-lg" align="start">
                  <Calendar
                    mode="single"
                    selected={parseISO(otDate)}
                    onSelect={(day) => {
                      if (day) {
                        setOtDate(format(day, "yyyy-MM-dd"));
                        setCalOpen(false);
                        setError("");
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                variant={otDate === yesterdayIso ? "default" : "outline"}
                className="h-9.5 px-3 shrink-0 rounded-xl text-xs cursor-pointer"
                onClick={() => { setOtDate(yesterdayIso); setError(""); }}
              >
                Yesterday
              </Button>
              <Button
                type="button"
                variant={otDate === todayIso ? "default" : "outline"}
                className="h-9.5 px-3 shrink-0 rounded-xl text-xs cursor-pointer"
                onClick={() => { setOtDate(todayIso); setError(""); }}
              >
                Today
              </Button>
            </div>
          </div>

          {/* Overtime Window Card */}
          <div className="rounded-2xl border border-border/70 bg-background/50 dark:bg-black/20 p-3.5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 font-semibold">
                Overtime Window
              </span>
              <div className="flex items-center gap-1.5">
                {overnight && (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                    Overnight (+1d)
                  </span>
                )}
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border shadow-2xs",
                    durationMinutes > 0
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25",
                  )}
                >
                  <Clock className="size-3" />
                  <span>
                    {durationMinutes > 0 ? formatDuration(durationMinutes) : "Invalid range"}
                  </span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ot-start-time" className="text-[11px] font-medium text-muted-foreground">
                  Start Time
                </Label>
                <Input
                  id="ot-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => { setStartTime(e.target.value); setError(""); }}
                  className="h-9.5 rounded-xl bg-card border-border/60 font-mono text-xs sm:text-sm tabular-nums"
                />
                <p className="text-[10px] font-mono text-muted-foreground/75 px-0.5">
                  {formatTime12h(startTime)}
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ot-end-time" className="text-[11px] font-medium text-muted-foreground">
                  End Time
                </Label>
                <Input
                  id="ot-end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => { setEndTime(e.target.value); setError(""); }}
                  className="h-9.5 rounded-xl bg-card border-border/60 font-mono text-xs sm:text-sm tabular-nums"
                />
                <p className="text-[10px] font-mono text-muted-foreground/75 px-0.5">
                  {formatTime12h(endTime)}{overnight ? " (next day)" : ""}
                </p>
              </div>
            </div>

            {/* Quick duration preset chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] font-mono text-muted-foreground/70 mr-1">Quick set:</span>
              {DURATION_PRESETS.map((preset) => {
                const active = durationMinutes === preset.minutes;
                return (
                  <button
                    key={preset.minutes}
                    type="button"
                    onClick={() => {
                      setEndTime(addMinutesToTime(startTime, preset.minutes));
                      setError("");
                    }}
                    className={cn(
                      "px-2 py-1 rounded-lg text-[11px] font-mono font-medium border transition-all cursor-pointer",
                      active
                        ? "bg-primary/15 text-primary border-primary/35 font-semibold"
                        : "bg-muted/35 text-muted-foreground border-border/50 hover:text-foreground hover:bg-muted/60",
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="ot-notes" className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Notes</span>
              <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
            </Label>
            <Textarea
              id="ot-notes"
              placeholder="Reason for OT, tasks handled, or follow-up details..."
              value={notes}
              maxLength={1000}
              rows={3}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-xl bg-muted/20 border-border/60 outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary font-medium text-xs leading-relaxed resize-none"
            />
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2 animate-fade-in font-medium">
              <Info className="size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer */}
          <DialogFooter className="pt-2 border-t border-border/60 flex flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSuccess || upsert.isPending}
              className="border-border/70 bg-background/60 hover:bg-muted/70 text-xs font-medium h-9 px-4 rounded-xl cursor-pointer"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={upsert.isPending || durationMinutes <= 0 || isSuccess}
              className={cn(
                "text-xs font-semibold shadow-xs h-9 px-4 rounded-xl cursor-pointer transition-all duration-200",
                isSuccess
                  ? "bg-emerald-500 hover:bg-emerald-500 text-white shadow-emerald-500/25 scale-[1.02]"
                  : "bg-primary hover:bg-primary/95 text-primary-foreground shadow-primary/20",
              )}
            >
              {isSuccess ? (
                <span className="inline-flex items-center gap-1.5 success-badge-pop">
                  <Check className="size-4 stroke-[2.5]" />
                  <span>{row ? "Saved!" : "OT Logged!"}</span>
                </span>
              ) : upsert.isPending ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving...</span>
                </span>
              ) : (
                <span>{row ? "Save Changes" : "Add OT Entry"}</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
