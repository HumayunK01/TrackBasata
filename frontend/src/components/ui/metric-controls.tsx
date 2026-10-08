import { BarChart2, TrendingUp } from "@/components/ui/icons";
import { type ChartView } from "./metric-chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export interface PeriodOption {
  label: string;
  points?: number;
}

export interface PeriodSelectProps {
  value: string;
  options: PeriodOption[];
  onChange: (option: PeriodOption) => void;
  accentText?: string;
}

export function PeriodSelect({
  value,
  options,
  onChange,
}: PeriodSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(val) => {
        const found = options.find((opt) => opt.label === val);
        if (found) onChange(found);
      }}
    >
      <SelectTrigger className="h-7 w-[120px] rounded-lg border-border bg-background/50 text-xs text-muted-foreground backdrop-blur-sm">
        <SelectValue placeholder="Period" />
      </SelectTrigger>
      <SelectContent align="end">
        {options.map((opt) => (
          <SelectItem key={opt.label} value={opt.label} className="text-xs">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export interface ViewToggleProps {
  value: ChartView;
  onChange: (view: ChartView) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={() => onChange("curve")}
        className={`h-6 w-6 rounded-md p-0 ${
          value === "curve"
            ? "bg-background shadow-xs text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="Curve view"
      >
        <TrendingUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={() => onChange("bars")}
        className={`h-6 w-6 rounded-md p-0 ${
          value === "bars"
            ? "bg-background shadow-xs text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="Bar view"
      >
        <BarChart2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
