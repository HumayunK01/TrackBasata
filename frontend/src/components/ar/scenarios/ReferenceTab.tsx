import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { INBOX_LABELS, TEST_PATIENTS } from "@/data/scenariosData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ReferenceTab() {
  const [refTab, setRefTab] = useState<"labels" | "patients">("labels");
  const [labelSearch, setLabelSearch] = useState("");

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
      <div className="flex items-center gap-2 border-b border-border/70 pb-2">
        {[
          { key: "labels", label: "29 Approved Inbox Labels" },
          { key: "patients", label: "Test Patient Accounts" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setRefTab(tab.key as "labels" | "patients")}
            className={cn(
              "relative px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors",
              refTab === tab.key
                ? "text-primary-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {refTab === tab.key && (
              <motion.div
                layoutId="active-reftab-pill"
                className="absolute inset-0 bg-primary rounded-lg shadow-2xs"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  className="pl-9 h-9 text-xs bg-background border-border/60"
                  placeholder="Search approved labeling terms (click to copy)…"
                  value={labelSearch}
                  onChange={(e) => setLabelSearch(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
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
                    className="p-2.5 rounded-lg border border-border/80 bg-card hover:border-primary/50 text-left transition-all cursor-pointer group"
                  >
                    <span className="font-mono text-xs font-semibold text-foreground group-hover:text-primary transition-colors block">
                      {item.name}
                    </span>
                    <span className="text-2xs text-muted-foreground line-clamp-1">
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
                <div key={tp.id} className="p-4 rounded-xl border border-border/80 bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-mono text-sm font-bold text-foreground">
                      {tp.name}
                    </h3>
                    <Badge variant="outline" className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                      DOB: {tp.dob}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Indicators:</strong> {tp.indicators}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Usage:</strong> {tp.usage}
                  </p>
                  <div className="p-2 rounded bg-muted/60 text-2xs font-mono text-foreground">
                    NextGen Routing: {tp.indexingFlow}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copyToClipboard(tp.name, "Copied name")}
                      className="text-2xs h-7 flex-1"
                    >
                      Copy Name
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(tp.dob, "Copied DOB")}
                      className="text-2xs h-7 flex-1"
                    >
                      Copy DOB
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
