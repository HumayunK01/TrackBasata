import { lazy, Suspense, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GitFork, Search, BookOpen } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import { cn } from "@/lib/utils";

type ViewMode = "flowcharts" | "pipeline-lookup" | "reference";

// Dynamic sub-tab imports: splits monolithic 96 KB bundle into on-demand chunks
const FlowchartsTab = lazy(() => import("@/components/ar/scenarios/FlowchartsTab"));
const PipelineLookupTab = lazy(() => import("@/components/ar/scenarios/PipelineLookupTab"));
const ReferenceTab = lazy(() => import("@/components/ar/scenarios/ReferenceTab"));

function TabSkeleton() {
  return (
    <div className="space-y-4 p-4 rounded-2xl border border-border/60 bg-card">
      <Skeleton height={36} width={280} className="rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Skeleton height={140} className="rounded-xl" />
        <Skeleton height={140} className="rounded-xl" />
      </div>
    </div>
  );
}

export default function ScenariosPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("flowcharts");

  return (
    <main className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-4 py-3 sm:py-4 bg-background">
      <div className="w-full space-y-4">
        {/* Top Header Card */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <GitFork className="size-4" />
              </span>
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground font-heading">
                Inbox Process Guide
              </h1>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Step-by-step intake guides for checking patient records in NextGen and Athena, splitting multi-patient files, routing to buckets, and faxback rules.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/70 self-start lg:self-auto overflow-x-auto shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("flowcharts")}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring",
                viewMode === "flowcharts"
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {viewMode === "flowcharts" && (
                <motion.div
                  layoutId="active-viewmode-pill"
                  className="absolute inset-0 bg-background rounded-lg shadow-2xs"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <GitFork className="size-3.5 text-primary" />
                <span>Process Flowcharts</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("pipeline-lookup")}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring",
                viewMode === "pipeline-lookup"
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {viewMode === "pipeline-lookup" && (
                <motion.div
                  layoutId="active-viewmode-pill"
                  className="absolute inset-0 bg-background rounded-lg shadow-2xs"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Search className="size-3.5 text-primary" />
                <span>Document Routing Lookup</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("reference")}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring",
                viewMode === "reference"
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {viewMode === "reference" && (
                <motion.div
                  layoutId="active-viewmode-pill"
                  className="absolute inset-0 bg-background rounded-lg shadow-2xs"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <BookOpen className="size-3.5 text-primary" />
                <span>Quick Reference</span>
              </span>
            </button>
          </div>
        </div>

        {/* Dynamic Sub-Tab Content with Suspense */}
        <Suspense fallback={<TabSkeleton />}>
          <AnimatePresence mode="wait" initial={false}>
            {viewMode === "flowcharts" && <FlowchartsTab key="flowcharts" />}
            {viewMode === "pipeline-lookup" && <PipelineLookupTab key="pipeline-lookup" />}
            {viewMode === "reference" && <ReferenceTab key="reference" />}
          </AnimatePresence>
        </Suspense>
      </div>
    </main>
  );
}
