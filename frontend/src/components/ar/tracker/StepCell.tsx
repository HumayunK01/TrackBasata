import { cn } from "@/lib/utils";
import type { FaxRow, FaxStepStatus, StepField } from "@/hooks/useFaxTracker";
import { StepPicker, StatusIcon } from "./StepPicker";
import { labelFor, stepIsActive, stepIsSkipped, type TrackerMode } from "./tracker-helpers";

export function StepCell({
  row,
  field,
  editable,
  onPick,
  labels,
  mode,
}: {
  row: FaxRow;
  field: StepField;
  editable: boolean;
  onPick: (value: FaxStepStatus) => void;
  labels: [string, string, string];
  mode: TrackerMode;
}) {
  const status = row[field];
  const active = stepIsActive(row, field, mode);

  if (!active) return <td className="px-3 py-2 text-center w-28 text-muted-foreground">—</td>;

  if (stepIsSkipped(row, field, mode)) {
    return <td className="px-3 py-2 text-center w-28 text-xs font-normal text-foreground italic">—</td>;
  }

  if (!editable) {
    const getBadgeClasses = (s: FaxStepStatus | null) => {
      switch (s) {
        case "Successfully Sent":
          return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25";
        case "Failed":
          return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25";
        case "Waiting":
          return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25";
        case "Pending":
          return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25";
        default:
          return "text-muted-foreground";
      }
    };

    return (
      <td className="px-3 py-2 text-center w-28">
        {status ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border shadow-2xs",
              getBadgeClasses(status),
            )}
          >
            <StatusIcon status={status} />
            <span>{labelFor(status)}</span>
          </span>
        ) : (
          <span className="text-muted-foreground font-mono">—</span>
        )}
      </td>
    );
  }

  return (
    <td className="px-3 py-2 text-center w-28">
      <StepPicker status={status} onPick={onPick} label={labels[Number(field.slice(-1)) - 1]} />
    </td>
  );
}
