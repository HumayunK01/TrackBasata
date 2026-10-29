import { useEffect, useState } from "react";
import {
  Building2,
  Check,
  Loader2,
  Pencil,
  Plus,
  Send,
  ShieldCheck,
  X,
} from "@/components/ui/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthenticatedImage } from "@/hooks/useAuthenticatedImage";
import type { Facility, FacilityInput, useUpsertFacility } from "@/hooks/useFacilities";
import { formatFax, logoSrc } from "./facility-utils";
import { cn } from "@/lib/utils";

interface FacilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: Facility | null;
  upsert: ReturnType<typeof useUpsertFacility>;
}

export function FacilityDialog({
  open,
  onOpenChange,
  row,
  upsert,
}: FacilityDialogProps) {
  const [name, setName] = useState("");
  const [faxNumber, setFaxNumber] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [address, setAddress] = useState("");
  const [verified, setVerified] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (open && row) {
      setName(row.name);
      setFaxNumber(row.fax_number);
      setLogoUrl(row.logo_url ?? "");
      setAddress(row.address ?? "");
      setVerified(row.verified);
      setImgError(false);
    } else if (open && !row) {
      setName("");
      setFaxNumber("");
      setLogoUrl("");
      setAddress("");
      setVerified(false);
      setImgError(false);
    }
  }, [open, row]);

  const previewName = name.trim() || "Facility Name";
  const previewFax = faxNumber.trim() ? formatFax(faxNumber) : "(000) 000-0000";
  const previewAddress = address.trim() || "No street address listed";
  const hasValidLogo = Boolean(logoUrl.trim()) && !imgError;
  const previewLogoUrl = hasValidLogo ? logoSrc(logoUrl.trim()) : null;
  const { src: previewImgSrc, error: previewImgError } = useAuthenticatedImage(previewLogoUrl);

  const initials = previewName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim() || !faxNumber.trim() || upsert.isPending) return;

    upsert.mutate(
      {
        row,
        values: {
          name: name.trim(),
          fax_number: faxNumber.trim(),
          logo_url: logoUrl.trim() || null,
          address: address.trim() || null,
          verified,
        } as unknown as FacilityInput,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] w-full p-0 gap-0 overflow-hidden bg-card border border-border/80 dark:border-white/10 shadow-2xl rounded-3xl sm:rounded-3xl">
        {/* ── Dialog Header ── */}
        <DialogHeader className="px-5 py-4 border-b border-border/60 bg-muted/20 flex flex-row items-center pr-12 space-y-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/12 border border-primary/25 text-primary shrink-0 shadow-2xs">
              {row ? <Pencil className="size-4" /> : <Plus className="size-4" />}
            </div>
            <div className="min-w-0 text-left">
              <DialogTitle className="text-sm sm:text-[15px] font-bold text-foreground tracking-tight leading-snug">
                {row ? "Edit Facility" : "Register New Facility"}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                {row
                  ? "Update clinic identity, fax routing number, or verification status."
                  : "Add a new clinic endpoint and fax number to the directory."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ── Modal Form Body ── */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* ── Live Directory Card Preview ── */}
          <div className="rounded-xl border border-border/70 bg-background/70 dark:bg-black/30 p-3 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80">
                Live Directory Preview
              </span>
              {verified ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
                  <Check className="size-2.5" strokeWidth={3} />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/60">
                  Standard
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 min-w-0">
              {hasValidLogo && previewImgSrc && !previewImgError ? (
                <div className="w-20 h-11 relative rounded-xl overflow-hidden bg-muted/30 shrink-0 flex items-center justify-center">
                  <img
                    src={previewImgSrc}
                    alt="Preview"
                    className="size-full object-cover object-center brightness-[0.88] dark:brightness-[0.78] contrast-[0.96]"
                    onError={() => setImgError(true)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-black/10 to-black/10 dark:from-black/30 dark:via-black/15 dark:to-black/15 pointer-events-none rounded-xl ring-1 ring-inset ring-black/10 dark:ring-white/5" />
                </div>
              ) : (
                <div className="w-20 h-11 rounded-xl bg-gradient-to-br from-primary/15 via-primary/5 to-muted/40 border border-border/60 flex items-center justify-center shrink-0 select-none relative overflow-hidden">
                  <Building2 className="absolute -right-2 -bottom-2 size-10 text-primary/10 -rotate-12 pointer-events-none" />
                  <span className="text-xs font-extrabold text-primary tracking-wider">
                    {initials || "FC"}
                  </span>
                </div>
              )}

              <div className="min-w-0 flex-1 space-y-0.5">
                <p
                  className={cn(
                    "text-sm font-bold tracking-tight leading-snug break-words",
                    name.trim() ? "text-foreground" : "text-muted-foreground/60",
                  )}
                >
                  {previewName}
                </p>
                <p
                  className={cn(
                    "text-[11px] leading-snug break-words",
                    address.trim()
                      ? "text-muted-foreground"
                      : "text-muted-foreground/45 italic",
                  )}
                >
                  {previewAddress}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-muted/35 border border-border/60 px-2.5 py-1.5">
              <Send className="size-3 text-primary/80 shrink-0" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 shrink-0">
                Fax
              </span>
              <span className="text-border select-none shrink-0">•</span>
              <span className="text-xs font-mono font-semibold text-foreground tabular-nums tracking-tight">
                {previewFax}
              </span>
            </div>
          </div>

          {/* ── Form Fields ── */}
          <div className="space-y-3">
            {/* Row 1: Facility Name + Fax Number side-by-side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Facility Name */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between h-4">
                  <Label htmlFor="fac-name" className="text-xs font-semibold text-foreground">
                    Facility Name <span className="text-destructive">*</span>
                  </Label>
                </div>
                <Input
                  id="fac-name"
                  placeholder="e.g. Banner Health"
                  value={name}
                  className="h-9 px-3 text-xs sm:text-sm font-medium bg-background border-border/70 focus:border-primary/50 rounded-xl"
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              {/* Fax Number */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between h-4">
                  <Label htmlFor="fac-fax" className="text-xs font-semibold text-foreground">
                    Fax Number <span className="text-destructive">*</span>
                  </Label>
                </div>
                <Input
                  id="fac-fax"
                  placeholder="e.g. (602) 555-0134"
                  value={faxNumber}
                  className="h-9 px-3 font-medium font-mono tabular-nums text-xs sm:text-sm bg-background border-border/70 focus:border-primary/50 rounded-xl"
                  onChange={(e) => setFaxNumber(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Row 2: Physical Address (Multi-line box) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between h-4">
                <Label htmlFor="fac-address" className="text-xs font-semibold text-foreground">
                  Physical Address
                </Label>
              </div>
              <textarea
                id="fac-address"
                rows={2}
                placeholder="e.g. Del E. Webb Medical Center, 14502 W. Meeker Blvd, Sun City West, AZ 85375"
                value={address}
                className="w-full min-h-[62px] rounded-xl border border-border/70 bg-background px-3 py-2 text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus:border-primary/50 resize-none leading-relaxed transition-colors"
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            {/* Row 3: Logo Image URL */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between h-4">
                <Label htmlFor="fac-logo" className="text-xs font-semibold text-foreground">
                  Logo Image URL
                </Label>
              </div>
              <div className="relative">
                <Input
                  id="fac-logo"
                  placeholder="https://example.com/logo.png"
                  value={logoUrl}
                  className="h-9 pl-3 pr-8 text-xs sm:text-sm font-medium bg-background border-border/70 focus:border-primary/50 rounded-xl"
                  onChange={(e) => {
                    setLogoUrl(e.target.value);
                    setImgError(false);
                  }}
                />
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoUrl("");
                      setImgError(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 size-5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
                    aria-label="Clear logo URL"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Row 4: Facility Status Selector (Standard first, then Verified) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between h-4">
                <Label className="text-xs font-semibold text-foreground">
                  Facility Status <span className="text-destructive">*</span>
                </Label>
              </div>

              <div
                role="radiogroup"
                aria-label="Facility Status"
                aria-required="true"
                className="grid grid-cols-2 gap-2.5"
              >
                {/* Option 1: Standard (Default) */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={!verified}
                  onClick={() => setVerified(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all duration-150 cursor-pointer select-none active:scale-[0.99]",
                    !verified
                      ? "bg-card dark:bg-white/[0.06] border-primary/40 dark:border-white/25 shadow-xs"
                      : "bg-background/60 border-border/70 hover:bg-muted/35 hover:border-border",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg border shrink-0 transition-colors",
                      !verified
                        ? "bg-foreground/10 dark:bg-white/12 border-border dark:border-white/20 text-foreground"
                        : "bg-muted/50 border-border/60 text-muted-foreground",
                    )}
                  >
                    <Building2 className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={cn(
                          "text-xs font-bold leading-snug",
                          !verified ? "text-foreground" : "text-foreground/80",
                        )}
                      >
                        Standard
                      </span>
                      <span
                        className={cn(
                          "size-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                          !verified
                            ? "bg-foreground text-background border-foreground"
                            : "border-muted-foreground/40",
                        )}
                      >
                        {!verified && <Check className="size-2.5" strokeWidth={3} />}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-muted-foreground leading-tight mt-0.5">
                      General listing
                    </p>
                  </div>
                </button>

                {/* Option 2: Verified */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={verified}
                  onClick={() => setVerified(true)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all duration-150 cursor-pointer select-none active:scale-[0.99]",
                    verified
                      ? "bg-emerald-500/[0.09] border-emerald-500/40 shadow-xs"
                      : "bg-background/60 border-border/70 hover:bg-muted/35 hover:border-border",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg border shrink-0 transition-colors",
                      verified
                        ? "bg-emerald-500/20 border-emerald-500/35 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted/50 border-border/60 text-muted-foreground",
                    )}
                  >
                    <ShieldCheck className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={cn(
                          "text-xs font-bold leading-snug",
                          verified
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-foreground",
                        )}
                      >
                        Verified
                      </span>
                      <span
                        className={cn(
                          "size-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                          verified
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-muted-foreground/40",
                        )}
                      >
                        {verified && <Check className="size-2.5" strokeWidth={3} />}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-muted-foreground leading-tight mt-0.5">
                      Confirmed fax number
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* ── Dialog Footer ── */}
          <DialogFooter className="pt-3 border-t border-border/60 flex flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-border/70 bg-background/60 hover:bg-muted/70 text-xs font-medium h-9 px-4 rounded-xl cursor-pointer"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={upsert.isPending || !name.trim() || !faxNumber.trim()}
              className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold shadow-xs shadow-primary/20 h-9 px-4 rounded-xl cursor-pointer"
            >
              {upsert.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              {row ? "Save Changes" : "Register Facility"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
