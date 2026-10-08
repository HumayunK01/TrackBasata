import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info, Loader2, User } from "@/components/ui/icons";
import { STEP_STATUSES, type StepStatus, type TrackerRow, type TrackerInput } from "@/hooks/useTracker";

// Radix Select can't bind a real null, so steps 2/3 use this sentinel for
// "not attempted yet" and we translate it back to null on save.
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
  const [step1, setStep1] = useState<StepStatus>("Pending");
  const [step2, setStep2] = useState<string>(NONE);
  const [step3, setStep3] = useState<string>(NONE);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  // Hydrate fields whenever the dialog opens (new row vs editing existing).
  useEffect(() => {
    if (!open) return;
    setPatientName(row?.patient_name ?? "");
    setStep1(row?.step1 ?? "Pending");
    setStep2(row?.step2 ?? NONE);
    setStep3(row?.step3 ?? NONE);
    setNotes(row?.notes ?? "");
    setError("");
  }, [open, row]);

  // Once an earlier step succeeds, the case is resolved there — later steps
  // don't apply, so disable (and clear) them.
  const step2Disabled = step1 === "Successfully Sent";
  const step3Disabled = step1 === "Successfully Sent" || step2 === "Successfully Sent";

  const save = () => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border border-border/70 bg-background/95 backdrop-blur-xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <User className="size-4 text-primary" />
            {row ? "Edit Patient" : "Add Patient"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-name`} className="text-xs font-semibold text-foreground">Patient Name</Label>
            <Input
              id={`${idPrefix}-name`}
              placeholder="e.g. John Doe"
              value={patientName}
              className="h-10 rounded-xl bg-muted/30 border-border/60 font-medium"
              onChange={(e) => { setPatientName(e.target.value); setError(""); }}
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <StepSelect
              label="Step 1: Refax Same"
              value={step1}
              onChange={(v) => setStep1(v as StepStatus)}
              allowNone={false}
            />
            <StepSelect
              label="Step 2: Refax New"
              value={step2Disabled ? NONE : step2}
              onChange={setStep2}
              allowNone
              disabled={step2Disabled}
              hint="Not needed. Step 1 was sent successfully."
            />
            <StepSelect
              label={step3Label}
              value={step3Disabled ? NONE : step3}
              onChange={setStep3}
              allowNone
              disabled={step3Disabled}
              hint="Not needed. An earlier step was sent successfully."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-notes`} className="text-xs font-semibold text-foreground">Notes</Label>
            <Textarea
              id={`${idPrefix}-notes`}
              placeholder="Optional notes (e.g. fax number, follow-up)"
              value={notes}
              maxLength={1000}
              rows={3}
              className="rounded-xl bg-muted/30 border-border/60 font-medium"
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Overall status is calculated automatically from the three steps.
          </p>

          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2 animate-fade-in font-medium">
              <Info className="size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button variant="outline" className="rounded-xl border-border/60" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={upsert.isPending}
            className="rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm shadow-primary/20 font-semibold"
          >
            {upsert.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            {row ? "Save" : "Add Patient"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepSelect({
  label,
  value,
  onChange,
  allowNone,
  disabled,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  allowNone: boolean;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-border/60 font-medium">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-2xl border border-border/70 bg-background/95 backdrop-blur-xl shadow-xl p-1.5">
          {allowNone && <SelectItem value={NONE} className="rounded-xl">Not attempted</SelectItem>}
          {STEP_STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="rounded-xl">{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {disabled && hint && <p className="text-xs text-muted-foreground italic">{hint}</p>}
    </div>
  );
}
