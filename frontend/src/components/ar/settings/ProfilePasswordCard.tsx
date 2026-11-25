import { Dispatch } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Check,
  X,
  Eye,
  EyeOff,
  Pencil,
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
  { label: "6+ characters", test: (p: string) => p.length >= 6 },
  { label: "Lowercase (a–z)", test: (p: string) => /[a-z]/.test(p) },
  { label: "Uppercase (A–Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Number (0–9)", test: (p: string) => /[0-9]/.test(p) },
  { label: "Special symbol", test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|<>?,./`~]/.test(p) },
];

function getPasswordStrength(pw: string): { label: string; score: number } {
  if (!pw) return { label: "Enter password", score: 0 };
  const passed = PASSWORD_RULES.filter((r) => r.test(pw)).length;
  if (pw.length < 6) return { label: "Too short", score: 1 };
  if (passed <= 2) return { label: "Weak", score: 2 };
  if (passed === 3) return { label: "Fair", score: 3 };
  if (passed === 4) return { label: "Good", score: 4 };
  return { label: "Strong", score: 5 };
}

const cleanInputClass =
  "w-full h-10 rounded-xl bg-background dark:bg-white/[0.03] border border-border/80 hover:border-border focus:border-primary px-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 transition-colors duration-150";

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

  const fullName =
    profile?.first_name || profile?.last_name
      ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
      : "Name not set";

  const isAdmin = profile?.role === "admin";
  const strength = getPasswordStrength(pwState.next);
  const joinedDate = createdAt
    ? new Date(createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-5">
      {/* ── Identity Summary Banner ── */}
      <div className="rounded-2xl border border-border/65 bg-card/85 p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="size-12 rounded-2xl bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-heading font-bold text-base shrink-0 select-none">
            {initials}
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
                {fullName}
              </h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                {isAdmin ? "Administrator" : "Member"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
              <span className="font-mono truncate">{email || "—"}</span>
              {joinedDate && (
                <>
                  <span className="text-border">·</span>
                  <span>Joined {joinedDate}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Workspace Activity Counters */}
        <div className="flex items-center gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/50 shrink-0">
          <div>
            <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-foreground leading-none">
              {String(logsCount).padStart(2, "0")}
            </p>
            <p className="text-[11px] text-muted-foreground font-medium mt-1">Days logged</p>
          </div>
          <div className="h-7 w-px bg-border/60" aria-hidden="true" />
          <div>
            <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-foreground leading-none">
              {String(categoriesCount).padStart(2, "0")}
            </p>
            <p className="text-[11px] text-muted-foreground font-medium mt-1">Categories</p>
          </div>
        </div>
      </div>

      {/* ── Structured Account & Security Settings ── */}
      <div className="rounded-2xl border border-border/65 bg-card/85 divide-y divide-border/50 shadow-2xs">
        {/* Row 1: Display Name */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 p-5 sm:p-6">
          <div className="md:col-span-5 space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Display Name</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Shown across your daily logs, team contributions, and exported reports.
            </p>
          </div>

          <div className="md:col-span-7">
            {!profileState.open ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/55 bg-muted/25 px-4 py-3">
                <div className="grid grid-cols-2 gap-4 flex-1 min-w-0">
                  <div className="min-w-0">
                    <span className="block text-[11px] text-muted-foreground">First name</span>
                    <span className="block text-xs sm:text-sm font-semibold text-foreground truncate mt-0.5">
                      {profile?.first_name || "—"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[11px] text-muted-foreground">Last name</span>
                    <span className="block text-xs sm:text-sm font-semibold text-foreground truncate mt-0.5">
                      {profile?.last_name || "—"}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    profileDispatch({
                      type: "open",
                      first_name: profile?.first_name ?? "",
                      last_name: profile?.last_name ?? "",
                    })
                  }
                  className="h-8 px-3 rounded-lg border-border/80 bg-card hover:bg-muted text-xs font-medium cursor-pointer shrink-0 self-start sm:self-center"
                >
                  <Pencil className="size-3 mr-1.5 text-muted-foreground" />
                  Edit name
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="settings-first-name" className="text-xs font-medium text-foreground">
                      First name
                    </Label>
                    <input
                      id="settings-first-name"
                      type="text"
                      placeholder="First name"
                      value={profileState.first_name}
                      autoFocus
                      onChange={(e) =>
                        profileDispatch({ type: "set", patch: { first_name: e.target.value } })
                      }
                      onKeyDown={(e) => e.key === "Enter" && onUpdateProfile()}
                      className={cleanInputClass}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="settings-last-name" className="text-xs font-medium text-foreground">
                      Last name
                    </Label>
                    <input
                      id="settings-last-name"
                      type="text"
                      placeholder="Last name"
                      value={profileState.last_name}
                      onChange={(e) =>
                        profileDispatch({ type: "set", patch: { last_name: e.target.value } })
                      }
                      onKeyDown={(e) => e.key === "Enter" && onUpdateProfile()}
                      className={cleanInputClass}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 rounded-lg text-xs font-medium cursor-pointer"
                    onClick={() => profileDispatch({ type: "close" })}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 px-3.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold cursor-pointer"
                    onClick={onUpdateProfile}
                    disabled={profileState.loading}
                  >
                    {profileState.loading && <Loader2 className="size-3 mr-1.5 animate-spin" />}
                    Save changes
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Workspace Access */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 p-5 sm:p-6">
          <div className="md:col-span-5 space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Workspace Access</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your verified sign-in address and assigned workspace permissions.
            </p>
          </div>

          <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/55 bg-muted/25 px-4 py-3 min-w-0">
              <span className="block text-[11px] text-muted-foreground">Sign-in email</span>
              <span className="block text-xs font-mono font-medium text-foreground truncate mt-0.5">
                {email || "—"}
              </span>
            </div>

            <div className="rounded-xl border border-border/55 bg-muted/25 px-4 py-3 min-w-0">
              <span className="block text-[11px] text-muted-foreground">Access level</span>
              <span className="block text-xs font-semibold text-foreground mt-0.5">
                {isAdmin ? "Administrator · Full workspace" : "Member · Standard workspace"}
              </span>
            </div>
          </div>
        </div>

        {/* Row 3: Password */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 p-5 sm:p-6">
          <div className="md:col-span-5 space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Password</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Update the password used to authenticate your Basata account.
            </p>
          </div>

          <div className="md:col-span-7">
            {!pwState.open ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/55 bg-muted/25 px-4 py-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs tracking-widest text-foreground">
                      ••••••••••••
                    </span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/12 text-emerald-700 dark:text-emerald-400">
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Password authentication is active on your account.
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => pwDispatch({ type: "open" })}
                  className="h-8 px-3 rounded-lg border-border/80 bg-card hover:bg-muted text-xs font-medium cursor-pointer shrink-0 self-start sm:self-center"
                >
                  Change password
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="settings-new-pw" className="text-xs font-medium text-foreground">
                    New password
                  </Label>
                  <div className="relative">
                    <input
                      id="settings-new-pw"
                      type={pwState.showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      minLength={6}
                      autoFocus
                      value={pwState.next}
                      onChange={(e) => pwDispatch({ type: "set", patch: { next: e.target.value } })}
                      className={cn(cleanInputClass, "pr-10")}
                    />
                    <button
                      type="button"
                      onClick={() => pwDispatch({ type: "toggle_show" })}
                      className="absolute right-2 top-1/2 -translate-y-1/2 size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
                      title={pwState.showPassword ? "Hide password" : "Show password"}
                      aria-label={pwState.showPassword ? "Hide password" : "Show password"}
                    >
                      {pwState.showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                </div>

                {/* 5-Segment Strength Bar & Checklist */}
                {pwState.next.length > 0 && (
                  <div className="space-y-2.5 rounded-xl bg-background/70 dark:bg-white/[0.02] border border-border/55 p-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Password strength</span>
                      <span
                        className={cn(
                          "font-semibold",
                          strength.score >= 4
                            ? "text-emerald-600 dark:text-emerald-400"
                            : strength.score >= 3
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-destructive"
                        )}
                      >
                        {strength.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-1">
                      {[1, 2, 3, 4, 5].map((step) => (
                        <div
                          key={step}
                          className={cn(
                            "h-1.5 rounded-full transition-colors duration-200",
                            step <= strength.score
                              ? strength.score >= 4
                                ? "bg-emerald-500"
                                : strength.score >= 3
                                ? "bg-amber-500"
                                : "bg-destructive"
                              : "bg-muted"
                          )}
                        />
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-0.5">
                      {PASSWORD_RULES.map(({ label, test }) => {
                        const passed = test(pwState.next);
                        return (
                          <div
                            key={label}
                            className={cn(
                              "flex items-center gap-1.5 text-[11px]",
                              passed
                                ? "text-emerald-600 dark:text-emerald-400 font-medium"
                                : "text-muted-foreground"
                            )}
                          >
                            {passed ? (
                              <Check className="size-3 text-emerald-500 shrink-0" strokeWidth={2.3} />
                            ) : (
                              <X className="size-3 text-muted-foreground/45 shrink-0" strokeWidth={2} />
                            )}
                            <span className="truncate">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="settings-confirm-pw" className="text-xs font-medium text-foreground">
                    Confirm new password
                  </Label>
                  <input
                    id="settings-confirm-pw"
                    type={pwState.showPassword ? "text" : "password"}
                    placeholder="Re-enter new password"
                    value={pwState.confirm}
                    onChange={(e) => pwDispatch({ type: "set", patch: { confirm: e.target.value } })}
                    onKeyDown={(e) => e.key === "Enter" && onChangePassword()}
                    className={cleanInputClass}
                  />
                </div>

                {pwState.error && (
                  <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2 font-medium">
                    {pwState.error}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 rounded-lg text-xs font-medium cursor-pointer"
                    onClick={() => pwDispatch({ type: "close" })}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 px-3.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold cursor-pointer"
                    onClick={onChangePassword}
                    disabled={pwState.loading}
                  >
                    {pwState.loading && <Loader2 className="size-3 mr-1.5 animate-spin" />}
                    Update password
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
