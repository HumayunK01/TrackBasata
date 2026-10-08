import { lazy, Suspense, useMemo } from "react";
import { motion, type Easing } from "motion/react";
import { LineChart } from "@/components/ui/icons";
import Skeleton from "react-loading-skeleton";
import { useDailyLogs } from "@/hooks/useDailyLogs";
import { useCategories } from "@/hooks/useCategories";
import { useFaxResolvedByDay, FAX_CATEGORY_KEY, FAX_CATEGORY_LABEL } from "@/hooks/useFaxTracker";
import { useIndexableResolvedByDay, INDEXABLE_CATEGORY_KEY, INDEXABLE_CATEGORY_LABEL } from "@/hooks/useIndexableTracker";
import { isoDate, totalForLog } from "@/types/log";
import { colorForKey } from "@/lib/cat-colors";
import { FigHeader, Panel, CategoryStatCard, EmptyState } from "@/components/ar/industrial";

const Charts = lazy(() => import("@/components/ar/Charts").then((m) => ({ default: m.Charts })));

const sectionEase: Easing = [0.23, 1, 0.32, 1];

const Console = () => {
  const { data: logs = [], isLoading } = useDailyLogs();
  const { data: categories = [] } = useCategories();
  const { data: faxByDay = {} } = useFaxResolvedByDay();
  const { data: indexableByDay = {} } = useIndexableResolvedByDay();

  const stats = useMemo(() => {
    const today = isoDate();
    const working = logs.filter((l) => !l.is_off_day);
    const sortedWorking = [...working].sort((a, b) => a.log_date.localeCompare(b.log_date));
    const recent14 = sortedWorking.slice(-14);
    const todayLog = logs.find((l) => l.log_date === today);

    const categoryTotals = categories.map((c) => {
      const val = working.reduce((s, l) => s + ((l.counts ?? {})[c.key] ?? 0), 0);
      const sparkline = recent14.map((l) => (l.counts ?? {})[c.key] ?? 0);
      const todayCount = todayLog ? (todayLog.counts ?? {})[c.key] ?? 0 : 0;
      return {
        key: c.key,
        label: c.label,
        value: val,
        sparkline,
        todayCount,
      };
    });

    const faxTotal = Object.values(faxByDay).reduce((s, n) => s + n, 0);
    if (faxTotal > 0) {
      categoryTotals.push({
        key: FAX_CATEGORY_KEY,
        label: FAX_CATEGORY_LABEL,
        value: faxTotal,
        sparkline: recent14.map((l) => faxByDay[l.log_date] ?? 0),
        todayCount: faxByDay[today] ?? 0,
      });
    }

    const indexableTotal = Object.values(indexableByDay).reduce((s, n) => s + n, 0);
    if (indexableTotal > 0) {
      categoryTotals.push({
        key: INDEXABLE_CATEGORY_KEY,
        label: INDEXABLE_CATEGORY_LABEL,
        value: indexableTotal,
        sparkline: recent14.map((l) => indexableByDay[l.log_date] ?? 0),
        todayCount: indexableByDay[today] ?? 0,
      });
    }

    const grandTotal = categoryTotals.reduce((s, c) => s + c.value, 0);
    const maxVal = Math.max(...categoryTotals.map((c) => c.value), 1);

    return {
      todayLog,
      todayTotal: todayLog ? totalForLog(todayLog) : 0,
      categoryTotals: categoryTotals.map((c) => ({
        ...c,
        share: grandTotal > 0 ? (c.value / grandTotal) * 100 : 0,
        relativeShare: (c.value / maxVal) * 100,
      })),
      workingCount: working.length,
    };
  }, [logs, categories, faxByDay, indexableByDay]);

  const isEmpty = !isLoading && logs.length === 0;

  return (
    <div className="flex flex-col min-h-full">
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6 relative z-[1]">
        <div className="w-full space-y-6 sm:space-y-8">

          {/* ── Category breakdown ── */}
          <section>
            <FigHeader title="Cumulative by Category" />
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(168px,1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(188px,1fr))]">
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-border bg-card p-4 sm:p-4.5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <Skeleton width={72} height={12} />
                        <Skeleton width={32} height={14} />
                      </div>
                      <div className="flex items-end justify-between pt-1">
                        <Skeleton width={56} height={28} />
                        <Skeleton width={54} height={24} />
                      </div>
                    </div>
                  ))
                  : [...stats.categoryTotals].sort((a, b) => b.value - a.value).map((c) => (
                    <CategoryStatCard
                      key={c.key}
                      label={c.label}
                      value={c.value}
                      color={colorForKey(c.key)}
                      share={c.share}
                      sparkline={c.sparkline}
                      todayCount={c.todayCount}
                    />
                  ))}
              </div>
          </section>

          {/* ── Charts ── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: sectionEase, delay: 0.1 }}
          >
            <FigHeader title="Trends & Breakdown" />
            {isLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Panel key={i} tag="CHART" className={i === 0 || i === 3 ? "lg:col-span-2" : ""}>
                    <Skeleton height={208} />
                  </Panel>
                ))}
              </div>
            ) : isEmpty ? (
              <Panel tag="CHART">
                <EmptyState
                  icon={LineChart}
                  title="No Trends Yet"
                  hint="Charts appear once you have logged days."
                />
              </Panel>
            ) : (
              <Suspense fallback={null}><Charts logs={logs} categories={categories} /></Suspense>
            )}
          </motion.section>

        </div>
      </main>
    </div>
  );
};

export default Console;

