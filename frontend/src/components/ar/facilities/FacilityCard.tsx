import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Building2,
  Check,
  CheckCheck,
  Copy,
  MoreVertical,
  Pencil,
  Trash2,
  Send,
} from "@/components/ui/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuthenticatedImage } from "@/hooks/useAuthenticatedImage";
import type { Facility, useUpsertFacility, useDeleteFacility } from "@/hooks/useFacilities";
import { formatFax, copyFax, copyFacilityTable, logoSrc } from "./facility-utils";
import { HighlightText } from "@/components/ar/HighlightText";
import { cn } from "@/lib/utils";

interface FacilityCardProps {
  f: Facility;
  isAdmin: boolean;
  setEditing: (f: Facility | null) => void;
  setDialogOpen: (open: boolean) => void;
  setDeleteTarget: (f: Facility | null) => void;
  upsert: ReturnType<typeof useUpsertFacility>;
  deleteFacility: ReturnType<typeof useDeleteFacility>;
  searchQuery?: string;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onStartSelect?: (id: string) => void;
}

function LogoStage({ f }: { f: Facility }) {
  const [imgError, setImgError] = useState(false);
  const proxyUrl = f.logo_url ? logoSrc(f.logo_url) : null;
  const { src, error } = useAuthenticatedImage(proxyUrl);

  if (imgError || error || !src || !f.logo_url) {
    const initials = f.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("");

    return (
      <div className="size-full rounded-xl bg-gradient-to-br from-primary/15 via-primary/5 to-muted/40 border border-border/60 flex items-center justify-center select-none relative overflow-hidden">
        <Building2 className="absolute -right-3 -bottom-3 size-20 text-primary/10 -rotate-12 pointer-events-none" />
        <div className="flex size-11 items-center justify-center rounded-xl bg-background/80 border border-primary/20 shadow-2xs">
          <span className="text-base font-extrabold text-primary tracking-wider">
            {initials || "FC"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="size-full relative rounded-xl overflow-hidden bg-muted/30 flex items-center justify-center">
      <img
        src={src}
        alt={`${f.name} logo`}
        className="size-full object-cover object-center brightness-[0.88] dark:brightness-[0.78] contrast-[0.96] group-hover:brightness-95 dark:group-hover:brightness-[0.88] transition-all duration-200 ease-out group-hover:scale-[1.03]"
        onError={() => setImgError(true)}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-black/10 to-black/10 dark:from-black/35 dark:via-black/15 dark:to-black/15 pointer-events-none rounded-xl ring-1 ring-inset ring-black/10 dark:ring-white/5" />
    </div>
  );
}

export function FacilityCard({
  f,
  isAdmin,
  setEditing,
  setDialogOpen,
  setDeleteTarget,
  upsert,
  deleteFacility,
  searchQuery,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
  onStartSelect,
}: FacilityCardProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number>(0);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleCopy = () => {
    void copyFax(f);
    setCopied(true);
    clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div
      onClick={
        selectionMode && onToggleSelect
          ? () => onToggleSelect(f.id)
          : undefined
      }
      className={cn(
        "group relative isolate z-0 h-full rounded-2xl border p-2.5 transition-[transform,border-color,box-shadow,background-color] duration-200 ease-out hover:-translate-y-0.5 flex flex-col justify-between gap-2.5",
        selectionMode && "cursor-pointer select-none",
        isSelected
          ? "border-primary/70 ring-1 ring-primary/40 bg-primary/[0.04] shadow-md shadow-primary/10"
          : "border-border/80 bg-card/95 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5",
      )}
    >
      {/* ── Top Stage: Logo & Clinic Identity ── */}
      <div className="space-y-2.5">
        <div className="h-28 sm:h-30 w-full relative shrink-0">
          <LogoStage f={f} />

          {/* Selection Checkbox Overlay */}
          {selectionMode && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect?.(f.id);
              }}
              aria-label={isSelected ? `Deselect ${f.name}` : `Select ${f.name}`}
              className={cn(
                "absolute top-2.5 left-2.5 z-10 flex size-6 items-center justify-center rounded-lg border shadow-sm transition-all cursor-pointer",
                isSelected
                  ? "bg-primary border-primary text-primary-foreground scale-100"
                  : "bg-background/90 dark:bg-card/90 backdrop-blur-md border-border/80 text-transparent hover:border-primary/60",
              )}
            >
              <Check className="size-3.5" strokeWidth={3} />
            </button>
          )}
        </div>

        {/* ── Clinic Identity & Status Header ── */}
        <div className="px-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h3
              className="text-sm sm:text-[15px] font-bold text-foreground tracking-tight leading-snug truncate min-w-0 flex-1"
              title={f.name}
            >
              <HighlightText text={f.name} query={searchQuery} />
            </h3>

            <div
              className="flex items-center gap-1 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {f.verified ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/25">
                  <Check className="size-2.5" strokeWidth={3} />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center text-[10px] font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full border border-border/60">
                  Standard
                </span>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 cursor-pointer transition-colors"
                    aria-label={`Actions for ${f.name}`}
                  >
                    <MoreVertical className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={6}
                  className="w-48 rounded-xl border border-border/80 dark:border-white/10 bg-popover/95 backdrop-blur-xl p-1.5 shadow-xl shadow-black/25"
                >
                  <DropdownMenuItem
                    onClick={() => void copyFacilityTable(f)}
                    className="group/copy rounded-lg px-2 py-1.5 text-xs font-medium text-foreground/90 focus:text-foreground focus:bg-muted/80 dark:focus:bg-white/[0.07] gap-2.5 cursor-pointer transition-colors"
                  >
                    <span className="flex size-6 items-center justify-center rounded-md bg-muted/70 dark:bg-white/[0.06] border border-border/60 dark:border-white/10 text-muted-foreground group-focus/copy:text-foreground transition-colors shrink-0">
                      <Copy className="size-3" />
                    </span>
                    <span>Copy Facility</span>
                  </DropdownMenuItem>

                  {onStartSelect && (
                    <DropdownMenuItem
                      onClick={() => {
                        if (selectionMode) {
                          onToggleSelect?.(f.id);
                        } else {
                          onStartSelect(f.id);
                        }
                      }}
                      className="group/sel rounded-lg px-2 py-1.5 text-xs font-medium text-foreground/90 focus:text-foreground focus:bg-muted/80 dark:focus:bg-white/[0.07] gap-2.5 cursor-pointer transition-colors"
                    >
                      <span className="flex size-6 items-center justify-center rounded-md bg-muted/70 dark:bg-white/[0.06] border border-border/60 dark:border-white/10 text-muted-foreground group-focus/sel:text-foreground transition-colors shrink-0">
                        <CheckCheck className="size-3.5" />
                      </span>
                      <span>
                        {selectionMode
                          ? isSelected
                            ? "Deselect Facility"
                            : "Select Facility"
                          : "Select Multiple"}
                      </span>
                    </DropdownMenuItem>
                  )}

                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator className="my-1 mx-1 bg-border/50" />
                      <DropdownMenuItem
                        onClick={() => {
                          setEditing(f);
                          setDialogOpen(true);
                        }}
                        disabled={upsert.isPending}
                        className="group/edit rounded-lg px-2 py-1.5 text-xs font-medium text-foreground/90 focus:text-foreground focus:bg-muted/80 dark:focus:bg-white/[0.07] gap-2.5 cursor-pointer transition-colors"
                      >
                        <span className="flex size-6 items-center justify-center rounded-md bg-muted/70 dark:bg-white/[0.06] border border-border/60 dark:border-white/10 text-muted-foreground group-focus/edit:text-foreground transition-colors shrink-0">
                          <Pencil className="size-3" />
                        </span>
                        <span>Edit Facility</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1 mx-1 bg-border/50" />
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget(f)}
                        disabled={deleteFacility.isPending}
                        className="group/del rounded-lg px-2 py-1.5 text-xs font-medium text-destructive focus:text-destructive focus:bg-destructive/10 dark:focus:bg-destructive/15 gap-2.5 cursor-pointer transition-colors"
                      >
                        <span className="flex size-6 items-center justify-center rounded-md bg-destructive/10 border border-destructive/20 text-destructive group-focus/del:bg-destructive/20 transition-colors shrink-0">
                          <Trash2 className="size-3" />
                        </span>
                        <span>Delete Facility</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Physical Address */}
          {f.address ? (
            <p className="text-xs text-muted-foreground leading-snug break-words">
              <HighlightText text={f.address} query={searchQuery} />
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/50 italic leading-snug">
              No street address listed
            </p>
          )}
        </div>
      </div>

      {/* ── Bottom Footer: Slim Single-Line Fax Strip ── */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleCopy();
        }}
        title="Click to copy fax number"
        className={cn(
          "group/fax w-full flex items-stretch justify-between rounded-lg border overflow-hidden transition-all duration-150 cursor-pointer select-none active:scale-[0.99]",
          copied
            ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-600 dark:text-emerald-400"
            : "bg-muted/30 hover:bg-muted/50 border-border/60 hover:border-primary/35",
        )}
      >
        <div className="flex items-center gap-2 min-w-0 px-2.5 py-1.5 flex-1">
          <Send
            className={cn(
              "size-3 shrink-0 transition-colors",
              copied
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground group-hover/fax:text-primary",
            )}
          />
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 shrink-0">
            Fax
          </span>
          <span className="text-border select-none shrink-0">•</span>
          <span className="text-xs sm:text-[13px] font-semibold text-foreground font-mono tabular-nums tracking-tight truncate">
            <HighlightText text={formatFax(f.fax_number)} query={searchQuery} />
          </span>
        </div>

        <span
          className={cn(
            "shrink-0 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border-l transition-colors",
            copied
              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "border-border/60 text-muted-foreground group-hover/fax:text-foreground group-hover/fax:bg-muted/60",
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.span
                key="check"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="flex items-center gap-1 font-semibold"
              >
                <Check className="size-3" strokeWidth={3} />
                <span>Copied</span>
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="flex items-center gap-1"
              >
                <Copy className="size-3" />
                <span>Copy</span>
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </button>
    </div>
  );
}
