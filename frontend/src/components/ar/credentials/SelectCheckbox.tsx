import { Check } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface SelectCheckboxProps {
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}

export function SelectCheckbox({ checked, onChange, ariaLabel, disabled, className }: SelectCheckboxProps) {
  return (
    <label className={cn("relative inline-grid size-4 shrink-0 place-items-center", disabled && "opacity-50", className)}>
      <input
        type="checkbox"
        aria-label={ariaLabel}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="peer absolute inset-0 size-4 cursor-pointer appearance-none rounded border border-border bg-background checked:border-emerald-600 checked:bg-emerald-600 disabled:cursor-not-allowed transition-[border-color,background-color]"
      />
      <Check className="size-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" strokeWidth={3} />
    </label>
  );
}
