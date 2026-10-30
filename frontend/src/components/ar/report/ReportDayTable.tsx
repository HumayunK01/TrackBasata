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

function getWeekdayShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", { weekday: "short" });
}

export function ReportDayTable({
  filtered,
  categories,
  workingLogs,
  tablePage,
  totalTablePages,
  tablePageNumbers,
  paginatedRows,
  onPageChange,
}: ReportDayTableProps) {
  const maxDayTotal = Math.max(
    1,
    ...workingLogs.map((l) => totalForLog(l)),
  );

  return (
    <div className="rounded-2xl border border-border/65 bg-card/80 overflow-hidden shadow-2xs">
      <div className="overflow-x-auto no-scrollbar">
        <Table className="[&_td]:py-2.5 [&_th]:py-2.5 relative">
          <TableHeader className="bg-muted/35">
            <TableRow className="hover:bg-transparent border-b border-border/55">
              <TableHead className="pl-5 font-mono font-semibold text-[10px] uppercase tracking-wider text-muted-foreground text-left w-[200px]">
                Date
              </TableHead>
              {categories.map((c) => {
                const dotColor = c.key.startsWith("#") ? c.key : colorForKey(c.key);
                return (
                  <TableHead
                    key={c.key}
                    className="font-mono font-semibold text-[10px] uppercase tracking-wider text-right text-muted-foreground px-4"
                  >
                    <span className="inline-flex items-center justify-end gap-1.5">
                      <span
                        className="size-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: dotColor }}
                      />
                      <span>{c.short}</span>
                    </span>
                  </TableHead>
                );
              })}
              <TableHead className="pr-5 font-mono font-semibold text-[10px] uppercase tracking-wider text-right text-foreground w-[180px]">
                Total Output
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedRows.map((l) => {
              const rowTotal = totalForLog(l);
              const isWeekendRow = isWeekend(l.log_date);
              const weekday = getWeekdayShort(l.log_date);
              const barPct = Math.min(100, Math.round((rowTotal / maxDayTotal) * 100));

              return l.is_off_day ? (
                <TableRow
                  key={l.id}
                  className="border-b border-border/35 last:border-0 bg-muted/10 hover:bg-muted/15"
                >
                  <TableCell className="pl-5 tabular-nums font-mono text-xs text-muted-foreground">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 text-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground/75 border border-border/40 shrink-0">
                        {weekday}
                      </span>
                      <span>{formatTableDate(l.log_date)}</span>
                    </div>
                  </TableCell>
                  <TableCell colSpan={categories.length + 1} className="pr-5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border",
                            isWeekendRow
                              ? "bg-muted/40 text-muted-foreground border-border/50"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20",
                          )}
                        >
                          <BedDouble className="size-3" />
                          <span>{isWeekendRow ? "Weekend" : "Off Day"}</span>
                        </span>
                        {l.notes && (
                          <span className="text-xs text-muted-foreground italic truncate max-w-[220px] sm:max-w-xs">
                            &ldquo;{l.notes}&rdquo;
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-xs text-muted-foreground/40">—</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow
                  key={l.id}
                  className="border-b border-border/35 last:border-0 hover:bg-muted/25 transition-colors"
                >
                  <TableCell className="pl-5 tabular-nums font-mono text-xs font-medium text-foreground">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 text-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/45 shrink-0">
                        {weekday}
                      </span>
                      <span>{formatTableDate(l.log_date)}</span>
                    </div>
                  </TableCell>
                  {categories.map((c) => {
                    const v = (l.counts ?? {})[c.key] ?? 0;
                    return (
                      <TableCell
                        key={c.key}
                        className="text-right tabular-nums font-mono text-xs px-4"
                      >
                        {v > 0 ? (
                          <span className="font-medium text-foreground/90">{v.toLocaleString()}</span>
                        ) : (
                          <span className="text-muted-foreground/35" aria-hidden="true">
                            —
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="pr-5 text-right tabular-nums">
                    <div className="flex items-center justify-end gap-2.5">
                      <div className="hidden sm:flex w-16 h-1.5 rounded-full bg-muted/50 overflow-hidden justify-end">
                        <div
                          className="h-full rounded-full bg-emerald-500/75"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-xs text-emerald-500 dark:text-emerald-400 min-w-[2.25rem] text-right">
                        {rowTotal.toLocaleString()}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalTablePages > 1 && (
        <div className="border-t border-border/45 px-4 sm:px-5 py-2.5 flex flex-wrap items-center justify-center sm:justify-between gap-2 bg-muted/15">
          <span className="text-xs text-muted-foreground font-mono">
            Showing {(tablePage - 1) * TABLE_PAGE_SIZE + 1}–
            {Math.min(tablePage * TABLE_PAGE_SIZE, filtered.length)} of {filtered.length} days
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 hover:bg-muted text-foreground border border-border/40 rounded-lg active:scale-95 transition-all cursor-pointer"
              onClick={() => onPageChange(Math.max(1, tablePage - 1))}
              disabled={tablePage === 1}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            {tablePageNumbers.map((p, i) =>
              p === "…" ? (
                <span
                  key={`ellipsis-${tablePageNumbers[i + 1] ?? i}`}
                  className="w-7 text-center text-xs text-muted-foreground select-none"
                >
                  …
                </span>
              ) : (
                <Button
                  key={p}
                  variant={tablePage === p ? "default" : "ghost"}
                  size="icon"
                  className={cn(
                    "size-7 text-xs font-mono font-semibold rounded-lg active:scale-95 transition-all border cursor-pointer",
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
              className="size-7 hover:bg-muted text-foreground border border-border/40 rounded-lg active:scale-95 transition-all cursor-pointer"
              onClick={() => onPageChange(Math.min(totalTablePages, tablePage + 1))}
              disabled={tablePage === totalTablePages}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
