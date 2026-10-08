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
  stiffness: 380,
  damping: 30,
  mass: 0.8,
};

export function AppSidebar() {
  const { isMobile, setOpenMobile, state } = useSidebar();
  const location = useLocation();
  const reduce = useReducedMotion();
  const isAdmin = useIsAdmin();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar select-none">
      {/* Sidebar Header with Brand Logo */}
      <SidebarHeader className="h-14 flex flex-row items-center justify-center px-4 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:h-14 relative">
        <Link
          to="/console"
          className="flex items-center justify-center group-data-[collapsible=icon]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
        >
          <AppLogo className="h-10 w-auto max-w-[160px] object-contain" />
        </Link>
        <Link
          to="/console"
          className="hidden group-data-[collapsible=icon]:flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1.5 hover:bg-muted/50 transition-colors size-9"
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
      <SidebarContent className="py-2.5 px-2 group-data-[collapsible=icon]:px-1.5 group-data-[collapsible=icon]:py-2">
        {buildGroups(isAdmin).map((group, groupIdx) => (
          <div key={group.label} className="group-data-[collapsible=icon]:mb-0">
            {groupIdx > 0 && (
              <div className="hidden group-data-[collapsible=icon]:block my-2 mx-auto w-5 h-px bg-border/60" />
            )}
            <div className="flex items-center justify-between px-2.5 pb-1.5 group-data-[collapsible=icon]:hidden">
              <span className="text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
                {group.label}
              </span>
            </div>

            <SidebarMenu className="gap-1 group-data-[collapsible=icon]:gap-1">
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
                        className="absolute inset-0 rounded-lg bg-accent/80 dark:bg-white/[0.08] shadow-xs dark:border dark:border-white/10 pointer-events-none z-0 overflow-hidden"
                        transition={reduce ? { duration: 0 } : activeSpringTransition}
                      >
                        <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary group-data-[collapsible=icon]:hidden" />
                      </motion.div>
                    )}
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className={cn(
                        "relative z-10 h-9 w-full rounded-lg px-2.5 font-medium text-[13px] transition-colors duration-150",
                        "text-foreground/85 hover:text-foreground hover:bg-muted/50 dark:hover:bg-white/[0.04]",
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
                            "size-[18px] shrink-0 transition-colors duration-200",
                            active
                              ? "text-primary dark:text-emerald-400"
                              : "text-foreground/80 dark:text-zinc-300 group-hover:text-foreground",
                          )}
                        />
                        <span className="truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
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
          <div className="hidden group-data-[collapsible=icon]:block my-2 mx-auto w-5 h-px bg-border/60" />
          <div className="flex items-center justify-between px-2.5 pb-1.5 group-data-[collapsible=icon]:hidden">
            <span className="text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
              Resources
            </span>
          </div>

          <SidebarMenu className="gap-1 group-data-[collapsible=icon]:gap-1">
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
                      className="absolute inset-0 rounded-lg bg-accent/80 dark:bg-white/[0.08] shadow-xs dark:border dark:border-white/10 pointer-events-none z-0 overflow-hidden"
                      transition={reduce ? { duration: 0 } : activeSpringTransition}
                    >
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary group-data-[collapsible=icon]:hidden" />
                    </motion.div>
                  )}
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    tooltip={link.title}
                    className={cn(
                      "relative z-10 h-9 w-full rounded-lg px-2.5 font-medium text-[13px] transition-colors duration-150",
                      "text-foreground/85 hover:text-foreground hover:bg-muted/50 dark:hover:bg-white/[0.04]",
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
                          "size-[18px] shrink-0 transition-colors duration-200",
                          active
                            ? "text-primary dark:text-emerald-400"
                            : "text-foreground/80 dark:text-zinc-300 group-hover:text-foreground",
                        )}
                      />
                      <span className="truncate flex-1 group-data-[collapsible=icon]:hidden" title={link.title}>
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
      <SidebarFooter className="p-2 group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:py-2 border-t border-sidebar-border/60 flex items-center justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "rounded-lg border border-border/50 bg-card/60 dark:bg-muted/20 p-2.5 transition-colors cursor-default w-full",
                "group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center",
              )}
            >
              <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center w-full">
                <div className="flex items-center gap-2 group-data-[collapsible=icon]:gap-0">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-[11px] font-medium text-foreground/80 tracking-tight group-data-[collapsible=icon]:hidden">
                    Operational
                  </span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted/80 border border-border/50 group-data-[collapsible=icon]:hidden select-none">
                  {APP_VERSION}
                </span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" align="center" hidden={state !== "collapsed"}>
            Operational • {APP_VERSION}
          </TooltipContent>
        </Tooltip>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
