import { Dispatch } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  KeyRound,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Check,
  X,
  Eye,
  EyeOff,
  User,
  Pencil,
  Sparkles,
  Mail,
  Calendar,
  Lock,
} from "lucide-react";
import { APP_VERSION } from "@/lib/version";
import { cn } from "@/lib/utils";

export interface ProfileState {
  open: boolean;
  first_name: string;
  last_name: string;
  loading: boolean;
}

export type ProfileAction =
  | { type: "open"; first_name: string; last_name: string }
  | { type: "close" }
  | { type: "set"; patch: Partial<Pick<ProfileState, "first_name" | "last_name">> }
  | { type: "submitting" }
  | { type: "done" };

export interface PwState {
  open: boolean;
  next: string;
  confirm: string;
  loading: boolean;
  error: string;
  showPassword: boolean;
}

export type PwAction =
  | { type: "open" }
  | { type: "close" }
  | { type: "set"; patch: Partial<Pick<PwState, "next" | "confirm">> }
  | { type: "toggle_show" }
  | { type: "submitting" }
  | { type: "done"; error?: string };

interface ProfilePasswordCardProps {
  profile: { first_name?: string; last_name?: string; role?: "user" | "admin" } | null | undefined;
  profileState: ProfileState;
  pwState: PwState;
  profileDispatch: Dispatch<ProfileAction>;
  pwDispatch: Dispatch<PwAction>;
  onUpdateProfile: () => void;
  onChangePassword: () => void;
  email?: string;
  createdAt?: string;
  categoriesCount: number;
  logsCount: number;
}

