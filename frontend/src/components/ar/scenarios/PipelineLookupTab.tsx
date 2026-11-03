import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { INDEXING_DOC_TYPES } from "@/data/scenariosData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Copy, X } from "lucide-react";

export default function PipelineLookupTab() {
  const [lookupSearch, setLookupSearch] = useState("");

  const copyToClipboard = (text: string, label = "Copied to clipboard") => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const filteredIndexing = useMemo(() => {
    if (!lookupSearch.trim()) {
      return INDEXING_DOC_TYPES.slice(0, 8);
    }
    const q = lookupSearch.toLowerCase();
    return INDEXING_DOC_TYPES.filter((doc) => {
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.indicators.toLowerCase().includes(q) ||
        Boolean(doc.facilityTypes && doc.facilityTypes.toLowerCase().includes(q))
      );
    });
  }, [lookupSearch]);

  return (
    <motion.div
      key="pipeline-lookup"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="space-y-4"
    >
      <div className="bg-card/80 border border-border/65 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          Document Routing & Indexing Search
        </h2>
        <div className="group relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-emerald-500 transition-colors duration-200 pointer-events-none" />
          <Input
            className="pl-10 pr-9 h-10 text-xs sm:text-sm rounded-xl bg-background/90 dark:bg-black/35 border-border/65 focus-visible:bg-background/95 focus-visible:border-emerald-500/60 focus-visible:ring-2 focus-visible:ring-emerald-500/20 shadow-2xs transition-[border-color,box-shadow,background-color] duration-150 font-medium"
            placeholder="Search document type (e.g. 'Cardiac Clearance', 'INR', 'Labs', 'CT/CTA', 'PFT', 'VCC')…"
            value={lookupSearch}
            onChange={(e) => setLookupSearch(e.target.value)}
          />
          <AnimatePresence>
            {lookupSearch && (
              <motion.button
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                type="button"
                onClick={() => setLookupSearch("")}
                title="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 size-5 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              >
                <X className="size-3.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredIndexing.map((doc) => {
          const flowString = doc.flow.join(" → ");
          return (
            <div key={doc.id} className="p-4 sm:p-5 rounded-2xl border border-border/65 bg-card/80 space-y-3 shadow-2xs hover:border-border/90 hover:shadow-xs transition-all duration-150 group">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-foreground">
                  {doc.title}
                </span>
                {doc.priority === "HIGH" && (
                  <Badge variant="destructive" className="text-[10px] uppercase font-mono">
                    Urgent / High
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Indicators:</strong> {doc.indicators}
              </p>

              {doc.facilityTypes && (
                <p className="text-2xs text-muted-foreground font-mono">
                  Origin: {doc.facilityTypes}
                </p>
              )}

              <div className="bg-muted/40 p-3 rounded-xl border border-border/50 text-2xs font-mono text-foreground space-y-1">
                <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-sans">
                  NextGen Routing Pipeline
                </span>
                <p className="leading-snug break-words text-emerald-600 dark:text-emerald-400 font-semibold">
                  {flowString}
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-2xs font-mono text-muted-foreground">
                  Bucket: <strong className="text-foreground">{doc.destination}</strong>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(flowString, "Copied pipeline path")}
                  className="text-xs h-7 px-2.5 gap-1.5 rounded-lg border-border/70 hover:bg-muted font-medium active:scale-[0.96] transition-all cursor-pointer shadow-2xs"
                >
                  <Copy className="size-3" />
                  <span>Copy Flow</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
