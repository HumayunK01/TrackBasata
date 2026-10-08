import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, MoreVertical, Pencil, Trash2, Send } from "@/components/ui/icons";
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
import { formatFax, copyFax, logoSrc } from "./facility-utils";
import { HighlightText } from "@/components/ar/HighlightText";

interface FacilityRowProps {
  f: Facility;
  isAdmin: boolean;
  setEditing: (f: Facility | null) => void;
  setDialogOpen: (open: boolean) => void;
  setDeleteTarget: (f: Facility | null) => void;
  upsert: ReturnType<typeof useUpsertFacility>;
  deleteFacility: ReturnType<typeof useDeleteFacility>;
  searchQuery?: string;
}

function RowLogo({ f }: { f: Facility }) {
  const [imgError, setImgError] = useState(false);
  const proxyUrl = f.logo_url ? logoSrc(f.logo_url) : null;
  const { src, error } = useAuthenticatedImage(proxyUrl);

  if (imgError || error || !src || !f.logo_url) {
    return (
      <div className="size-10 rounded-lg bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/20 flex items-center justify-center shrink-0 select-none">
        <span className="text-sm font-bold text-primary">
          {f.name[0]?.toUpperCase() ?? "F"}
        </span>
      </div>
    );
  }

  return (
    <div className="size-10 rounded-lg overflow-hidden border border-border/80 bg-muted/20 shrink-0 flex items-center justify-center">
      <img
        src={src}
        alt={`${f.name} logo`}
        className="size-full object-cover object-center"
        onError={() => setImgError(true)}
      />
    </div>
  );
}

export function FacilityRow({
  f,
  isAdmin,
  setEditing,
  setDialogOpen,
  setDeleteTarget,
  upsert,
  deleteFacility,
  searchQuery,
}: FacilityRowProps) {
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
      role="listitem"
      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 rounded-xl border border-border/80 bg-card p-3 sm:p-3.5 transition-all duration-200 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
    >
      {/* Left section: Logo & Identity */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <RowLogo f={f} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-foreground tracking-tight truncate">
              <HighlightText text={f.name} query={searchQuery} />
            </h3>
            {f.verified ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                <Check className="size-2.5" strokeWidth={3} />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center text-[10px] font-medium text-muted-foreground/70 bg-muted/50 px-1.5 py-0.5 rounded-full border border-border/40">
                Standard
              </span>
            )}
          </div>
          {f.address ? (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              <HighlightText text={f.address} query={searchQuery} />
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/50 italic mt-0.5">
              No street address
            </p>
          )}
        </div>
      </div>

      {/* Right section: Fax Chip & Admin Dropdown */}
      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
        <div className="flex items-center gap-2 rounded-lg bg-muted/30 border border-border/50 px-2.5 py-1.5">
          <Send className="size-3 text-muted-foreground shrink-0" />
          <span className="text-xs font-mono font-semibold text-foreground tabular-nums tracking-tight">
            <HighlightText text={formatFax(f.fax_number)} query={searchQuery} />
          </span>
          <button
            type="button"
            onClick={handleCopy}
            title="Copy fax number"
            className="ml-1 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-background hover:bg-muted text-foreground border border-border/60 transition-all cursor-pointer hover:border-primary/40 active:scale-95 shadow-2xs"
          >
            <AnimatePresence mode="wait" initial={false}>
              {copied ? (
                <motion.span
                  key="copied"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold"
                >
                  <Check className="size-3" strokeWidth={3} />
                  <span>Copied</span>
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="flex items-center gap-1 text-muted-foreground"
                >
                  <Copy className="size-3" />
                  <span>Copy</span>
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg cursor-pointer"
                aria-label={`Actions for ${f.name}`}
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() => {
                  setEditing(f);
                  setDialogOpen(true);
                }}
                disabled={upsert.isPending}
                className="cursor-pointer"
              >
                <Pencil className="size-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteTarget(f)}
                disabled={deleteFacility.isPending}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <Trash2 className="size-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
