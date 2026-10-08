import { Suspense, useEffect } from "react";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { SkeletonTheme } from "react-loading-skeleton";
import { toast } from "sonner";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthGuard } from "@/components/ar/AuthGuard";
import { AppLayout } from "@/components/ar/AppLayout";
import { ThemeProvider } from "@/components/ar/ThemeProvider";
import {
  ConsolePage,
  DailyLogPage,
  SettingsPage,
  ReportPage,
  CounterPage,
  FaxTrackerPage,
  VaultPage,
  TeamPage,
  FacilitiesPage,
  ScenariosPage,
  ResourcePage,
  NotFound,
} from "@/lib/routePreload";
import { initQueryPersistence } from "@/lib/queryPersister";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is per-user and changes slowly; avoid refetching everything on
      // every window refocus. Queries that need tighter sync (e.g. daily_logs
      // cross-device polling) override this locally.
      staleTime: 60_000,
      gcTime: 1000 * 60 * 60 * 24, // keep cached for 24h to support offline/revisit hydration
    },
  },
  // Mutations already toast their own errors in the hooks; queries previously
  // failed silently, so surface those here. The fixed id dedupes the toast
  // when several queries fail at once (e.g. network drop).
  queryCache: new QueryCache({
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast.error(`Failed to load data: ${message}`, { id: "query-error" });
    },
  }),
});

initQueryPersistence(queryClient);


const TITLES: Record<string, string> = {
  "/": "Console",
  "/console": "Console",
  "/log": "Daily Log",
  "/settings": "Settings",
  "/report": "Report",
  "/counter": "Counter",
  "/tracker": "Fax Tracker",
  "/fax-tracker": "Fax Tracker",
  "/vault": "Vault",
  "/team": "Team",
  "/facilities": "Facilities",
  "/scenarios": "Scenarios & SOP Guide",
  "/resources/cheat-sheet": "Cheat Sheet",
  "/resources/test-patients": "Labeling Guide",
};

// ponytail: title map keyed by route; new pages must add an entry here
const TitleSync = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = `${TITLES[pathname] ?? "Page Not Found"} · Basata.ai Tracker`;
  }, [pathname]);
  return null;
};

const App = () => (
  <ThemeProvider>
  <SkeletonTheme baseColor="hsl(var(--skeleton-base))" highlightColor="hsl(var(--skeleton-highlight))">
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SidebarProvider>
          <AuthGuard>
            <TitleSync />
            <Suspense
              fallback={
                <div className="flex-1 flex items-center justify-center text-sm text-foreground font-mono uppercase tracking-[0.2em]">
                  Loading…
                </div>
              }
            >
              <Routes>
                <Route element={<AppLayout><Outlet /></AppLayout>}>
                  <Route path="/" element={<Navigate to="/console" replace />} />
                  <Route path="/console" element={<ConsolePage />} />
                  <Route path="/log" element={<DailyLogPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/report" element={<ReportPage />} />
                  <Route path="/counter" element={<CounterPage />} />
                  <Route path="/tracker" element={<FaxTrackerPage />} />
                  {/* Legacy path — the page now hosts both Fax and Indexable */}
                  <Route path="/fax-tracker" element={<FaxTrackerPage />} />
                  <Route path="/vault" element={<VaultPage />} />
                  <Route path="/team" element={<TeamPage />} />
                  <Route path="/facilities" element={<FacilitiesPage />} />
                  <Route path="/scenarios" element={<ScenariosPage />} />
                  <Route path="/resources/:docId" element={<ResourcePage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthGuard>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </SkeletonTheme>
  </ThemeProvider>
);

export default App;
