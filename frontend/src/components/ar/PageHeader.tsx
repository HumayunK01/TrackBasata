import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Settings, Sun, Moon, LogOut, ChevronDown, SlidersHorizontal } from "@/components/ui/icons";
import { WhatsNewButton } from "@/components/ar/whats-new";
import { formatHeaderDate } from "@/types/log";

interface PageHeaderProps {
  subtitle?: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  now?: Date;
}

export function PageHeader({ subtitle, title, actions, now }: PageHeaderProps) {
  const date = now ?? new Date();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const [showSignOut, setShowSignOut] = useState(false);

  const email = user?.email ?? "";
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Phoenix Heart";
  const initials = [profile?.first_name?.[0], profile?.last_name?.[0]].filter(Boolean).join("").toUpperCase() || (name === "Phoenix Heart" ? "PH" : name.slice(0, 2).toUpperCase());

  return (
    <>
    <header className="sticky top-0 z-10 h-14 border-b border-border bg-sidebar shrink-0">
      <div className="h-full px-2 sm:px-4 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2.5 shrink-0 min-w-0">
          <SidebarTrigger className="shrink-0 h-9 w-9 text-foreground/85 hover:text-foreground bg-muted/40 dark:bg-white/[0.04] hover:bg-muted/70 dark:hover:bg-white/[0.08] border border-border/60 rounded-lg transition-all shadow-2xs [&_svg]:!size-[18px] flex items-center justify-center cursor-pointer" />

          <div className="h-4 w-px bg-border/60 mx-0.5 hidden sm:block shrink-0" />

          <div className="min-w-0 flex flex-col justify-center">
            {title && (
              <div className="flex items-center gap-2">
                <motion.h1
                  key={title}
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="text-[13px] sm:text-sm font-bold text-foreground tracking-tight leading-tight truncate"
                >
                  {title}
                </motion.h1>
                {subtitle && (
                  <span className="hidden md:inline-block text-[10px] font-medium text-muted-foreground/80 bg-muted/50 px-1.5 py-0.5 rounded border border-border/40 truncate">
                    {subtitle}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground tracking-normal mt-0.5">
              <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-mono text-[10.5px] truncate">{formatHeaderDate(date)}</span>
            </div>
            {!title && subtitle && (
              <h1 className="text-sm font-bold text-foreground truncate leading-tight">{subtitle}</h1>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {actions}

          {/* Grouped Header Utility Toolbar (Fixed h-9 height) */}
          <div className="h-9 flex items-center gap-1 bg-muted/40 dark:bg-white/[0.04] px-1.5 rounded-lg border border-border/60 backdrop-blur-xs">
            {/* What's New */}
            <WhatsNewButton className="h-7 w-7 rounded-md text-foreground/85 hover:text-foreground hover:bg-background/80 dark:hover:bg-white/10 transition-colors [&>svg]:size-[18px]" />

            {/* Dark / Light Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md text-foreground/85 hover:text-foreground hover:bg-background/80 dark:hover:bg-white/10 transition-colors [&>svg]:size-[18px]"
              onClick={toggle}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>

            {/* Settings */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md text-foreground/85 hover:text-foreground hover:bg-background/80 dark:hover:bg-white/10 transition-colors [&>svg]:size-[18px]"
              onClick={() => navigate("/settings")}
              title="Settings"
              aria-label="Settings"
            >
              <Settings />
            </Button>
          </div>

          <div className="h-4 w-px bg-border/60 mx-1 hidden sm:block" />

          {/* Unified User Profile Dropdown Pill (Matching h-9 height) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-9 group flex items-center gap-2 px-2.5 rounded-xl border border-border/60 bg-muted/30 dark:bg-white/[0.03] hover:bg-muted/70 dark:hover:bg-white/[0.08] hover:border-border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                aria-label={`User profile for ${name}`}
              >
                <div className="size-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                  {initials}
                </div>
                <span className="hidden md:inline-block text-xs font-semibold text-foreground tracking-tight max-w-[130px] truncate group-hover:text-foreground transition-colors">
                  {name}
                </span>
                <ChevronDown className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-2xl border border-border/70 bg-card/95 backdrop-blur-xl p-1.5 shadow-2xl space-y-1 font-sans">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 border border-border/40">
                <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center justify-center shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground truncate">{name}</p>
                  <p className="text-[11px] font-mono text-muted-foreground truncate">{email || "No email"}</p>
                </div>
              </div>

              <DropdownMenuSeparator className="my-1 border-border/50" />

              <DropdownMenuItem
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-muted/70 focus:bg-muted/70 cursor-pointer transition-colors"
                onClick={() => navigate("/settings")}
              >
                <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <SlidersHorizontal className="size-3.5" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block truncate">Settings & Preferences</span>
                  <span className="block text-[10px] text-muted-foreground font-normal">Profile, categories & timezone</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1 border-border/50" />

              <DropdownMenuItem
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 focus:bg-destructive/10 cursor-pointer transition-colors"
                onClick={() => setShowSignOut(true)}
              >
                <div className="size-7 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                  <LogOut className="size-3.5" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block truncate">Sign out</span>
                  <span className="block text-[10px] text-muted-foreground font-normal">End your current session</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
      {/* Redesigned Sign out Confirmation Modal */}
      <AlertDialog open={showSignOut} onOpenChange={setShowSignOut}>
        <AlertDialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border border-border/70 rounded-2xl p-6 shadow-2xl">
          <AlertDialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-destructive/10 flex items-center justify-center shrink-0 text-destructive shadow-2xs">
                <LogOut className="size-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-lg font-bold tracking-tight text-foreground">
                  Sign out of Basata?
                </AlertDialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">End your active session on this workstation</p>
              </div>
            </div>

            <AlertDialogDescription className="space-y-3 pt-1 text-sm text-foreground">
              <span className="block text-xs sm:text-sm text-muted-foreground leading-relaxed">
                You will be returned to the login screen and will need your credentials to access your daily tracker and records again.
              </span>

              {email && (
                <span className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-muted/40 border border-border/50 text-xs font-mono text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="truncate">{email}</span>
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="gap-2 sm:gap-0 pt-3">
            <AlertDialogCancel className="rounded-xl border-border/70 hover:bg-muted/70 font-semibold h-9.5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold shadow-xs shadow-destructive/20 h-9.5 px-5 cursor-pointer active:scale-[0.98] gap-1.5"
              onClick={() => signOut()}
            >
              <LogOut className="size-4" />
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
