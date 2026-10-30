import { Link, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  CalendarDays,
  LayoutDashboard,
  FileBarChart,
  Hash,
  X,
  BookOpen,
  Tags,
  Send,
  KeyRound,
  Users,
  Building2,
  HelpCircle,
} from "@/components/ui/icons";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsAdmin } from "@/hooks/useProfile";
import { AppLogo } from "@/components/ar/AppLogo";
import { AppFavicon } from "@/components/ar/AppFavicon";
import { cn } from "@/lib/utils";
import { prefetchRoute } from "@/lib/routePreload";
import { APP_VERSION } from "@/lib/version";

function buildGroups(isAdmin: boolean) {
  return [
    {
      label: "Dashboards",
      items: [
        { title: "Console", icon: LayoutDashboard, path: "/console" },
        { title: "Report", icon: FileBarChart, path: "/report" },
        { title: "Facilities", icon: Building2, path: "/facilities" },
        ...(isAdmin ? [{ title: "Team", icon: Users, path: "/team" }] : []),
      ],
    },
    {
      label: "Documents",
      items: [
        { title: "Daily Log", icon: CalendarDays, path: "/log" },
        { title: "Counter", icon: Hash, path: "/counter" },
        { title: "Tracker", icon: Send, path: "/tracker" },
        { title: "Vault", icon: KeyRound, path: "/vault" },
      ],
    },
  ];
}

const externalLinks = [
  {
    title: "Scenarios Guide",
    icon: HelpCircle,
    path: "/scenarios",
  },
  {
    title: "Cheat Sheet",
    icon: BookOpen,
    path: "/resources/cheat-sheet",
  },
  {
    title: "Labeling Guide",
    icon: Tags,
    path: "/resources/test-patients",
  },
];

const activeSpringTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 32,
  mass: 0.8,
};

