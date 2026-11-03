import { Dispatch } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  KeyRound,
  Loader2,
  ShieldCheck,
  Check,
  X,
  Eye,
  EyeOff,
  User,
  Pencil,
  Mail,
  Calendar,
} from "lucide-react";
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
    : "Not set";

  const strength = getPasswordStrength(pwState.next);

  return (
    <div className="space-y-5">
      {/* ── User Overview Card ── */}
      <div className="bg-card/80 border border-border/65 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="size-11 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500 font-semibold text-sm font-heading">
                {initials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 border-2 border-card" />
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-foreground">{fullName}</h2>
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.2 rounded-full">
                  {profile?.role === "admin" ? "Admin" : "Member"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="size-3 text-muted-foreground/70" />
                  {email || "—"}
                </span>
                {createdAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3 text-muted-foreground/70" />
                    Joined {new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
            <div className="flex-1 sm:flex-initial flex flex-col items-center justify-center px-3.5 py-1.5 rounded-lg bg-muted/40 border border-border/60 min-w-[80px]">
              <p className="text-sm sm:text-base font-semibold tabular-nums text-foreground leading-none font-mono">{categoriesCount}</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-1">Categories</p>
            </div>
            <div className="flex-1 sm:flex-initial flex flex-col items-center justify-center px-3.5 py-1.5 rounded-lg bg-muted/40 border border-border/60 min-w-[80px]">
              <p className="text-sm sm:text-base font-semibold tabular-nums text-foreground leading-none font-mono">{logsCount}</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-1">Days Logged</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-Column Name & Password Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Profile Details Card */}
        <div className="bg-card/80 border border-border/65 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                  <User className="size-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-semibold text-foreground">Display Name</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">Shown on your logs and reports</p>
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
                  className="h-7 px-2.5 rounded-lg bg-muted/60 hover:bg-muted text-foreground border border-border text-xs font-medium cursor-pointer shrink-0"
                >
                  <Pencil className="size-3 mr-1 text-muted-foreground" />
                  Edit
                </Button>
              )}
            </div>

            {!profileState.open ? (
              <div className="grid grid-cols-2 gap-3 py-1 text-xs">
                <div>
                  <span className="text-[11px] text-muted-foreground">First Name</span>
                  <p className="font-medium text-foreground mt-0.5">{profile?.first_name || "—"}</p>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">Last Name</span>
                  <p className="font-medium text-foreground mt-0.5">{profile?.last_name || "—"}</p>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">Email</span>
                  <p className="font-medium text-foreground mt-0.5 truncate">{email || "—"}</p>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">Role</span>
                  <p className="font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {profile?.role === "admin" ? "Administrator" : "Member"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-1 animate-in fade-in-50 duration-150">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">First Name</Label>
                  <Input
                    placeholder="Enter first name"
                    value={profileState.first_name}
                    onChange={(e) => profileDispatch({ type: "set", patch: { first_name: e.target.value } })}
                    className="rounded-lg bg-muted/40 border-border/60 text-xs h-8.5"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Last Name</Label>
                  <Input
                    placeholder="Enter last name"
                    value={profileState.last_name}
                    onChange={(e) => profileDispatch({ type: "set", patch: { last_name: e.target.value } })}
                    onKeyDown={(e) => e.key === "Enter" && onUpdateProfile()}
                    className="rounded-lg bg-muted/40 border-border/60 text-xs h-8.5"
                  />
                </div>
                <div className="flex gap-2 pt-2 border-t border-border/50">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 rounded-lg text-xs font-medium cursor-pointer"
                    onClick={() => profileDispatch({ type: "close" })}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium cursor-pointer"
                    onClick={onUpdateProfile}
                    disabled={profileState.loading}
                  >
                    {profileState.loading && <Loader2 className="size-3 mr-1 animate-spin" />}
                    Save
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Password Card */}
        <div className="bg-card/80 border border-border/65 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                  <KeyRound className="size-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-semibold text-foreground">Password</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">Keep your account secure</p>
                </div>
              </div>

              {!pwState.open && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => pwDispatch({ type: "open" })}
                  className="h-7 px-2.5 rounded-lg bg-muted/60 hover:bg-muted text-foreground border border-border text-xs font-medium cursor-pointer shrink-0"
                >
                  Change Password
                </Button>
              )}
            </div>

            {!pwState.open ? (
              <div className="py-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
                  <span>Your password is set and active. You can change it at any time.</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-1 animate-in fade-in-50 duration-150">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">New Password</Label>
                  <div className="relative">
                    <Input
                      type={pwState.showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      minLength={6}
                      value={pwState.next}
                      onChange={(e) => pwDispatch({ type: "set", patch: { next: e.target.value } })}
                      className="pr-9 rounded-lg bg-muted/40 border-border/60 text-xs h-8.5 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => pwDispatch({ type: "toggle_show" })}
                      tabIndex={-1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      title={pwState.showPassword ? "Hide password" : "Show password"}
                    >
                      {pwState.showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Meter */}
                {pwState.next.length > 0 && (
                  <div className="space-y-2 p-2.5 rounded-lg bg-muted/30 border border-border/50 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Strength:</span>
                      <span className={cn("font-semibold", strength.score >= 4 ? "text-emerald-500" : strength.score >= 2 ? "text-amber-500" : "text-red-500")}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-300", strength.color)}
                        style={{ width: strength.width }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-1 pt-0.5">
                      {PASSWORD_RULES.map(({ label, test }) => {
                        const passed = test(pwState.next);
                        return (
                          <div
                            key={label}
                            className={cn(
                              "flex items-center gap-1 text-[10px]",
                              passed ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground/70"
                            )}
                          >
                            {passed ? (
                              <Check className="size-2.5 text-emerald-500 shrink-0" strokeWidth={2.5} />
                            ) : (
                              <X className="size-2.5 text-muted-foreground/40 shrink-0" strokeWidth={2} />
                            )}
                            <span className="truncate">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Confirm Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={pwState.confirm}
                    onChange={(e) => pwDispatch({ type: "set", patch: { confirm: e.target.value } })}
                    onKeyDown={(e) => e.key === "Enter" && onChangePassword()}
                    className="rounded-lg bg-muted/40 border-border/60 text-xs h-8.5 font-mono"
                  />
                </div>

                {pwState.error && (
                  <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-2.5 py-1.5 font-medium">
                    {pwState.error}
                  </p>
                )}

                <div className="flex gap-2 pt-2 border-t border-border/50">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 rounded-lg text-xs font-medium cursor-pointer"
                    onClick={() => pwDispatch({ type: "close" })}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium cursor-pointer"
                    onClick={onChangePassword}
                    disabled={pwState.loading}
                  >
                    {pwState.loading && <Loader2 className="size-3 mr-1 animate-spin" />}
                    Save Password
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
