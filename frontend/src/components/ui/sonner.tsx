import type { CSSProperties } from "react";
import { Toaster as Sonner } from "sonner";
import { AlertCircle, AlertTriangle, Check, Info, Loader2, X } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-right"
      offset={20}
      mobileOffset={14}
      gap={10}
      duration={2800}
      visibleToasts={4}
      closeButton
      className="toaster group"
      style={{ "--width": "332px" } as CSSProperties}
      icons={{
        success: (
          <span className="size-6 rounded-lg bg-emerald-500/12 dark:bg-emerald-500/18 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Check className="size-3.5" strokeWidth={2.4} />
          </span>
        ),
        info: (
          <span className="size-6 rounded-lg bg-slate-500/10 dark:bg-white/[0.08] border border-slate-400/25 dark:border-white/[0.12] flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0">
            <Info className="size-3.5" strokeWidth={2.1} />
          </span>
        ),
        warning: (
          <span className="size-6 rounded-lg bg-amber-500/12 dark:bg-amber-500/18 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <AlertTriangle className="size-3.5" strokeWidth={2.1} />
          </span>
        ),
        error: (
          <span className="size-6 rounded-lg bg-destructive/12 dark:bg-destructive/18 border border-destructive/25 flex items-center justify-center text-destructive shrink-0">
            <AlertCircle className="size-3.5" strokeWidth={2.1} />
          </span>
        ),
        loading: (
          <span className="size-6 rounded-lg bg-primary/12 border border-primary/25 flex items-center justify-center text-primary shrink-0">
            <Loader2 className="size-3.5 animate-spin" strokeWidth={2.2} />
          </span>
        ),
        close: <X className="size-3.5" strokeWidth={2} />,
      }}
      toastOptions={{
        classNames: {
          toast: "group toast font-sans",
          title: "text-[13px] font-semibold tracking-[-0.01em] text-foreground leading-snug",
          description: "text-xs text-muted-foreground leading-relaxed",
          actionButton:
            "bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg px-2.5 h-7",
          cancelButton:
            "bg-muted hover:bg-muted/80 text-foreground text-xs font-medium rounded-lg px-2.5 h-7",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
