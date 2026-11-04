import { Check, CheckCheck, ChevronDown, Loader2, X } from "@/components/ui/icons";
import { STEP_STATUSES, type FaxStepStatus } from "@/hooks/useFaxTracker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { labelFor } from "./tracker-helpers";

export function StatusIcon({ status, tickColor }: { status: FaxStepStatus | null; tickColor?: string }) {
  switch (status) {
    case "Successfully Sent":
      return <CheckCheck className={cn("size-3.5 status-icon-morph", tickColor ?? "text-emerald-500")} />;
    case "Failed":
      return <X className={cn("size-3.5 status-icon-morph", tickColor ?? "text-rose-500")} />;
    case "Waiting":
    case "Pending":
      return <Loader2 className="size-3.5 text-sky-500 animate-spin" />;
    default:
      return null;
  }
}

export function StepPicker({
  status,
  onPick,
  label,
  triggerClassName,
}: {
  status: FaxStepStatus | null;
  onPick: (value: FaxStepStatus) => void;
  label: string;
  triggerClassName?: string;
}) {
  const getBadgeClasses = (s: FaxStepStatus | null) => {
    switch (s) {
      case "Successfully Sent":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25";
      case "Failed":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25";
      case "Waiting":
      case "Pending":
        return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25";
      default:
        return "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Click to change status"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border status-badge-morph active:scale-95 cursor-pointer shadow-2xs",
            getBadgeClasses(status),
            triggerClassName,
          )}
        >
          {status ? (
            <span className="inline-flex items-center gap-1.5">
              <StatusIcon key={status} status={status} />
              <span>{labelFor(status)}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Set status</span>
          )}
          <ChevronDown className="size-3 opacity-40 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-48 rounded-2xl border border-border/70 bg-background/95 backdrop-blur-xl shadow-xl p-1.5">
        <DropdownMenuLabel className="font-mono text-2xs uppercase tracking-wider text-muted-foreground px-2 py-1">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />
        {STEP_STATUSES.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => { if (s !== status) onPick(s); }}
            className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-xs font-medium cursor-pointer"
          >
            <span className="inline-flex items-center gap-2">
              <StatusIcon status={s} />
              <span>{labelFor(s)}</span>
            </span>
            {s === status && <Check className="size-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
