import type { FaxRow, FaxStepStatus, StepField } from "@/hooks/useFaxTracker";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2 } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { StepPicker, StatusIcon } from "./StepPicker";
import { displayStatus, stepIsActive, stepIsSkipped, copyName, type TrackerMode } from "./tracker-helpers";

export function FaxCard({
  row,
  isNew,
  onEdit,
  onDelete,
  onPickStep,
  labels,
  mode,
}: {
  row: FaxRow;
  mine?: boolean;
  isNew: boolean;
  onEdit: (row: FaxRow) => void;
  onDelete: (row: FaxRow) => void;
  onPickStep: (field: StepField, value: FaxStepStatus) => void;
  labels: [string, string, string];
  mode: TrackerMode;
}) {
  const fields: StepField[] = ["step1", "step2", "step3"];

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/65 bg-card/80 p-4 shadow-2xs transition-all duration-150 hover:border-border hover:shadow-xs",
        isNew && "animate-row-in",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <img src="/pdf.png" alt="" className="size-5 shrink-0 object-contain" />
          <button
            type="button"
            onClick={() => copyName(row.patient_name)}
            title="Tap to copy name"
            className="font-semibold text-sm sm:text-base text-foreground rounded-lg px-1 -mx-1 text-left hover:bg-foreground/5 hover:text-emerald-500 active:scale-[0.98] transition-all cursor-pointer truncate"
          >
            {row.patient_name}
          </button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 rounded-xl shrink-0 text-muted-foreground hover:text-foreground active:scale-95 transition-all" aria-label={`Options for ${row.patient_name}`}>
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 rounded-2xl border border-border/70 bg-background/95 backdrop-blur-xl shadow-xl p-1.5">
            <button
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium hover:bg-muted rounded-xl transition-colors cursor-pointer text-foreground"
              onClick={() => onEdit(row)}
            >
              <Pencil className="size-3.5" /> Edit
            </button>
            <button
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-xl transition-colors cursor-pointer"
              onClick={() => onDelete(row)}
            >
              <Trash2 className="size-3.5" /> Delete
            </button>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">Status:</span>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <StatusIcon status={
            row.overall_status.startsWith("Resolved") ? "Successfully Sent"
            : (row.overall_status === "All Steps Failed" || row.overall_status === "Failed") ? "Failed"
            : "Waiting"
          } />
          {displayStatus(row.overall_status)}
        </span>
      </div>

      <dl className="mt-3.5 rounded-xl border border-border/50 bg-background/40 p-3 space-y-2">
        {fields.map((field, i) => {
          const status = row[field];
          const active = stepIsActive(row, field, mode);
          const skipped = stepIsSkipped(row, field, mode);
          return (
            <div key={field} className="flex items-center justify-between gap-3 text-xs min-h-7">
              <dt className="font-medium text-muted-foreground">{labels[i]}</dt>
              <dd className="text-right">
                {!active ? (
                  <span className="font-mono text-muted-foreground">—</span>
                ) : skipped ? (
                  <span className="text-2xs text-muted-foreground italic">—</span>
                ) : (
                  <StepPicker status={status} onPick={(v) => onPickStep(field, v)} label={labels[i]} />
                )}
              </dd>
            </div>
          );
        })}
      </dl>

      {row.notes && (
        <p className="mt-3 pt-2.5 border-t border-border/50 text-xs text-muted-foreground leading-relaxed">
          {row.notes}
        </p>
      )}
    </div>
  );
}
