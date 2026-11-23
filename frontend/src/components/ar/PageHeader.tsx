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
import { Settings, Sun, Moon, LogOut, ChevronDown, SlidersHorizontal, Search } from "@/components/ui/icons";
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
      <header className="sticky top-0 z-20 h-14 border-b border-sidebar-border/40 bg-sidebar/85 backdrop-blur-xl shrink-0 select-none">
        <div className="h-full px-2.5 sm:px-4 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left Context: Sidebar Toggle & Page Title */}
          <div className="flex items-center gap-3 shrink-0 min-w-0">
            <SidebarTrigger className="shrink-0 size-9 rounded-xl text-foreground/80 hover:text-foreground hover:bg-muted/70 dark:hover:bg-white/[0.07] active:scale-[0.95] transition-all [&_svg]:!size-[20px] flex items-center justify-center cursor-pointer shadow-none border-0" />

            <div className="min-w-0 flex flex-col justify-center">
              {title && (
                <div className="flex items-center gap-2">
                  <motion.h1
                    key={title}
                    initial={{ opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="text-sm sm:text-[15px] font-bold text-foreground tracking-tight leading-tight truncate"
                  >
                    {title}
                  </motion.h1>
                  {subtitle && (
                    <span className="hidden md:inline-block text-[10px] font-medium text-muted-foreground bg-muted/60 dark:bg-white/[0.04] px-1.5 py-0.5 rounded border border-border/60 dark:border-white/[0.06] truncate">
                      {subtitle}
                    </span>
                  )}
                </div>
              )}
              <div className="text-[11px] font-mono text-muted-foreground/70 tracking-tight mt-0.5 truncate select-none">
                {formatHeaderDate(date)}
              </div>
              {!title && subtitle && (
                <h1 className="text-sm font-bold text-foreground truncate leading-tight">{subtitle}</h1>
              )}
            </div>
          </div>

          {/* Right Actions & User Identity */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {actions}

            {/* Command Search Trigger */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              className="group h-9 px-2.5 sm:pl-3 sm:pr-2 sm:w-44 md:w-52 rounded-xl bg-card/85 dark:bg-white/[0.04] hover:bg-muted/70 dark:hover:bg-white/[0.08] border border-border/70 dark:border-white/[0.09] hover:border-border dark:hover:border-white/[0.16] shadow-2xs dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] active:scale-[0.98] transition-all duration-150 flex items-center justify-between gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              title="Quick Command Palette (⌘K / Ctrl+K)"
              aria-label="Open Command Palette"
            >
              <span className="flex items-center gap-2 min-w-0">
                <Search className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                <span className="hidden sm:inline-block text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors truncate">
                  Search…
                </span>
              </span>
              <kbd className="hidden sm:inline-flex items-center justify-center h-5 px-1.5 rounded-md font-mono text-[10px] font-medium text-muted-foreground/85 bg-muted/75 dark:bg-white/[0.07] border border-border/70 dark:border-white/[0.1] leading-none select-none shrink-0">
                ⌘K
              </kbd>
            </button>

            {/* Floating Utility Icons */}
            <div className="flex items-center gap-0.5">
              <WhatsNewButton className="size-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 dark:hover:bg-white/[0.07] active:scale-[0.95] transition-all [&_svg]:!size-[17px]" />

              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 dark:hover:bg-white/[0.07] active:scale-[0.95] transition-all [&_svg]:!size-[17px] cursor-pointer"
                onClick={toggle}
                title={theme === "dark" ? "Light mode" : "Dark mode"}
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? <Sun className="size-[17px]" /> : <Moon className="size-[17px]" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 dark:hover:bg-white/[0.07] active:scale-[0.95] transition-all [&_svg]:!size-[17px] cursor-pointer"
                onClick={() => navigate("/settings")}
                title="Settings"
                aria-label="Settings"
              >
                <Settings className="size-[17px]" />
              </Button>
            </div>

            <div className="hidden sm:block h-4 w-px bg-border/60 dark:bg-white/[0.08] mx-0.5" aria-hidden="true" />

            {/* User Profile Trigger */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-9 group flex items-center gap-2 pl-1.5 pr-2.5 rounded-xl bg-card/85 dark:bg-white/[0.04] hover:bg-muted/70 dark:hover:bg-white/[0.08] data-[state=open]:bg-muted/80 dark:data-[state=open]:bg-white/[0.09] border border-border/70 dark:border-white/[0.09] hover:border-border dark:hover:border-white/[0.16] shadow-2xs dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 active:scale-[0.98]"
                  aria-label={`User profile for ${name}`}
                >
                  <div className="size-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                    {initials}
                  </div>
                  <span className="hidden md:inline-block text-xs font-semibold text-foreground/95 group-hover:text-foreground tracking-tight max-w-[130px] truncate">
                    {name}
                  </span>
                  <ChevronDown className="size-3.5 text-muted-foreground/75 group-hover:text-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-64 rounded-2xl border border-border/60 dark:border-white/10 bg-card/95 backdrop-blur-xl p-1.5 shadow-2xl font-sans"
              >
                {/* User Identity Header */}
                <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg">
                  <div className="size-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-foreground truncate">{name}</p>
                      {profile?.role === "admin" && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-muted-foreground/80 truncate mt-0.5">{email || "No email"}</p>
                  </div>
                </div>

                <DropdownMenuSeparator className="my-1 border-border/40" />

                {/* Settings & Preferences */}
                <DropdownMenuItem
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-foreground/90 hover:text-foreground hover:bg-muted/60 dark:hover:bg-white/[0.06] focus:bg-muted/60 dark:focus:bg-white/[0.06] cursor-pointer transition-colors group"
                  onClick={() => navigate("/settings")}
                >
                  <SlidersHorizontal className="size-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" strokeWidth={1.75} />
                  <span className="flex-1 truncate">Settings &amp; Preferences</span>
                  <span className="text-[10px] font-mono text-muted-foreground/60 select-none">⌘,</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1 border-border/40" />

                {/* Sign Out */}
                <DropdownMenuItem
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 focus:bg-destructive/10 cursor-pointer transition-colors group"
                  onClick={() => setShowSignOut(true)}
                >
                  <LogOut className="size-4 text-destructive/80 group-hover:text-destructive transition-colors shrink-0" strokeWidth={1.75} />
                  <span className="flex-1 truncate font-semibold">Sign out</span>
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
