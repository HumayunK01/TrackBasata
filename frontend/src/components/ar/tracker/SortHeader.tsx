import { ArrowUp, ArrowDown, ArrowUpDown } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export type SortKey = "patient_name" | "overall_status" | "updated_at" | "file_name" | "patient_dob";

export function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  align,
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" } | null;
  onSort: (key: SortKey) => void;
  align: "left" | "center";
}) {
  const active = sort?.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn(
        "inline-flex items-center gap-1.5 transition-colors uppercase tracking-wider font-mono text-2xs cursor-pointer select-none",
        align === "center" ? "mx-auto" : "",
        active ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground",
      )}
      title={`Sort by ${label.toLowerCase()}`}
    >
      <span>{label}</span>
      <Icon key={active ? sort.dir : "idle"} className={cn("size-3.5 shrink-0 animate-fade-in", active ? "opacity-100 text-primary" : "opacity-50")} />
    </button>
  );
}
