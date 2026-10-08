import { Sun, Moon, Target, Loader2 } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/hooks/useTheme";
import { useState } from "react";
import { useUpdateDailyGoal } from "@/hooks/useProfile";
import { toast } from "sonner";

interface PreferencesCardProps {
  dailyGoal: number | null;
}

export function PreferencesCard({ dailyGoal }: PreferencesCardProps) {
  const { theme, toggle } = useTheme();
  const [goal, setGoal] = useState(dailyGoal ?? 50);
  const updateGoal = useUpdateDailyGoal();

  const handleSaveGoal = () => {
    const v = Math.max(0, Math.min(9999, goal || 0));
    updateGoal.mutate(v, {
      onSuccess: () => toast.success("Daily goal updated"),
    });
  };

  return (
    <div className="bg-card/90 backdrop-blur-md border border-border/70 rounded-2xl shadow-sm overflow-hidden transition-all">
      <div className="divide-y divide-border/60">
        {/* Daily Goal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="size-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
              <Target className="size-4.5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">Daily Document Goal</p>
              <p className="text-xs text-muted-foreground mt-0.5">Target production count displayed on your daily console and progress indicators</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 sm:ml-4">
            <Input
              type="number"
              min={0}
              max={9999}
              value={goal}
              onChange={(e) => setGoal(Number(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && handleSaveGoal()}
              className="w-24 h-9.5 text-sm font-semibold tabular-nums text-center rounded-xl bg-muted/40 border-border/60 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500/60"
            />
            <Button
              size="sm"
              className="h-9.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-xs shadow-emerald-600/20 active:scale-[0.98]"
              onClick={handleSaveGoal}
              disabled={updateGoal.isPending}
            >
              {updateGoal.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Set Goal
            </Button>
          </div>
        </div>

        {/* Dark / Light Theme */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="size-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-500">
              {theme === "dark" ? <Sun className="size-4.5" strokeWidth={1.75} /> : <Moon className="size-4.5" strokeWidth={1.75} />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">Color Mode</p>
              <p className="text-xs text-muted-foreground mt-0.5">Switch between dark obsidian workspace and high-contrast light mode</p>
            </div>
          </div>
          <div className="shrink-0 sm:ml-4">
            <Button
              variant="outline"
              size="sm"
              className="h-9.5 min-w-32 rounded-xl border-border/60 hover:bg-muted/70 font-semibold"
              onClick={toggle}
            >
              {theme === "dark" ? <Sun className="size-4 mr-1.5 text-amber-500" strokeWidth={1.75} /> : <Moon className="size-4 mr-1.5 text-amber-500" strokeWidth={1.75} />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
