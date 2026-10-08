import { ChevronLeft, ChevronRight } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  pageNumbers: (number | "…")[];
  onPageChange: (p: number) => void;
  /** When set, shows "Showing X–Y of Z" label */
  total?: number;
  pageSize?: number;
  entityLabel?: string;
  showFirstLast?: boolean;
  itemsPerPage?: number;
  onItemsPerPageChange?: (n: number) => void;
}

export function Pagination({
  page,
  totalPages,
  pageNumbers,
  onPageChange,
  total,
  pageSize,
  entityLabel = "patients",
  showFirstLast = false,
  itemsPerPage,
  onItemsPerPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const prev = () => onPageChange(Math.max(1, page - 1));
  const next = () => onPageChange(Math.min(totalPages, page + 1));

  return (
    <div className={cn(
      "flex flex-wrap items-center gap-2",
      total != null
        ? "border-t border-border/60 px-4 sm:px-5 py-3 justify-center sm:justify-between bg-transparent"
        : "shrink-0 py-1.5 relative justify-center",
    )}>
      {total != null && pageSize != null && (
        <span className="text-xs text-muted-foreground font-normal">
          Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} {entityLabel}
        </span>
      )}

      <div className="flex items-center gap-1.5">
        {showFirstLast && (
          <Button
            size="sm"
            className="hidden sm:inline-flex h-8 px-3 text-xs rounded-md bg-sidebar border border-border text-muted-foreground hover:text-foreground hover:bg-muted [html.dark[data-theme-variant=modern]_&]:bg-[#253041] [html.dark[data-theme-variant=modern]_&]:hover:bg-[#384152] [html.light[data-theme-variant=modern]_&]:bg-white [html.light[data-theme-variant=modern]_&]:text-slate-700 [html.light[data-theme-variant=modern]_&]:hover:bg-slate-50 [html.light[data-theme-variant=modern]_&]:border-slate-200"
            onClick={() => onPageChange(1)}
            disabled={page === 1}
          >
            First
          </Button>
        )}
        <Button
          size="icon"
          className="size-8 rounded-md bg-sidebar border border-border text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 disabled:opacity-40 [html.dark[data-theme-variant=modern]_&]:bg-[#253041] [html.dark[data-theme-variant=modern]_&]:hover:bg-[#384152] [html.light[data-theme-variant=modern]_&]:bg-white [html.light[data-theme-variant=modern]_&]:text-slate-700 [html.light[data-theme-variant=modern]_&]:hover:bg-slate-50 [html.light[data-theme-variant=modern]_&]:border-slate-200"
          onClick={prev}
          disabled={page === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>
        {pageNumbers.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${pageNumbers[i + 1] ?? i}`} className="w-8 text-center text-xs text-muted-foreground select-none">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={page === p ? "default" : "ghost"}
              size="icon"
              className={cn(
                "size-8 text-xs font-medium rounded-md border active:scale-95",
                page === p
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-sidebar border-border text-muted-foreground hover:text-foreground hover:bg-muted [html.dark[data-theme-variant=modern]_&]:bg-[#253041] [html.dark[data-theme-variant=modern]_&]:hover:bg-[#384152] [html.light[data-theme-variant=modern]_&]:bg-white [html.light[data-theme-variant=modern]_&]:text-slate-700 [html.light[data-theme-variant=modern]_&]:hover:bg-slate-50 [html.light[data-theme-variant=modern]_&]:border-slate-200",
              )}
              onClick={() => onPageChange(p as number)}
            >
              {p}
            </Button>
          ),
        )}
        <Button
          size="icon"
          className="size-8 rounded-md bg-sidebar border border-border text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 disabled:opacity-40 [html.dark[data-theme-variant=modern]_&]:bg-[#253041] [html.dark[data-theme-variant=modern]_&]:hover:bg-[#384152] [html.light[data-theme-variant=modern]_&]:bg-white [html.light[data-theme-variant=modern]_&]:text-slate-700 [html.light[data-theme-variant=modern]_&]:hover:bg-slate-50 [html.light[data-theme-variant=modern]_&]:border-slate-200"
          onClick={next}
          disabled={page === totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
        {showFirstLast && (
          <Button
            size="sm"
            className="hidden sm:inline-flex h-8 px-3 text-xs rounded-md bg-sidebar border border-border text-muted-foreground hover:text-foreground hover:bg-muted [html.dark[data-theme-variant=modern]_&]:bg-[#253041] [html.dark[data-theme-variant=modern]_&]:hover:bg-[#384152] [html.light[data-theme-variant=modern]_&]:bg-white [html.light[data-theme-variant=modern]_&]:text-slate-700 [html.light[data-theme-variant=modern]_&]:hover:bg-slate-50 [html.light[data-theme-variant=modern]_&]:border-slate-200"
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
          >
            Last
          </Button>
        )}
      </div>

      {onItemsPerPageChange != null && itemsPerPage != null && (
        <div className="sm:absolute sm:right-0 hidden md:flex items-center gap-2 text-xs text-muted-foreground">
          <span>Items per page</span>
          <Select value={String(itemsPerPage)} onValueChange={(v) => onItemsPerPageChange(Number(v))}>
            <SelectTrigger className="h-8 w-16 text-xs bg-sidebar border border-border text-foreground [html.dark[data-theme-variant=modern]_&]:bg-[#253041] [html.light[data-theme-variant=modern]_&]:bg-white [html.light[data-theme-variant=modern]_&]:text-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border [html.dark[data-theme-variant=modern]_&]:bg-[#202938] [html.light[data-theme-variant=modern]_&]:bg-white">
              {[10, 20, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
