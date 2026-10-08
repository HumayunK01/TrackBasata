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

interface FacilityCardProps {
  f: Facility;
  isAdmin: boolean;
  setEditing: (f: Facility | null) => void;
  setDialogOpen: (open: boolean) => void;
  setDeleteTarget: (f: Facility | null) => void;
  upsert: ReturnType<typeof useUpsertFacility>;
  deleteFacility: ReturnType<typeof useDeleteFacility>;
  searchQuery?: string;
}

function LogoBanner({ f }: { f: Facility }) {
  const [imgError, setImgError] = useState(false);
  const proxyUrl = f.logo_url ? logoSrc(f.logo_url) : null;
  const { src, error } = useAuthenticatedImage(proxyUrl);

  if (imgError || error || !src || !f.logo_url) {
    return (
      <div className="size-full bg-gradient-to-br from-primary/20 via-primary/10 to-muted/40 flex items-center justify-center select-none relative">
        <span className="text-5xl font-extrabold text-primary/40 tracking-widest">
          {f.name[0]?.toUpperCase() ?? "F"}
        </span>
        <div className="absolute inset-0 bg-radial from-transparent to-black/15" />
      </div>
    );
  }

  return (
    <div className="size-full relative overflow-hidden bg-muted/20 flex items-center justify-center">
      <img
        src={src}
        alt={`${f.name} logo`}
        className="size-full object-cover object-center transform group-hover:scale-105 transition-transform duration-300"
        onError={() => setImgError(true)}
      />
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
    <div className="group relative rounded-2xl border border-border/80 bg-card overflow-hidden transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 flex flex-col justify-between">
      {/* ── Top Half: Large Banner Photo & Branding ── */}
      <div className="h-36 sm:h-40 w-full relative overflow-hidden bg-muted/40 shrink-0">
        <LogoBanner f={f} />

        {/* Gradient overlay for seamless fade into card and text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/70 to-black/25 pointer-events-none" />

        {/* Top bar over image: Status Badge & Admin menu */}
        <div className="absolute top-2.5 inset-x-3 flex items-center justify-between pointer-events-none z-10">
          <div className="pointer-events-auto">
            {f.verified ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-background/85 dark:bg-card/85 backdrop-blur-md px-2 py-0.5 rounded-full border border-emerald-500/30 shadow-2xs">
                <Check className="size-2.5" strokeWidth={3} />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center text-[10px] font-medium text-muted-foreground bg-background/85 dark:bg-card/85 backdrop-blur-md px-2 py-0.5 rounded-full border border-border/60 shadow-2xs">
                Standard
              </span>
            )}
          </div>

          {isAdmin && (
            <div className="pointer-events-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 rounded-full bg-background/85 dark:bg-card/85 backdrop-blur-md text-muted-foreground hover:text-foreground hover:bg-background border border-border/60 shadow-2xs cursor-pointer"
                    aria-label={`Actions for ${f.name}`}
                  >
                    <MoreVertical className="size-3" />
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
                    <Pencil className="size-4 mr-2" /> Edit Facility
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteTarget(f)}
                    disabled={deleteFacility.isPending}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <Trash2 className="size-4 mr-2" /> Delete Facility
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Title (Name of the facility) displayed ON the image over the gradient */}
        <div className="absolute inset-x-3.5 bottom-1.5 z-10">
          <h3
            className="text-sm sm:text-base font-bold text-foreground tracking-tight leading-tight line-clamp-2"
            title={f.name}
          >
            <HighlightText text={f.name} query={searchQuery} />
          </h3>
        </div>
      </div>

      {/* ── Bottom Half: Details & Fax Routing ── */}
      <div className="px-3.5 pb-3 pt-1.5 flex flex-col gap-2 bg-card">
        {/* Physical Address */}
        <div>
          {f.address ? (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
              <HighlightText text={f.address} query={searchQuery} />
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/60 italic leading-snug">
              No street address listed
            </p>
          )}
        </div>

        {/* Interactive Fax Router Chip */}
        <div className="mt-0.5">
          <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/50 p-2 sm:p-2.5 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex size-6 items-center justify-center rounded-md bg-background border border-border/60 text-muted-foreground shrink-0">
                <Send className="size-3" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block leading-none mb-0.5">
                  Fax Number
                </span>
                <span className="text-xs sm:text-sm font-semibold text-foreground font-mono tabular-nums tracking-tight truncate block">
                  <HighlightText text={formatFax(f.fax_number)} query={searchQuery} />
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              title="Copy fax number"
              className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-background hover:bg-muted text-foreground border border-border/60 shadow-2xs transition-all cursor-pointer hover:border-primary/40 active:scale-95"
            >
              <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold"
                  >
                    <Check className="size-3.5" strokeWidth={3} />
                    <span>Copied</span>
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="flex items-center gap-1 text-muted-foreground group-hover:text-foreground"
                  >
                    <Copy className="size-3.5" />
                    <span>Copy</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