export function AppSidebar() {
  const { isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const reduce = useReducedMotion();
  const isAdmin = useIsAdmin();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/50 bg-sidebar select-none">
      {/* Sidebar Header with Brand Identity */}
      <SidebarHeader className="h-14 flex flex-row items-center justify-center px-4 group-data-[collapsible=icon]:px-0 border-b border-sidebar-border/40 shrink-0 relative">
        <Link
          to="/console"
          className="flex items-center justify-center group-data-[collapsible=icon]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg transition-opacity hover:opacity-90"
        >
          <AppLogo className="h-8.5 w-auto max-w-[145px] object-contain" />
        </Link>
        <Link
          to="/console"
          className="hidden group-data-[collapsible=icon]:flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl p-1.5 hover:bg-white/[0.06] transition-all size-9"
          title="Basata.ai Tracker"
        >
          <AppFavicon
            alt="Basata.ai"
            className="size-7 object-contain transition-transform duration-200 hover:scale-110"
          />
        </Link>
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-1/2 -translate-y-1/2 size-8 text-foreground/80 hover:text-foreground shrink-0 rounded-lg hover:bg-muted"
            onClick={() => setOpenMobile(false)}
            aria-label="Close menu"
          >
            <X className="size-4.5" />
          </Button>
        )}
      </SidebarHeader>

      {/* Main Navigation Content */}
      <SidebarContent className="py-2 px-2.5 space-y-1.5 group-data-[collapsible=icon]:px-1.5 group-data-[collapsible=icon]:py-1.5 group-data-[collapsible=icon]:space-y-1">
        {buildGroups(isAdmin).map((group, groupIdx) => (
          <div key={group.label} className="group-data-[collapsible=icon]:mb-0">
            {groupIdx > 0 && (
              <div className="hidden group-data-[collapsible=icon]:block my-1.5 mx-auto w-5 h-px bg-border/40" />
            )}
            <div className={cn("px-2.5 pb-1 group-data-[collapsible=icon]:hidden", groupIdx === 0 ? "pt-0.5" : "pt-1.5")}>
              <span className="text-[10px] font-bold tracking-[0.08em] text-muted-foreground/60 uppercase select-none font-mono">
                {group.label}
              </span>
            </div>

            <SidebarMenu className="gap-0.5 group-data-[collapsible=icon]:gap-1">
              {group.items.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <SidebarMenuItem
                    key={item.path}
                    className="relative group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto"
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebar-active-pill"
                        className={cn(
                          "absolute inset-0 rounded-xl pointer-events-none z-0",
                          "bg-white/[0.08] dark:bg-white/[0.07]",
                          "border border-black/[0.04] dark:border-white/[0.08]",
                          "shadow-[0_1px_2px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.06)]",
                        )}
                        transition={reduce ? { duration: 0 } : activeSpringTransition}
                      />
                    )}
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className={cn(
                        "group/btn relative z-10 h-9 w-full rounded-xl px-2.5 font-medium text-[13px] transition-all duration-150 active:scale-[0.985]",
                        "text-muted-foreground/85 hover:text-foreground hover:bg-muted/40 dark:hover:bg-white/[0.04]",
                        active && [
                          "text-foreground font-semibold !bg-transparent data-[active=true]:!bg-transparent shadow-none border-transparent",
                        ],
                        "group-data-[collapsible=icon]:!size-9 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center",
                      )}
                    >
                      <Link
                        to={item.path}
                        onClick={() => isMobile && setOpenMobile(false)}
                        onMouseEnter={() => prefetchRoute(item.path)}
                        onFocus={() => prefetchRoute(item.path)}
                        className="flex items-center gap-2.5 w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:size-full"
                      >
                        <item.icon
                          className={cn(
                            "size-[18px] shrink-0 transition-all duration-200",
                            active
                              ? "text-emerald-500 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.35)] scale-100"
                              : "text-zinc-400 dark:text-zinc-400 group-hover/btn:text-foreground group-hover/btn:scale-105",
                          )}
                        />
                        <span className="truncate tracking-tight group-data-[collapsible=icon]:hidden">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </div>
        ))}

        {/* Resources Section */}
        <div className="group-data-[collapsible=icon]:mb-0">
          <div className="hidden group-data-[collapsible=icon]:block my-1.5 mx-auto w-5 h-px bg-border/40" />
          <div className="px-2.5 pt-1.5 pb-1 group-data-[collapsible=icon]:hidden">
            <span className="text-[10px] font-bold tracking-[0.08em] text-muted-foreground/60 uppercase select-none font-mono">
              Resources
            </span>
          </div>

          <SidebarMenu className="gap-0.5 group-data-[collapsible=icon]:gap-1">
            {externalLinks.map((link) => {
              const active = location.pathname === link.path;
              return (
                <SidebarMenuItem
                  key={link.path}
                  className="relative group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto"
                >
                  {active && (
                    <motion.div
                      layoutId="sidebar-active-pill"
                      className={cn(
                        "absolute inset-0 rounded-xl pointer-events-none z-0",
                        "bg-white/[0.08] dark:bg-white/[0.07]",
                        "border border-black/[0.04] dark:border-white/[0.08]",
                        "shadow-[0_1px_2px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.06)]",
                      )}
                      transition={reduce ? { duration: 0 } : activeSpringTransition}
                    />
                  )}
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    tooltip={link.title}
                    className={cn(
                      "group/btn relative z-10 h-9 w-full rounded-xl px-2.5 font-medium text-[13px] transition-all duration-150 active:scale-[0.985]",
                      "text-muted-foreground/85 hover:text-foreground hover:bg-muted/40 dark:hover:bg-white/[0.04]",
                      active && [
                        "text-foreground font-semibold !bg-transparent data-[active=true]:!bg-transparent shadow-none border-transparent",
                      ],
                      "group-data-[collapsible=icon]:!size-9 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center",
                    )}
                  >
                    <Link
                      to={link.path}
                      onClick={() => isMobile && setOpenMobile(false)}
                      onMouseEnter={() => prefetchRoute(link.path)}
                      onFocus={() => prefetchRoute(link.path)}
                      className="flex items-center gap-2.5 w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:size-full"
                    >
                      <link.icon
                        className={cn(
                          "size-[18px] shrink-0 transition-all duration-200",
                          active
                            ? "text-emerald-500 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.35)] scale-100"
                            : "text-zinc-400 dark:text-zinc-400 group-hover/btn:text-foreground group-hover/btn:scale-105",
                        )}
                      />
                      <span className="truncate flex-1 tracking-tight group-data-[collapsible=icon]:hidden" title={link.title}>
                        {link.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </div>
      </SidebarContent>

      {/* Modern Status & Version Footer */}
      <SidebarFooter className="p-2 group-data-[collapsible=icon]:p-1.5 border-t border-sidebar-border/40 shrink-0">
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white/[0.02] dark:bg-white/[0.02] border border-border/40 w-full group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center">
          {/* Expanded view */}
          <div className="flex items-center gap-2 min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="relative flex size-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
            </span>
            <span className="text-[11px] font-medium text-muted-foreground/80 tracking-tight truncate select-none">
              Operational
            </span>
          </div>

          <span className="font-mono text-[10px] font-medium text-muted-foreground/60 bg-muted/40 dark:bg-white/[0.04] px-1.5 py-0.5 rounded-md border border-border/40 select-none group-data-[collapsible=icon]:hidden">
            {APP_VERSION}
          </span>

          {/* Collapsed view icon */}
          <div className="hidden group-data-[collapsible=icon]:flex">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="size-9 rounded-xl flex items-center justify-center hover:bg-white/[0.06] transition-colors cursor-default">
                  <span className="relative flex size-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex rounded-full size-2 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" align="center">
                Operational • {APP_VERSION}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
