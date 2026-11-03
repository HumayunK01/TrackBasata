import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { INBOX_LABELS, TEST_PATIENTS } from "@/data/scenariosData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ReferenceTab() {
  const [refTab, setRefTab] = useState<"labels" | "patients">("labels");
  const [labelSearch, setLabelSearch] = useState("");
  const reduce = useReducedMotion();

  const copyToClipboard = (text: string, label = "Copied to clipboard") => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  return (
    <motion.div
      key="reference"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="space-y-4"
    >
      {/* Subtab Segmented Capsule */}
      <div className="overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
        <div
          role="tablist"
          aria-label="Reference categories"
          className="relative inline-flex h-10 items-center gap-0.5 rounded-xl border border-border/70 bg-background/90 dark:bg-black/35 p-1 shadow-2xs"
        >
          {[
            { key: "labels", label: "34 Approved Inbox Labels" },
            { key: "patients", label: "Test Patient Accounts" },
          ].map((tab) => {
            const active = refTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setRefTab(tab.key as "labels" | "patients")}
                className={cn(
                  "relative z-0 h-8 shrink-0 rounded-lg px-3 text-xs font-medium transition-colors duration-150 select-none cursor-pointer inline-flex items-center active:scale-[0.97]",
                  active
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="active-reftab-pill"
                    className="absolute inset-0 rounded-lg bg-card dark:bg-white/[0.09] border border-border/80 dark:border-white/12 shadow-xs -z-10"
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 420, damping: 32 }
                    }
                  />
                )}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={refTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {refTab === "labels" && (
            <div className="space-y-3">
              <div className="group relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-emerald-500 transition-colors duration-200 pointer-events-none" />
                <Input
                  className="pl-10 pr-9 h-10 text-xs sm:text-sm rounded-xl bg-background/90 dark:bg-black/35 border-border/65 focus-visible:bg-background/95 focus-visible:border-emerald-500/60 focus-visible:ring-2 focus-visible:ring-emerald-500/20 shadow-2xs transition-[border-color,box-shadow,background-color] duration-150 font-medium"
                  placeholder="Search approved labeling terms (click to copy)…"
                  value={labelSearch}
                  onChange={(e) => setLabelSearch(e.target.value)}
                />
                <AnimatePresence>
                  {labelSearch && (
                    <motion.button
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      whileTap={{ scale: 0.9 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      type="button"
                      onClick={() => setLabelSearch("")}
                      title="Clear search"
                      className="absolute right-3 top-1/2 -translate-y-1/2 size-5 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                    >
                      <X className="size-3.5" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {INBOX_LABELS.filter(
                  (l) =>
                    !labelSearch.trim() ||
                    l.name.toLowerCase().includes(labelSearch.toLowerCase()) ||
                    l.description.toLowerCase().includes(labelSearch.toLowerCase()),
                ).map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => copyToClipboard(item.name, `Copied label '${item.name}'`)}
                    className="p-3 rounded-xl border border-border/65 bg-card/80 hover:border-emerald-500/40 hover:bg-muted/60 text-left transition-all duration-150 cursor-pointer group active:scale-[0.97] shadow-2xs"
                  >
                    <span className="font-mono text-xs font-semibold text-foreground group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors block">
                      {item.name}
                    </span>
                    <span className="text-2xs text-muted-foreground line-clamp-1 mt-0.5">
                      {item.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {refTab === "patients" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TEST_PATIENTS.map((tp) => (
                <div key={tp.id} className="p-4 sm:p-5 rounded-2xl border border-border/65 bg-card/80 space-y-3 shadow-2xs hover:border-border/90 hover:shadow-xs transition-all duration-150">
                  <div className="flex items-center justify-between">
                    <h3 className="font-mono text-sm font-bold text-foreground">
                      {tp.name}
                    </h3>
                    <Badge variant="outline" className="font-mono text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/25 bg-emerald-500/10">
                      DOB: {tp.dob}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Indicators:</strong> {tp.indicators}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Usage:</strong> {tp.usage}
                  </p>
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-2xs font-mono space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Last Name:</span>
                      <span className="font-bold text-foreground">{tp.lastName}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-border/30">
                      <span className="text-muted-foreground">First Name:</span>
                      <span className="font-bold text-foreground">{tp.firstName}</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-2xs font-mono text-foreground">
                    NextGen Routing: {tp.indexingFlow}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copyToClipboard(tp.lastName, "Copied Last Name")}
                      className="text-[11px] h-7 px-2 rounded-lg font-medium active:scale-[0.96] transition-all cursor-pointer shadow-2xs"
                    >
                      Last Name
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copyToClipboard(tp.firstName, "Copied First Name")}
                      className="text-[11px] h-7 px-2 rounded-lg font-medium active:scale-[0.96] transition-all cursor-pointer shadow-2xs"
                    >
                      First Name
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(tp.dob, "Copied DOB")}
                      className="text-[11px] h-7 px-2 rounded-lg font-medium active:scale-[0.96] transition-all cursor-pointer shadow-2xs"
                    >
                      DOB
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
