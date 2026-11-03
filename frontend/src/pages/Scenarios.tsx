import { lazy, Suspense } from "react";
import { GitFork } from "@/components/ui/icons";
import Skeleton from "react-loading-skeleton";

const FlowchartsTab = lazy(() => import("@/components/ar/scenarios/FlowchartsTab"));

function TabSkeleton() {
  return (
    <div className="space-y-4 p-5 rounded-2xl border border-border/65 bg-card/80 shadow-2xs">
      <Skeleton height={36} width={280} className="rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Skeleton height={140} className="rounded-xl" />
        <Skeleton height={140} className="rounded-xl" />
      </div>
    </div>
  );
}

export default function ScenariosPage() {
  return (
    <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6 relative z-[1] [overscroll-behavior-y:contain]">
      <div className="w-full max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in">
        {/* Top Header Card */}
        <div className="bg-card/80 border border-border/65 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="size-9 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 grid place-items-center shrink-0">
                <GitFork className="size-4" />
              </span>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-heading">
                Inbox Process Guide
              </h1>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed sm:pl-11.5">
              Step-by-step intake guides for checking patient records in NextGen and Athena, splitting multi-patient files, routing to buckets, and faxback rules.
            </p>
          </div>
        </div>

        {/* Process Flowcharts Content with Suspense */}
        <Suspense fallback={<TabSkeleton />}>
          <FlowchartsTab />
        </Suspense>
      </div>
    </main>
  );
}
