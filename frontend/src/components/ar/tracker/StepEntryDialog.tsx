import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Check,
  ChevronDown,
  Info,
  Loader2,
  Pencil,
  User,
  UserPlus,
} from "@/components/ui/icons";
import { STEP_STATUSES, type StepStatus, type TrackerRow, type TrackerInput } from "@/hooks/useTracker";
import { labelFor } from "./tracker-helpers";
import { StatusIcon } from "./StepPicker";
import { cn } from "@/lib/utils";

// Sentinel for unattempted / locked steps translated back to null on save.
const NONE = "__none__";

/** Minimal shape of the upsert mutation (fax or indexable) this dialog drives. */
type UpsertMutation = {
  isPending: boolean;
  mutate: (
    vars: { id?: string; accountId?: string; input: TrackerInput },
    options?: { onSuccess?: () => void },
  ) => void;
};

interface StepEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this row; otherwise it creates a new one. */
  row?: TrackerRow | null;
  /** Account the new row is added to (ignored when editing). */
  accountId?: string;
  upsert: UpsertMutation;
  /** Label for step 3, which differs between fax ("Reupload ROI") and indexable. */
  step3Label: string;
  /** Prefix for input ids so fax and indexable dialogs don't collide. */
  idPrefix: string;
}

export function StepEntryDialog({
  open,
  onOpenChange,
  row,
  accountId,
  upsert,
  step3Label,
  idPrefix,
}: StepEntryDialogProps) {
  const [patientName, setPatientName] = useState("");
  const [step1, setStep1] = useState<StepStatus>("Waiting");
  const [step2, setStep2] = useState<string>(NONE);
  const [step3, setStep3] = useState<string>(NONE);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  // Clean sub-label for step 3 (strips any leading "Step 3:" prefix)
  const step3Sub = useMemo(() => {
    return step3Label.replace(/^Step\s*3\s*:\s*/i, "").trim() || "Reupload ROI";
  }, [step3Label]);

  // Hydrate fields whenever the dialog opens (new row vs editing existing).
  useEffect(() => {
    if (!open) return;
    setPatientName(row?.patient_name ?? "");
    setStep1(row?.step1 === "Failed" || row?.step1 === "Successfully Sent" ? row.step1 : "Waiting");
    setStep2(row?.step2 ?? NONE);
    setStep3(row?.step3 ?? NONE);
    setNotes(row?.notes ?? "");
    setError("");
  }, [open, row]);

  // Sequential progression: step 2 only active when step 1 fails; step 3 only active when step 1 & 2 fail.
  const step2Disabled = step1 !== "Failed";
  const step3Disabled = step1 !== "Failed" || step2 !== "Failed";

  const handleStep1Change = (val: StepStatus) => {
    setStep1(val);
    if (val === "Failed") {
      setStep2((prev) => (prev === NONE || prev === "Pending" ? "Waiting" : prev));
    } else {
      setStep2(NONE);
      setStep3(NONE);
    }
  };

  const handleStep2Change = (val: StepStatus) => {
    setStep2(val);
    if (val === "Failed") {
      setStep3((prev) => (prev === NONE || prev === "Pending" ? "Waiting" : prev));
    } else {
      setStep3(NONE);
    }
  };

  const handleStep3Change = (val: StepStatus) => {
    setStep3(val);
  };

  // Live calculation of preview status
  const previewStatus = useMemo(() => {
    if (step1 === "Successfully Sent" || step2 === "Successfully Sent" || step3 === "Successfully Sent") {
      return { label: "Resolved", status: "Successfully Sent" as StepStatus, tone: "emerald" };
    }
    if (step1 === "Failed" && step2 === "Failed" && step3 === "Failed") {
      return { label: "Failed", status: "Failed" as StepStatus, tone: "rose" };
    }
    if (step1 === "Failed" && step2 === "Failed") {
      return { label: `Sending – ${step3Sub}`, status: "Waiting" as StepStatus, tone: "sky" };
    }
    if (step1 === "Failed") {
      return { label: "Sending – Refax New", status: "Waiting" as StepStatus, tone: "sky" };
    }
    return { label: "Sending – Refax Same", status: "Waiting" as StepStatus, tone: "sky" };
  }, [step1, step2, step3, step3Sub]);

  const save = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = patientName.trim();
    if (!name) { setError("Patient name is required."); return; }
    // Disabled steps are treated as "not attempted" regardless of any stale value.
    const s2 = step2Disabled ? null : (step2 === NONE ? null : (step2 as StepStatus));
    const s3 = step3Disabled ? null : (step3 === NONE ? null : (step3 as StepStatus));
    upsert.mutate(
      {
        id: row?.id,
        accountId,
        input: {
          patient_name: name,
          step1,
          step2: s2,
          step3: s3,
          notes: notes.trim() || null,
        },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  const stepsList = [
    {
      num: 1,
      title: "Refax Same",
      value: step1,
      disabled: false,
      onChange: handleStep1Change,
      subText: "Refax on the same fax no",
    },
    {
      num: 2,
      title: "Refax New",
      value: step2Disabled ? null : (step2 === NONE ? null : (step2 as StepStatus)),
      disabled: step2Disabled,
      onChange: handleStep2Change,
      subText: "Refax the document on another fax no",
    },
    {
      num: 3,
      title: step3Sub,
      value: step3Disabled ? null : (step3 === NONE ? null : (step3 as StepStatus)),
      disabled: step3Disabled,
      onChange: handleStep3Change,
      subText: "Reupload just the ROI and redo the ROI process",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] w-full p-0 gap-0 overflow-hidden bg-card border border-border/80 dark:border-white/10 shadow-2xl rounded-3xl sm:rounded-3xl">
        {/* ── Dialog Header ── */}
        <DialogHeader className="px-5 py-4 border-b border-border/60 bg-muted/20 flex flex-row items-center pr-12 space-y-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/12 border border-primary/25 text-primary shrink-0 shadow-2xs">
              {row ? <Pencil className="size-4" /> : <UserPlus className="size-4" />}
            </div>
            <div className="min-w-0 text-left">
              <DialogTitle className="text-sm sm:text-[15px] font-bold text-foreground tracking-tight leading-snug">
                {row ? "Edit Patient" : "Add Patient"}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                {row
                  ? "Update patient progression, statuses, or transmission notes."
                  : "Register a patient record to track fax transmission across steps."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ── Modal Form Body ── */}
        <form onSubmit={save} className="p-5 space-y-4">
          {/* Patient Name Input */}
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-name`} className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Patient Name</span>
              <span className="text-[10px] text-muted-foreground font-normal">Required</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60 pointer-events-none" />
              <Input
                id={`${idPrefix}-name`}
                placeholder="e.g. John Doe"
                value={patientName}
                className="h-10 pl-9 rounded-xl bg-muted/20 border-border/60 outline-none focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary font-medium text-sm transition-colors duration-150"
                onChange={(e) => { setPatientName(e.target.value); setError(""); }}
                autoFocus={!row}
              />
            </div>
          </div>

          {/* ── Workflow Steps Section ── */}
          <div className="rounded-2xl border border-border/70 bg-background/50 dark:bg-black/20 p-3.5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 font-semibold">
                Transmission Pathway
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground/70 font-mono">Outcome:</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-2xs",
                    previewStatus.tone === "emerald"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                      : previewStatus.tone === "rose"
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
                      : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25",
                  )}
                >
                  <StatusIcon status={previewStatus.status} />
                  <span>{previewStatus.label}</span>
                </span>
              </div>
            </div>

            {/* Stepper Cards */}
            <div className="space-y-2">
              {stepsList.map((step) => {
                const isSelected = !step.disabled && step.value !== null;
                return (
                  <div
                    key={step.num}
                    className={cn(
                      "flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all duration-150",
                      step.disabled
                        ? "bg-muted/10 border-border/40 opacity-55"
                        : step.value === "Successfully Sent"
                        ? "bg-emerald-500/[0.04] border-emerald-500/30 shadow-2xs"
                        : step.value === "Failed"
                        ? "bg-rose-500/[0.04] border-rose-500/30 shadow-2xs"
                        : "bg-sky-500/[0.04] border-sky-500/30 shadow-2xs",
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          "flex size-6 items-center justify-center rounded-lg text-2xs font-mono font-bold shrink-0 transition-colors",
                          step.disabled
                            ? "bg-muted/40 text-muted-foreground/60 border border-border/40"
                            : step.value === "Successfully Sent"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : step.value === "Failed"
                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                            : "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30",
                        )}
                      >
                        {step.num}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate leading-snug">
                          {step.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 truncate leading-tight">
                          {step.subText}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {step.disabled ? (
                        <span className="text-[11px] font-mono text-muted-foreground/50 px-2.5 py-1 rounded-lg bg-muted/20 border border-border/40 inline-flex items-center select-none">
                          {step1 === "Successfully Sent" || (step.num === 3 && step2 === "Successfully Sent") ? "Resolved" : "Locked"}
                        </span>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all duration-150 active:scale-95 cursor-pointer shadow-2xs",
                                step.value === "Successfully Sent"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                                  : step.value === "Failed"
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
                                  : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25",
                              )}
                            >
                              <StatusIcon status={step.value} />
                              <span>{labelFor(step.value ?? "Waiting")}</span>
                              <ChevronDown className="size-3 opacity-50 shrink-0 ml-0.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-40 rounded-2xl border border-border/70 bg-background/95 backdrop-blur-xl shadow-xl p-1.5"
                          >
                            {STEP_STATUSES.map((s) => (
                              <DropdownMenuItem
                                key={s}
                                onClick={() => step.onChange(s)}
                                className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium cursor-pointer"
                              >
                                <span className="inline-flex items-center gap-2">
                                  <StatusIcon status={s} />
                                  <span>{labelFor(s)}</span>
                                </span>
                                {s === step.value && <Check className="size-3.5 text-primary" />}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes Input */}
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-notes`} className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Notes</span>
              <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
            </Label>
            <Textarea
              id={`${idPrefix}-notes`}
              placeholder="Transmission notes, fax number, or follow-up details..."
              value={notes}
              maxLength={1000}
              rows={2}
              className="rounded-xl bg-muted/20 border-border/60 outline-none focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary font-medium text-xs leading-relaxed resize-none transition-colors duration-150"
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Validation Error Banner */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2 animate-fade-in font-medium">
              <Info className="size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Dialog Footer ── */}
          <DialogFooter className="pt-2 border-t border-border/60 flex flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-border/70 bg-background/60 hover:bg-muted/70 text-xs font-medium h-9 px-4 rounded-xl cursor-pointer"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={upsert.isPending || !patientName.trim()}
              className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold shadow-xs shadow-primary/20 h-9 px-4 rounded-xl cursor-pointer"
            >
              {upsert.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              {row ? "Save Changes" : "Add Patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
