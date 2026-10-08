import { Link, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { CalendarDays, LayoutDashboard, FileBarChart, Hash, Send } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { prefetchRoute } from "@/lib/routePreload";

const tabs = [
  { title: "Console", icon: LayoutDashboard, path: "/console" },
  { title: "Daily Log", icon: CalendarDays, path: "/log" },
  { title: "Counter", icon: Hash, path: "/counter" },
  { title: "Tracker", icon: Send, path: "/tracker" },
  { title: "Report", icon: FileBarChart, path: "/report" },
];

export function MobileTabBar() {
  const location = useLocation();
  const reduce = useReducedMotion();

  return (
    <nav
      className="md:hidden shrink-0 bg-card/90 backdrop-blur-lg border-t border-border/60 pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <div className="flex items-stretch">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              onPointerDown={() => prefetchRoute(tab.path)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-14 touch-manipulation transition-colors",
                active ? "text-primary" : "text-foreground hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="tab-active"
                  className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary"
                  transition={reduce ? { duration: 0 } : {
                    type: "spring",
                    stiffness: 500,
                    damping: 35,
                  }}
                />
              )}
              <tab.icon className={cn("size-5 transition-transform", active && "scale-105")} strokeWidth={active ? 2.5 : 1.75} />
              <span className={cn("text-[10px] leading-none mt-0.5", active ? "font-semibold" : "font-medium")}>
                {tab.title}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
