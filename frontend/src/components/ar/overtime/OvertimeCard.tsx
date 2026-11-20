import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CalendarDays,
  Check,
  Clock,
  Copy,
  MoreVertical,
  Pencil,
  Trash2,
} from "@/components/ui/icons";
import { HighlightText } from "@/components/ar/HighlightText";
import { getWorkerInitials } from "@/components/ar/tracker/tracker-helpers";
import {
  formatDuration,
  formatTime12h,
  isOvernightWindow,
  type OvertimeLog,
} from "@/hooks/useOvertimeLogs";
import { formatDayName, formatTableDate } from "@/types/log";
import { cn } from "@/lib/utils";

interface OvertimeCardProps {
  row: OvertimeLog;
  addedByName: string;
  showAddedBy?: boolean;
  isMe: boolean;
  canModify: boolean;
  isCopied: boolean;
  searchQuery: string;
  onCopy: (row: OvertimeLog) => void;
  onEdit: (row: OvertimeLog) => void;
  onDelete: (row: OvertimeLog) => void;
}

export function OvertimeCard({
  row,
  addedByName,
  showAddedBy = true,
  isMe,
  canModify,
  isCopied,
  searchQuery,
  onCopy,
  onEdit,
  onDelete,
}: OvertimeCardProps) {
  const overnight = isOvernightWindow(row.start_time, row.end_time);

  return (
    <div className="rounded-2xl border border-border/65 bg-card/80 p-4 shadow-2xs transition-all duration-150 hover:border-border hover:shadow-xs space-y-3">
      {/* Top row: Date & Duration Pill + Actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-foreground tabular-nums">
            <CalendarDays className="size-4 text-primary shrink-0" />
            <span>{formatTableDate(row.ot_date)}</span>
          </span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md uppercase tracking-wider font-heading bg-muted/60 text-muted-foreground border border-border/40">
            {formatDayName(row.ot_date)}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
            <Clock className="size-3 shrink-0" />
            <span>{formatDuration(row.duration_minutes)}</span>
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-xl text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
            onClick={() => onCopy(row)}
            aria-label="Copy OT details"
          >
            {isCopied ? (
              <Check className="size-4 text-emerald-500" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
          {canModify && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Entry options"
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-36 rounded-2xl border border-border/70 bg-background/95 backdrop-blur-xl shadow-xl p-1.5"
              >
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium hover:bg-muted rounded-xl transition-colors cursor-pointer text-foreground"
                  onClick={() => onEdit(row)}
                >
                  <Pencil className="size-3.5" /> Edit
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-xl transition-colors cursor-pointer"
                  onClick={() => onDelete(row)}
                >
                  <Trash2 className="size-3.5" /> Delete
                </button>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Details Box */}
      <dl className="rounded-xl border border-border/50 bg-background/40 p-3 space-y-2 text-xs">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground font-medium">Overtime Window</dt>
          <dd className="font-mono font-semibold text-foreground tabular-nums text-right">
            {formatTime12h(row.start_time)} → {formatTime12h(row.end_time)}
            {overnight && (
              <span className="ml-1 text-[10px] text-amber-500 font-semibold">(+1d)</span>
            )}
          </dd>
        </div>
        {showAddedBy && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground font-medium">Added by</dt>
            <dd>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border",
                  isMe
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-muted/70 text-foreground/85 border-border/60",
                )}
              >
                <span className="size-4 rounded-full font-mono text-[9px] font-bold flex items-center justify-center shrink-0">
                  {getWorkerInitials(addedByName)}
                </span>
                <HighlightText text={addedByName} query={searchQuery} />
              </span>
            </dd>
          </div>
        )}
      </dl>

      {/* Notes */}
      {row.notes && (
        <div className="pt-1 text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground/80 mr-1.5 font-mono text-2xs uppercase">
            Note:
          </span>
          <HighlightText text={row.notes} query={searchQuery} />
        </div>
      )}
    </div>
  );
}
