import { AppLogo } from "@/components/ar/AppLogo";

interface AboutCardProps {
  categoriesCount: number;
  logsCount: number;
}

export function AboutCard({ categoriesCount, logsCount }: AboutCardProps) {
  return (
    <div className="bg-card border border-border rounded-md p-4 sm:p-5">
      <div className="space-y-4">
        <AppLogo className="h-7 sm:h-8 object-contain origin-left" />

        <div className="space-y-2 bg-muted/20 border border-border/40 rounded-md p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground font-medium">Version</span>
            <span className="font-mono bg-background/80 border border-border/60 text-foreground/95 px-2 py-0.5 rounded text-xs">1.2.0</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground font-medium">Categories</span>
            <span className="font-mono bg-background/80 border border-border/60 text-foreground/95 px-2 py-0.5 rounded text-xs">{categoriesCount} active</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground font-medium">Days logged</span>
            <span className="font-mono bg-background/80 border border-border/60 text-foreground/95 px-2 py-0.5 rounded text-xs">{logsCount} days</span>
          </div>
        </div>
      </div>
    </div>
  );
}
