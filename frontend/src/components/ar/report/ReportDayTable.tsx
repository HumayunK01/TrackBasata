import { formatTableDate, isWeekend, totalForLog, type DailyLog } from "@/types/log";
import { colorForKey } from "@/lib/cat-colors";
import type { Category } from "@/hooks/useCategories";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BedDouble, ChevronLeft, ChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const TABLE_PAGE_SIZE = 20;

interface ReportDayTableProps {
  filtered: DailyLog[];
  categories: Category[];
  workingLogs: DailyLog[];
  totalDocs: number;
  avgPerDay: number;
  tablePage: number;
  totalTablePages: number;
  tablePageNumbers: (number | "…")[];
  paginatedRows: DailyLog[];
  onPageChange: (p: number) => void;
}

export function ReportDayTable({
  filtered,
  categories,
  workingLogs,
  totalDocs,
  avgPerDay,
  tablePage,
  totalTablePages,
  tablePageNumbers,
  paginatedRows,
  onPageChange,
}: ReportDayTableProps) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 border-b border-border/50 flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold font-heading text-foreground">Day-by-Day Ledger</h2>
          <span className="text-[11px] font-mono font-medium text-muted-foreground bg-muted/60 border border-border/40 px-2 py-0.5 rounded-md">
            {filtered.length} days
          </span>
        </div>
      </div>
      <div className="overflow-x-auto no-scrollbar">
        <Table className="[&_td]:py-3 [&_th]:py-2.5">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border/60 bg-muted/30">
              <TableHead className="font-mono font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-center">
                Date
              </TableHead>
              {categories.map((c) => (
                <TableHead
                  key={c.key}
                  className="font-mono font-semibold text-[11px] uppercase tracking-wider text-center text-muted-foreground"
                >
                  {c.short}
                </TableHead>
              ))}
              <TableHead className="font-mono font-semibold text-[11px] uppercase tracking-wider text-center text-foreground">
                Total
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRows.map((l) => {
              const rowTotal = totalForLog(l);
              const isWeekendRow = isWeekend(l.log_date);

              return l.is_off_day ? (
                <TableRow key={l.id} className="border-b border-border/40 last:border-0 bg-muted/10">
                  <TableCell className="tabular-nums font-mono text-xs font-medium text-muted-foreground text-center">
                    {formatTableDate(l.log_date)}
                  </TableCell>
                  <TableCell colSpan={categories.length + 1}>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border",
                          isWeekendRow
                            ? "bg-muted/40 text-muted-foreground border-border/50"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20",
                        )}
                      >
                        <BedDouble className="size-3" />
                        <span>{isWeekendRow ? "Weekend" : "Off Day"}</span>
                      </span>
                      {l.notes && (
                        <span className="text-xs text-muted-foreground italic truncate max-w-[200px] sm:max-w-xs">
                          &ldquo;{l.notes}&rdquo;
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow
                  key={l.id}
                  className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <TableCell className="tabular-nums font-mono text-xs font-medium text-foreground text-center">
                    {formatTableDate(l.log_date)}
                  </TableCell>
                  {categories.map((c) => {
                    const v = (l.counts ?? {})[c.key] ?? 0;
                    return (
                      <TableCell key={c.key} className="text-center tabular-nums font-mono text-xs">
                        {v > 0 ? (
                          <span className="font-semibold text-foreground">{v}</span>
                        ) : (
                          <span className="text-muted-foreground/40" aria-hidden="true">
                            {"—"}
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center tabular-nums">
                    <span className="font-mono font-bold text-xs text-primary">{rowTotal}</span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalTablePages > 1 && (
        <div className="border-t border-border/40 px-4 sm:px-5 py-3 flex flex-wrap items-center justify-center sm:justify-between gap-2 bg-muted/[0.04]">
          <span className="text-xs text-muted-foreground font-mono font-medium">
            Showing {(tablePage - 1) * TABLE_PAGE_SIZE + 1}–{Math.min(tablePage * TABLE_PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length} records
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 hover:bg-muted text-foreground border border-border/40 rounded-lg active:scale-95 transition-all"
              onClick={() => onPageChange(Math.max(1, tablePage - 1))}
              disabled={tablePage === 1}
            >
              <ChevronLeft className="size-4" />
            </Button>
            {tablePageNumbers.map((p, i) =>
              p === "…" ? (
                <span
                  key={`ellipsis-${tablePageNumbers[i + 1] ?? i}`}
                  className="w-8 text-center text-xs text-muted-foreground select-none"
                >
                  …
                </span>
              ) : (
                <Button
                  key={p}
                  variant={tablePage === p ? "default" : "ghost"}
                  size="icon"
                  className={cn(
                    "size-8 text-xs font-mono font-semibold rounded-lg active:scale-95 transition-all border",
                    tablePage === p
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                  onClick={() => onPageChange(p as number)}
                >
                  {p}
                </Button>
              ),
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-8 hover:bg-muted text-foreground border border-border/40 rounded-lg active:scale-95 transition-all"
              onClick={() => onPageChange(Math.min(totalTablePages, tablePage + 1))}
              disabled={tablePage === totalTablePages}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {workingLogs.length > 0 && (
        <div className="border-t border-border/40 px-5 py-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-mono text-muted-foreground bg-muted/20">
          <span>
            Total: <span className="font-bold text-foreground">{totalDocs}</span> docs
          </span>
          <span className="hidden sm:inline text-border">|</span>
          <span>
            Shifts: <span className="font-bold text-foreground">{workingLogs.length}</span>
          </span>
          <span className="hidden sm:inline text-border">|</span>
          <span>
            Speed: <span className="font-bold text-foreground">{avgPerDay}</span> docs/day
          </span>
          <span className="hidden sm:inline text-border">|</span>
          {categories.map((c) => {
            const val = workingLogs.reduce((s, l) => s + ((l.counts ?? {})[c.key] ?? 0), 0);
            return val > 0 ? (
              <span key={c.key} className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: colorForKey(c.key) }} />
                <span>
                  {c.short}: <span className="font-bold text-foreground">{val}</span>
                </span>
              </span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}
