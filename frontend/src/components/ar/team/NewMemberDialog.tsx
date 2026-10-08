import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateUser } from "@/hooks/useTeamData";
import { Eye, EyeOff, Info, Loader2, Shield, User, UserPlus } from "@/components/ui/icons";

interface NewMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewMemberDialog({ open, onOpenChange }: NewMemberDialogProps) {
  const createUser = useCreateUser();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"user" | "admin">("user");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setShowPassword(false);
      setRole("user");
      setError("");
    }
  }, [open]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const em = email.trim();
    const pw = password.trim();

    if (!em) {
      setError("Email address is required.");
      return;
    }
    if (!em.includes("@") || !em.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (pw.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setError("");
    createUser.mutate(
      {
        email: em,
        password: pw,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
        onError: (err) => {
          setError(err.message || "Failed to create team member.");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border border-border/70 bg-background/95 backdrop-blur-xl shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-primary">
              <UserPlus className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">Add Team Member</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Register a new associate or administrator with login credentials.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Name Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-first-name" className="text-xs font-semibold text-foreground">
                First Name
              </Label>
              <Input
                id="new-first-name"
                placeholder="e.g. Ayush"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-9 rounded-xl bg-muted/30 border-border/60 text-xs sm:text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-last-name" className="text-xs font-semibold text-foreground">
                Last Name
              </Label>
              <Input
                id="new-last-name"
                placeholder="e.g. Rathi"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-9 rounded-xl bg-muted/30 border-border/60 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <Label htmlFor="new-member-email" className="text-xs font-semibold text-foreground">
              Work Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="new-member-email"
              type="email"
              autoComplete="off"
              placeholder="associate@basata.ai"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              className="h-9 rounded-xl bg-muted/30 border-border/60 text-xs sm:text-sm font-mono"
            />
          </div>

          {/* Initial Password */}
          <div className="space-y-1.5">
            <Label htmlFor="new-member-password" className="text-xs font-semibold text-foreground">
              Initial Password <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="new-member-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                className="h-9 pr-10 rounded-xl bg-muted/30 border-border/60 text-xs sm:text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">The member can change their password anytime in Settings.</p>
          </div>

          {/* Role Picker */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Access Role</Label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRole("user")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  role === "user"
                    ? "border-primary bg-primary/[0.04] shadow-2xs ring-1 ring-primary/20"
                    : "border-border/60 bg-muted/20 hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <User className="size-3.5 text-muted-foreground" />
                  <span className="text-xs font-bold text-foreground">Associate</span>
                </div>
                <span className="text-[11px] text-muted-foreground leading-tight">
                  Track documents, daily logs, and patient records.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  role === "admin"
                    ? "border-primary bg-primary/[0.04] shadow-2xs ring-1 ring-primary/20"
                    : "border-border/60 bg-muted/20 hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Shield className="size-3.5 text-primary" />
                  <span className="text-xs font-bold text-foreground">Administrator</span>
                </div>
                <span className="text-[11px] text-muted-foreground leading-tight">
                  Manage team, inspect all logs, and edit facilities.
                </span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2.5 animate-fade-in font-medium">
              <Info className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-border/60 h-9"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createUser.isPending}
              className="rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground shadow-xs shadow-primary/20 font-semibold h-9 px-4 cursor-pointer"
            >
              {createUser.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Create Member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