const PASSWORD_RULES = [
  { label: "At least 6 characters", test: (p: string) => p.length >= 6 },
  { label: "Lowercase letter (a-z)", test: (p: string) => /[a-z]/.test(p) },
  { label: "Uppercase letter (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Number (0-9)", test: (p: string) => /[0-9]/.test(p) },
  { label: "Special symbol (!@#$)", test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|<>?,./`~]/.test(p) },
];

function getPasswordStrength(pw: string): { label: string; color: string; width: string; score: number } {
  if (!pw) return { label: "Enter password", color: "bg-muted", width: "0%", score: 0 };
  const passed = PASSWORD_RULES.filter((r) => r.test(pw)).length;
  if (pw.length < 6) return { label: "Too short", color: "bg-red-500", width: "15%", score: 1 };
  if (passed <= 2) return { label: "Weak", color: "bg-amber-500", width: "35%", score: 2 };
  if (passed <= 3) return { label: "Moderate", color: "bg-blue-500", width: "65%", score: 3 };
  if (passed <= 4) return { label: "Good", color: "bg-emerald-400", width: "85%", score: 4 };
  return { label: "Very Strong", color: "bg-emerald-500", width: "100%", score: 5 };
}

export function ProfilePasswordCard({
  profile,
  profileState,
  pwState,
  profileDispatch,
  pwDispatch,
  onUpdateProfile,
  onChangePassword,
  email,
  createdAt,
  categoriesCount,
  logsCount,
}: ProfilePasswordCardProps) {
  const initials = (() => {
    const f = profile?.first_name?.[0] ?? "";
    const l = profile?.last_name?.[0] ?? "";
    return ((f + l) || email?.[0] || "U").toUpperCase();
  })();

  const fullName = profile?.first_name || profile?.last_name
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
    : "Unset Name";

  const strength = getPasswordStrength(pwState.next);

  return (
    <div className="space-y-6">
      {/* ── Top Profile Overview Banner ── */}
      <div className="relative overflow-hidden bg-card/90 backdrop-blur-md border border-border/70 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="absolute top-0 right-0 w-80 h-32 bg-radial from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="size-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 font-bold text-xl shadow-inner font-heading">
                {initials}
              </div>
              <span className="absolute -bottom-1 -right-1 size-4 rounded-full bg-emerald-500 border-2 border-card ring-2 ring-emerald-500/20" title="Active Account" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-heading">{fullName}</h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="size-3" />
                  {profile?.role === "admin" ? "Administrator" : "AR Specialist"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono">
                <span className="flex items-center gap-1.5">
                  <Mail className="size-3.5 text-muted-foreground/80" />
                  {email || "No email linked"}
                </span>
                {createdAt && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-muted-foreground/80" />
                    Joined {new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
            <div className="flex-1 md:flex-initial flex flex-col items-center justify-center px-4 py-2.5 rounded-xl bg-muted/40 border border-border/60 min-w-[85px] sm:min-w-[100px]">
              <p className="text-lg sm:text-xl font-bold tabular-nums text-foreground leading-none font-mono">{categoriesCount}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mt-1.5">Categories</p>
            </div>
            <div className="flex-1 md:flex-initial flex flex-col items-center justify-center px-4 py-2.5 rounded-xl bg-muted/40 border border-border/60 min-w-[85px] sm:min-w-[100px]">
              <p className="text-lg sm:text-xl font-bold tabular-nums text-foreground leading-none font-mono">{logsCount}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mt-1.5">Days Logged</p>
            </div>
            <div className="flex-1 md:flex-initial flex flex-col items-center justify-center px-4 py-2.5 rounded-xl bg-muted/40 border border-border/60 min-w-[85px] sm:min-w-[100px]">
              <p className="text-lg sm:text-xl font-bold tabular-nums text-emerald-500 dark:text-emerald-400 leading-none font-mono">{APP_VERSION}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mt-1.5">Release</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-Column Identity & Security Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Identity Card */}
        <div className="bg-card/90 backdrop-blur-md border border-border/70 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <User className="size-4.5" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground font-heading truncate">Personal Identity</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">Display name for logs and reports</p>
                </div>
              </div>

              {!profileState.open && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    profileDispatch({
                      type: "open",
                      first_name: profile?.first_name ?? "",
                      last_name: profile?.last_name ?? "",
                    })
                  }
                  className="h-8 px-3 rounded-lg bg-muted/60 hover:bg-muted text-foreground border border-border text-xs font-medium shadow-2xs active:scale-[0.98] transition-all cursor-pointer shrink-0"
                >
                  <Pencil className="size-3.5 mr-1.5 text-muted-foreground" />
                  Edit Name
                </Button>
              )}
            </div>

            {!profileState.open ? (
              <div className="space-y-4 py-1">
                <div className="p-4 rounded-xl bg-muted/20 border border-border/50 space-y-3">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Full Name</span>
                    <p className="text-base font-bold text-foreground mt-0.5">
                      {fullName !== "Unset Name" ? fullName : <span className="italic text-muted-foreground font-normal">Not configured</span>}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Registered Email</span>
                    <p className="text-xs font-mono text-foreground mt-0.5">{email || "—"}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Access Privilege</span>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {profile?.role === "admin" ? "Workspace Administrator (Full Access)" : "Authorized AR Associate (Standard)"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-1 animate-in fade-in-50 duration-200">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">First Name</Label>
                  <Input
                    placeholder="Enter first name"
                    value={profileState.first_name}
                    onChange={(e) => profileDispatch({ type: "set", patch: { first_name: e.target.value } })}
                    className="rounded-xl bg-muted/40 border-border/60 text-sm focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500/60 h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Last Name</Label>
                  <Input
                    placeholder="Enter last name"
                    value={profileState.last_name}
                    onChange={(e) => profileDispatch({ type: "set", patch: { last_name: e.target.value } })}
                    onKeyDown={(e) => e.key === "Enter" && onUpdateProfile()}
                    className="rounded-xl bg-muted/40 border-border/60 text-sm focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500/60 h-10"
                  />
                </div>
                <div className="flex gap-2.5 pt-3 border-t border-border/50 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-9 rounded-lg border border-border/80 bg-muted/70 hover:bg-muted text-foreground text-xs font-medium shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
                    onClick={() => profileDispatch({ type: "close" })}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs shadow-emerald-600/25 border border-emerald-500/30 active:scale-[0.98] transition-all cursor-pointer"
                    onClick={onUpdateProfile}
                    disabled={profileState.loading}
                  >
                    {profileState.loading && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security & Password Card */}
        <div className="bg-card/90 backdrop-blur-md border border-border/70 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                  <KeyRound className="size-4.5" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground font-heading truncate">Security & Credentials</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">Account password & credentials</p>
                </div>
              </div>

              {!pwState.open && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => pwDispatch({ type: "open" })}
                  className="h-8 px-3 rounded-lg bg-muted/60 hover:bg-muted text-foreground border border-border text-xs font-medium shadow-2xs active:scale-[0.98] transition-all cursor-pointer shrink-0"
                >
                  <Lock className="size-3.5 mr-1.5 text-muted-foreground" />
                  Change Password
                </Button>
              )}
            </div>

            {!pwState.open ? (
              <div className="space-y-4 py-1">
                <div className="p-4 rounded-xl bg-muted/20 border border-border/50 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                    <ShieldCheck className="size-4 shrink-0" />
                    <span>Supabase Auth Session Active</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your account is authenticated via Supabase JWT with row-level security. Updating your password keeps your existing session active on this workstation while invalidating other devices.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-1 animate-in fade-in-50 duration-200">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">New Password</Label>
                  <div className="relative">
                    <Input
                      type={pwState.showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      minLength={6}
                      value={pwState.next}
                      onChange={(e) => pwDispatch({ type: "set", patch: { next: e.target.value } })}
                      className="pr-10 rounded-xl bg-muted/40 border-border/60 text-sm focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500/60 h-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => pwDispatch({ type: "toggle_show" })}
                      tabIndex={-1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      title={pwState.showPassword ? "Hide password" : "Show password"}
                    >
                      {pwState.showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Meter & Live Checklist */}
                {pwState.next.length > 0 && (
                  <div className="space-y-2.5 p-3 rounded-xl bg-muted/30 border border-border/50 animate-in fade-in-50 duration-150">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Strength:</span>
                      <span className={cn("font-bold text-xs", strength.score >= 4 ? "text-emerald-500" : strength.score >= 2 ? "text-amber-500" : "text-red-500")}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-300", strength.color)}
                        style={{ width: strength.width }}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                      {PASSWORD_RULES.map(({ label, test }) => {
                        const passed = test(pwState.next);
                        return (
                          <div
                            key={label}
                            className={cn(
                              "flex items-center gap-1.5 text-[11px] transition-colors font-medium",
                              passed ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/80"
                            )}
                          >
                            {passed ? (
                              <Check className="size-3 text-emerald-500 shrink-0" strokeWidth={2.5} />
                            ) : (
                              <X className="size-3 text-muted-foreground/40 shrink-0" strokeWidth={2} />
                            )}
                            <span>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Confirm Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={pwState.confirm}
                    onChange={(e) => pwDispatch({ type: "set", patch: { confirm: e.target.value } })}
                    onKeyDown={(e) => e.key === "Enter" && onChangePassword()}
                    className="rounded-xl bg-muted/40 border-border/60 text-sm focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500/60 h-10 font-mono"
                  />
                </div>

                {pwState.error && (
                  <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2 animate-in fade-in-50 font-medium">
                    <ShieldAlert className="size-4 shrink-0" />
                    <span>{pwState.error}</span>
                  </div>
                )}

                <div className="flex gap-2.5 pt-3 border-t border-border/50 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-9 rounded-lg border border-border/80 bg-muted/70 hover:bg-muted text-foreground text-xs font-medium shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
                    onClick={() => pwDispatch({ type: "close" })}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs shadow-emerald-600/25 border border-emerald-500/30 active:scale-[0.98] transition-all cursor-pointer"
                    onClick={onChangePassword}
                    disabled={pwState.loading}
                  >
                    {pwState.loading && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                    Update Password
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
