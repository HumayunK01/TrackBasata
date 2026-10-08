import { useEffect, useState } from "react";
import {
  Building2,
  Check,
  Loader2,
  Send,
  ShieldCheck,
} from "@/components/ui/icons";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuthenticatedImage } from "@/hooks/useAuthenticatedImage";
import type { Facility, FacilityInput, useUpsertFacility } from "@/hooks/useFacilities";
import { formatFax, logoSrc } from "./facility-utils";

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
  const hasValidLogo = Boolean(logoUrl.trim()) && !imgError;
  const previewLogoUrl = hasValidLogo ? logoSrc(logoUrl.trim()) : null;
  const { src: previewImgSrc, error: previewImgError } = useAuthenticatedImage(previewLogoUrl);

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
      <DialogContent className="sm:max-w-md w-full p-0 gap-0 overflow-hidden bg-card border border-border/80 shadow-2xl rounded-2xl">
        {/* ── Dialog Header ── */}
        <DialogHeader className="px-5 py-3.5 border-b border-border/50 bg-muted/20 flex flex-row items-center pr-12">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0 shadow-2xs">
              <Building2 className="size-3.5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm font-bold text-foreground tracking-tight leading-none">
                {row ? "Edit Facility Details" : "Register New Facility"}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {/* ── Modal Form Body (Tight, no scrollbar) ── */}
        <form onSubmit={handleSubmit} className="px-5 py-3.5 space-y-3">
          {/* Compact Live Preview Strip */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {hasValidLogo && previewImgSrc && !previewImgError ? (
                <img
                  src={previewImgSrc}
                  alt="Preview"
                  className="size-8 rounded-lg object-cover border border-border/60 shrink-0 bg-muted/30"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="size-8 rounded-lg bg-gradient-to-br from-primary/20 via-primary/5 to-muted/40 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0 select-none">
                  {previewName[0]?.toUpperCase() ?? "F"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground truncate leading-snug">
                  {previewName}
                </p>
                <p className="text-[11px] font-mono text-muted-foreground tabular-nums truncate">
                  {previewFax}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              {verified ? (
                <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <Check className="size-2.5" strokeWidth={3} />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center text-[9.5px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border/40">
                  Standard
                </span>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-2.5">
            {/* Facility Name */}
            <div className="space-y-1">
              <Label htmlFor="fac-name" className="text-xs font-semibold text-foreground">
                Facility Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fac-name"
                placeholder="e.g. Banner Desert Medical Center"
                value={name}
                className="font-medium h-8.5 text-xs sm:text-sm bg-background border-border/70 focus:border-primary/50"
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </div>

            {/* Fax Number */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="fac-fax" className="text-xs font-semibold text-foreground">
                  Fax Number <span className="text-destructive">*</span>
                </Label>
                <span className="text-[10px] text-muted-foreground font-mono">10-digit US format</span>
              </div>
              <div className="relative">
                <Input
                  id="fac-fax"
                  placeholder="e.g. (602) 555-0134"
                  value={faxNumber}
                  className="font-medium font-mono tabular-nums h-8.5 text-xs sm:text-sm bg-background border-border/70 focus:border-primary/50 pl-8"
                  onChange={(e) => setFaxNumber(e.target.value)}
                  required
                />
                <Send className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Physical Address */}
            <div className="space-y-1">
              <Label htmlFor="fac-address" className="text-xs font-semibold text-foreground">
                Physical Address <span className="text-[10px] font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="fac-address"
                placeholder="e.g. 1400 S Dobson Rd, Mesa, AZ 85202"
                value={address}
                className="font-medium h-8.5 text-xs sm:text-sm bg-background border-border/70 focus:border-primary/50"
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            {/* Logo URL */}
            <div className="space-y-1">
              <Label htmlFor="fac-logo" className="text-xs font-semibold text-foreground">
                Logo Image URL <span className="text-[10px] font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="fac-logo"
                placeholder="https://example.com/logo.png"
                value={logoUrl}
                className="font-medium h-8.5 text-xs sm:text-sm bg-background border-border/70 focus:border-primary/50"
                onChange={(e) => {
                  setLogoUrl(e.target.value);
                  setImgError(false);
                }}
              />
            </div>

            {/* Verified Partner Toggle Card */}
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-3 py-2 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
                <Label htmlFor="fac-verified" className="text-xs font-semibold text-foreground cursor-pointer block leading-tight">
                  Verified Facility
                </Label>
              </div>
              <Switch
                id="fac-verified"
                checked={verified}
                onCheckedChange={setVerified}
              />
            </div>
          </div>

          {/* Dialog Footer */}
          <DialogFooter className="pt-2 border-t border-border/50 flex flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-border/70 text-xs font-medium h-8 px-3"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={upsert.isPending || !name.trim() || !faxNumber.trim()}
              className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold shadow-xs shadow-primary/20 h-8 px-3.5"
            >
              {upsert.isPending && <Loader2 className="size-3 mr-1.5 animate-spin" />}
              {row ? "Save Changes" : "Register Facility"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
