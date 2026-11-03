import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, CheckCircle2, XCircle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { VerticalArrow, BranchSplitter2 } from "./FlowchartElements";

export type FlowchartKey = "roi" | "indexable" | "ekg" | "cath" | "referral" | "banner-ads";

const FLOWCHART_TABS: { key: FlowchartKey; label: string }[] = [
  { key: "roi", label: "ROI" },
  { key: "indexable", label: "Indexable" },
  { key: "ekg", label: "EKG" },
  { key: "cath", label: "Cath Lab" },
  { key: "referral", label: "Patient Referrals" },
  { key: "banner-ads", label: "Archive" },
];

export default function FlowchartsTab() {
  const [activeFlowchart, setActiveFlowchart] = useState<FlowchartKey>("roi");
  const reduce = useReducedMotion();

  const copyToClipboard = (text: string, label = "Copied to clipboard") => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  return (
          <motion.div
            key="flowcharts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-4"
          >
            {/* Flowchart Diagram Selector Strip */}
            <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
              <div
                role="tablist"
                aria-label="Flowchart categories"
                className="relative inline-flex h-10 items-center gap-0.5 rounded-xl border border-border/70 bg-background/90 dark:bg-black/35 p-1 shadow-2xs"
              >
                {FLOWCHART_TABS.map((tab) => {
                  const active = activeFlowchart === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveFlowchart(tab.key)}
                      className={cn(
                        "relative z-0 h-8 shrink-0 rounded-lg px-3 text-xs font-medium transition-colors duration-150 select-none cursor-pointer inline-flex items-center gap-2 active:scale-[0.97]",
                        active
                          ? "text-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="active-flowchart-pill"
                          className="absolute inset-0 rounded-lg bg-card dark:bg-card/90 dark:bg-[#131924]/[0.09] border border-border/80 dark:border-white/12 shadow-xs -z-10"
                          transition={
                            reduce
                              ? { duration: 0 }
                              : { type: "spring", stiffness: 420, damping: 32 }
                          }
                        />
                      )}
                      <span
                        className={cn(
                          "size-2 rounded-full transition-colors shrink-0",
                          active ? "bg-emerald-500 shadow-2xs" : "bg-muted-foreground/40",
                        )}
                        aria-hidden
                      />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FLOWCHART CANVAS */}
            <div
              className="flowchart-canvas border border-border/65 rounded-2xl p-4 sm:p-7 shadow-2xs relative overflow-hidden bg-card/40 dark:bg-[#0c1017]/90 text-foreground transition-colors"
              style={{
                backgroundImage:
                  "radial-gradient(circle, var(--dot-color, rgba(148,163,184,0.16)) 1.2px, transparent 1.2px)",
                backgroundSize: "24px 24px",
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeFlowchart}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="w-full"
                >
              {/* ══════════════════════════════════════════════════════════
                  FLOWCHART 1: ROI (Records Request)
                  ══════════════════════════════════════════════════════════ */}
              {activeFlowchart === "roi" && (
                <div className="w-full">

                  {/* START NODE */}
                  <div className="flex flex-col items-center">
                    <div className="px-5 py-2 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-mono text-xs font-bold shadow-xs tracking-wide border border-blue-500/30">
                      Workflow: ROI (Medical Records Request)
                    </div>
                    <VerticalArrow height={20} />
                  </div>

                  {/* SPECIAL CASE: Multiple Patients in ROI */}
                  <div className="max-w-2xl mx-auto rounded-xl bg-amber-500/5 dark:bg-amber-950/20 border-2 border-amber-500/40 dark:border-amber-500/40 shadow-xs overflow-hidden">
                    <div className="px-3.5 py-1.5 bg-amber-500/15 dark:bg-amber-950/35 border-b border-amber-500/30 dark:border-amber-500/35 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase bg-amber-500/20 dark:bg-amber-950/45 px-1.5 py-0.5 rounded border border-amber-500/35 dark:border-amber-500/40">
                          Special Case
                        </span>
                        <span className="text-xs font-bold text-foreground font-heading">
                          Multiple Patients in One ROI Document
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Case A: Splittable across pages */}
                      <div className="p-3 rounded-lg bg-card/90 dark:bg-[#131924] border border-amber-500/30 dark:border-amber-500/35 shadow-2xs flex flex-col justify-between space-y-2">
                        <div className="space-y-1">
                          <span className="text-2xs font-mono font-bold text-amber-600 dark:text-amber-400 block uppercase">
                            Case A • Pages Can Be Split
                          </span>
                          <p className="font-semibold text-foreground leading-snug">
                            Patients are on separate pages:
                          </p>
                          <p className="text-2xs text-muted-foreground leading-relaxed">
                            Split the PDF into separate files so each patient has their own dedicated file. Once split, process and move each into the <strong>ROI Bucket</strong>.
                          </p>
                        </div>
                        <div className="pt-1">
                          <span className="inline-flex items-center gap-1 text-2xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-950/25 px-2 py-0.5 rounded border border-emerald-500/30 dark:border-emerald-500/35">
                            <CheckCircle2 className="size-3" />
                            Split ➔ Move to ROI Bucket
                          </span>
                        </div>
                      </div>

                      {/* Case B: Bundled / Cannot be split */}
                      <div className="p-3 rounded-lg bg-card/90 dark:bg-[#131924] border border-amber-500/30 dark:border-amber-500/35 shadow-2xs flex flex-col justify-between space-y-2">
                        <div className="space-y-1">
                          <span className="text-2xs font-mono font-bold text-amber-600 dark:text-amber-400 block uppercase">
                            Case B • Same Page / Cannot Split
                          </span>
                          <p className="font-semibold text-foreground leading-snug">
                            Multiple patients are on the same page:
                          </p>
                          <p className="text-2xs text-muted-foreground leading-relaxed">
                            In Inbox task, write note <code className="font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 dark:bg-amber-950/35 px-1 py-0.5 rounded border border-amber-500/30 dark:border-amber-500/35">Process in House: Multiple Pts</code> and push document directly to the <strong>ROI Bucket</strong>.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => copyToClipboard("Process in House: Multiple Pts", "Copied 'Process in House: Multiple Pts'")}
                          title="Copy: Process in House: Multiple Pts"
                          className="text-xs h-7 px-2.5 gap-1.5 w-full font-medium bg-card/90 dark:bg-[#131924] hover:bg-muted/60 dark:bg-white/[0.05] active:scale-[0.97] transition-all duration-150 text-foreground/90 border border-border/70 dark:border-white/10 font-mono cursor-pointer shadow-2xs"
                        >
                          <Copy className="size-3 shrink-0" />
                          <span>Process in House: Multiple Pts</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Flow continues down to standard Single Patient flow */}
                  <div className="flex flex-col items-center">
                    <VerticalArrow height={18} />
                    <span className="text-2xs font-mono text-muted-foreground uppercase tracking-wider bg-muted/60 dark:bg-white/[0.05] px-2.5 py-0.5 rounded-full border border-border/70 dark:border-white/10">
                      Standard Flow: Single Patient ROI
                    </span>
                    <VerticalArrow height={18} />
                  </div>

                  {/* STEP 1: NextGen Search */}
                  <div className="max-w-xl mx-auto rounded-xl bg-card/90 dark:bg-[#131924] border-2 border-emerald-500/40 dark:border-emerald-500/40 shadow-xs overflow-hidden">
                    <div className="px-3 py-1 bg-emerald-500/10 dark:bg-emerald-950/25 border-b border-emerald-500/30 dark:border-emerald-500/35 flex items-center justify-between text-2xs font-mono">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">Step 1: Check NextGen First</span>
                      <span className="text-muted-foreground">Main NextGen Search</span>
                    </div>
                    <div className="p-3 text-center space-y-0.5">
                      <h4 className="text-sm font-bold text-foreground">
                        Find the Patient in NextGen
                      </h4>
                      <p className="text-2xs text-muted-foreground">
                        Search by Last Name, First Name, or DOB
                      </p>
                    </div>
                  </div>

                  {/* BRANCH SPLITTER 2: YES vs NO */}
                  <BranchSplitter2
                    leftLabel="Patient Found in NextGen"
                    rightLabel="Patient Not Found in NextGen (Check Athena)"
                    leftColor="emerald"
                    rightColor="amber"
                    ratio="33-67"
                  />

                  {/* TWO SIDES: NextGen Found (Left) vs Athena Check (Right) */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    {/* LEFT COLUMN: WHAT TO DO (ROI Bucket) */}
                    <div className="md:col-span-4 flex flex-col justify-between rounded-xl bg-emerald-500/10 dark:bg-emerald-950/25 border-2 border-emerald-500/40 dark:border-emerald-500/40 shadow-xs overflow-hidden">
                      <div className="px-3 py-1 bg-emerald-500/15 dark:bg-emerald-950/35 border-b border-emerald-500/30 dark:border-emerald-500/35 flex items-center justify-between">
                        <span className="text-2xs font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="size-3.5" />
                          What to Do: Patient Found
                        </span>
                      </div>
                      <div className="p-3.5 space-y-1.5">
                        <p className="text-xs font-bold text-foreground">
                          Move to ROI Bucket
                        </p>
                        <p className="text-2xs text-muted-foreground leading-relaxed">
                          If you find and match the patient here, move the document straight to the ROI Bucket. Make sure the category selected is ROI. (Do NOT send to indexing and do NOT fax back).
                        </p>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: STEP 2 ATHENA CHECK & OUTCOMES */}
                    <div className="md:col-span-8">
                      {/* Step 2: Athena Search */}
                      <div className="rounded-xl bg-card/90 dark:bg-[#131924] border-2 border-amber-500/40 dark:border-amber-500/40 shadow-xs overflow-hidden">
                        <div className="px-3 py-1 bg-amber-500/10 dark:bg-amber-950/25 border-b border-amber-500/30 dark:border-amber-500/35 flex items-center justify-between text-2xs font-mono">
                          <span className="font-bold text-amber-600 dark:text-amber-400 uppercase">
                            Step 2: Check Athena Next
                          </span>
                          <span className="text-muted-foreground">Athena Lookup</span>
                        </div>
                        <div className="p-3 text-center space-y-0.5">
                          <h4 className="text-sm font-bold text-foreground">
                            Did you find the patient in Athena?
                          </h4>
                          <p className="text-2xs text-muted-foreground">
                            Search Athena to check past appointments, visit dates, and encounter history
                          </p>
                        </div>
                      </div>

                      {/* Branch Splitter: Found in Athena vs Not Found in Athena */}
                      <BranchSplitter2
                        leftLabel="Patient Found in Athena"
                        rightLabel="Patient Not Found in Athena"
                        leftColor="emerald"
                        rightColor="red"
                        ratio="67-33"
                      />

                      {/* 2 Outcome Sections: Found in Athena (Left 8 cols) vs Not Found in Athena (Right 4 cols) */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-stretch">
                        {/* LEFT CONTAINER: Found in Athena (2 Outcomes) */}
                        <div className="sm:col-span-8 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border-2 border-emerald-500/35 dark:border-emerald-500/40 dark:border-emerald-500/40 shadow-2xs overflow-hidden flex flex-col justify-between">
                          <div className="px-3 py-1.5 bg-emerald-500/15 dark:bg-emerald-950/35 border-b border-emerald-500/30 dark:border-emerald-500/35 flex items-center justify-between gap-2 text-2xs font-mono">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tight flex items-center gap-1.5 whitespace-nowrap text-[11px]">
                              <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                              Found in Athena • Check History
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400 shrink-0 whitespace-nowrap">
                              2 Outcomes
                            </span>
                          </div>

                          <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1 items-stretch">
                            {/* Case 1: Empty visits */}
                            <div className="p-3 rounded-lg bg-card/90 dark:bg-[#131924] border border-emerald-500/30 dark:border-emerald-500/35 shadow-2xs flex flex-col justify-between space-y-2.5">
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide bg-amber-500/10 dark:bg-amber-950/25 px-1.5 py-0.5 rounded border border-amber-500/30 dark:border-amber-500/35 inline-block">
                                  Outcome 1
                                </span>
                                <h5 className="text-xs font-bold text-foreground block tracking-tight font-heading">
                                  No Visits / Empty Chart
                                </h5>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  Patient exists in Athena, but has 0 visits or an empty chart.
                                </p>
                              </div>

                              <div className="p-2 rounded-md bg-amber-500/10 dark:bg-amber-950/25 border border-amber-500/30 dark:border-amber-500/35 space-y-1">
                                <span className="text-[10px] font-mono uppercase text-amber-600 dark:text-amber-400 block font-bold tracking-wider">
                                  Faxback Response:
                                </span>
                                <p className="text-xs font-mono font-medium text-foreground select-all leading-snug">
                                  Medical records not available for patient
                                </p>
                              </div>

                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => copyToClipboard("Medical records not available for patient", "Copied phrase")}
                                className="text-xs h-7 px-2.5 gap-1.5 w-full font-medium bg-card/90 dark:bg-[#131924] hover:bg-muted/60 dark:bg-white/[0.05] active:scale-[0.97] transition-all duration-150 text-foreground/90 border border-border/70 dark:border-white/10 font-mono cursor-pointer shadow-2xs"
                              >
                                <Copy className="size-3" />
                                Copy Phrase
                              </Button>
                            </div>

                            {/* Case 2: Old visits */}
                            <div className="p-3 rounded-lg bg-card/90 dark:bg-[#131924] border border-emerald-500/30 dark:border-emerald-500/35 shadow-2xs flex flex-col justify-between space-y-2.5">
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide bg-amber-500/10 dark:bg-amber-950/25 px-1.5 py-0.5 rounded border border-amber-500/30 dark:border-amber-500/35 inline-block">
                                  Outcome 2
                                </span>
                                <h5 className="text-xs font-bold text-foreground block tracking-tight font-heading">
                                  Found Only Old Visits eg. 2021, 2022, 2023, etc
                                </h5>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  Patient was seen previously, but has no recent visits.
                                </p>
                              </div>

                              <div className="p-2 rounded-md bg-amber-500/10 dark:bg-amber-950/25 border border-amber-500/30 dark:border-amber-500/35 space-y-1">
                                <span className="text-[10px] font-mono uppercase text-amber-600 dark:text-amber-400 block font-bold tracking-wider">
                                  Faxback Response:
                                </span>
                                <p className="text-xs font-mono font-medium text-foreground select-all leading-snug">
                                  Patient not recently seen by Phoenix Heart, last encounter was on [MM/DD/YYYY]
                                </p>
                              </div>

                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  copyToClipboard(
                                    "Patient not recently seen by Phoenix Heart, last encounter was on"
                                  )
                                }
                                className="text-xs h-7 px-2.5 gap-1.5 w-full font-medium bg-card/90 dark:bg-[#131924] hover:bg-muted/60 dark:bg-white/[0.05] active:scale-[0.97] transition-all duration-150 text-foreground/90 border border-border/70 dark:border-white/10 font-mono cursor-pointer shadow-2xs"
                              >
                                <Copy className="size-3" />
                                Copy Phrase
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* RIGHT CONTAINER: Not in NextGen OR Athena */}
                        <div className="sm:col-span-4 rounded-xl bg-rose-500/5 dark:bg-rose-950/20 border-2 border-rose-500/35 dark:border-rose-500/40 shadow-2xs overflow-hidden flex flex-col justify-between">
                          <div className="px-2.5 py-1.5 bg-rose-500/15 dark:bg-rose-950/35 border-b border-rose-500/30 dark:border-rose-500/35 flex items-center justify-between gap-1 text-2xs font-mono">
                            <span className="font-bold text-rose-600 dark:text-rose-400 uppercase tracking-tight flex items-center gap-1.5 whitespace-nowrap text-[11px]">
                              <XCircle className="size-3.5 text-rose-600 shrink-0" />
                              Not in Athena
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 dark:bg-rose-950/45 text-rose-600 dark:text-rose-400 shrink-0 whitespace-nowrap">
                              Missing in Both
                            </span>
                          </div>

                          <div className="p-2.5 flex flex-col flex-1 items-stretch">
                            {/* Case 3: Missing in both */}
                            <div className="p-3 rounded-lg bg-card/90 dark:bg-[#131924] border border-rose-500/30 dark:border-rose-500/35 shadow-2xs flex flex-col justify-between space-y-2.5 flex-1">
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide bg-rose-500/10 dark:bg-rose-950/25 px-1.5 py-0.5 rounded border border-rose-500/30 dark:border-rose-500/35 inline-block">
                                  Outcome 3
                                </span>
                                <h5 className="text-xs font-bold text-foreground block tracking-tight font-heading">
                                  Not in NextGen OR Athena
                                </h5>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  Patient does not exist in either NextGen or Athena.
                                </p>
                              </div>

                              <div className="p-2 rounded-md bg-rose-500/10 dark:bg-rose-950/25 border border-rose-500/30 dark:border-rose-500/35 space-y-1">
                                <span className="text-[10px] font-mono uppercase text-rose-600 dark:text-rose-400 block font-bold tracking-wider">
                                  Faxback Response:
                                </span>
                                <p className="text-xs font-mono font-medium text-foreground select-all leading-snug">
                                  No patient found, please update your system
                                </p>
                              </div>

                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => copyToClipboard("No patient found, please update your system", "Copied phrase")}
                                className="text-xs h-7 px-2.5 gap-1.5 w-full font-medium bg-card/90 dark:bg-[#131924] hover:bg-muted/60 dark:bg-white/[0.05] active:scale-[0.97] transition-all duration-150 text-foreground/90 border border-border/70 dark:border-white/10 font-mono cursor-pointer shadow-2xs"
                              >
                                <Copy className="size-3" />
                                Copy Phrase
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════
                  FLOWCHART 2: INDEXABLE & CLINICAL INTAKE
                  ══════════════════════════════════════════════════════════ */}
              {activeFlowchart === "indexable" && (
                <div className="w-full">
                  {/* Title Node */}
                  <div className="flex flex-col items-center">
                    <div className="px-5 py-2 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 font-mono text-xs font-bold shadow-xs tracking-wide border border-purple-500/30">
                      Workflow: Indexable
                    </div>
                    <VerticalArrow height={18} />
                  </div>

                  {/* STEP 1: Identify Document Type */}
                  <div className="max-w-xl mx-auto rounded-xl bg-card/90 dark:bg-[#131924] border-2 border-purple-500/40 dark:border-purple-500/40 shadow-xs overflow-hidden">
                    <div className="px-3 py-1 bg-purple-500/10 dark:bg-purple-950/25 border-b border-purple-500/30 dark:border-purple-500/35 flex items-center justify-between text-2xs font-mono">
                      <span className="font-bold text-purple-600 dark:text-purple-400 uppercase">
                        Step 1: Identify Document Type
                      </span>
                      <span className="text-muted-foreground">Document Classification</span>
                    </div>
                    <div className="p-3 text-center space-y-1">
                      <h4 className="text-sm font-bold text-foreground font-heading">
                        Identify the Document Type
                      </h4>
                      <p className="text-2xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                        Determine document category (Labs, Progress Notes, Orders, Rx, Billing, or <strong>Cardiac Clearance</strong>).
                      </p>
                    </div>
                  </div>

                  {/* Connector Arrow */}
                  <div className="flex justify-center">
                    <VerticalArrow height={18} />
                  </div>

                  {/* STEP 2: Patient Lookup in NextGen */}
                  <div className="max-w-xl mx-auto rounded-xl bg-card/90 dark:bg-[#131924] border-2 border-emerald-500/40 dark:border-emerald-500/40 shadow-xs overflow-hidden">
                    <div className="px-3 py-1 bg-emerald-500/10 dark:bg-emerald-950/25 border-b border-emerald-500/30 dark:border-emerald-500/35 flex items-center justify-between text-2xs font-mono">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                        Step 2: Find the Patient
                      </span>
                      <span className="text-muted-foreground">Primary NextGen EHR Lookup</span>
                    </div>
                    <div className="p-3 text-center space-y-1">
                      <h4 className="text-sm font-bold text-foreground font-heading">
                        Search Patient in NextGen First
                      </h4>
                      <p className="text-2xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                        Search by Last Name, First Name, or DOB. Confirm patient chart availability.
                      </p>
                    </div>
                  </div>

                  {/* BRANCH SPLITTER: Patient Found vs Patient Not in NextGen */}
                  <BranchSplitter2
                    leftLabel="Patient Available in NextGen"
                    rightLabel="Patient Not in NextGen (Check Athena)"
                    leftColor="emerald"
                    rightColor="amber"
                    ratio="33-67"
                  />

                  {/* TWO SIDES: Patient Available (Left 4 cols) vs Not in NextGen (Right 8 cols) */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    {/* LEFT COLUMN: Patient Available & Note Rules */}
                    <div className="md:col-span-4 space-y-3">
                      {/* Verification & Provider Note Rules Box */}
                      <div className="rounded-xl bg-emerald-500/10 dark:bg-emerald-950/25/40 border-2 border-emerald-500/35 dark:border-emerald-500/40 dark:border-emerald-500/40/80 shadow-xs overflow-hidden">
                        <div className="px-3.5 py-1.5 bg-emerald-500/15 dark:bg-emerald-950/35 border-b border-emerald-500/30 dark:border-emerald-500/35 flex items-center justify-between text-2xs font-mono">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1.5">
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                            Patient Available: Details & Note Rules
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400">
                            NextGen Verified
                          </span>
                        </div>

                        <div className="p-3.5 space-y-2.5 text-xs">
                          {/* 1. Verify Details */}
                          <div className="p-2.5 rounded-lg bg-card/90 dark:bg-[#131924] border border-emerald-500/30 dark:border-emerald-500/35 space-y-1 shadow-2xs">
                            <span className="font-bold text-foreground flex items-center gap-1.5 text-xs font-heading">
                              <span className="flex items-center justify-center size-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold">1</span>
                              Verify All Patient Details Thoroughly
                            </span>
                            <p className="text-2xs text-muted-foreground leading-relaxed">
                              Double-check patient demographics: First Name, Last Name, Date of Birth against NextGen.
                            </p>
                          </div>

                          {/* 2. Provider Task Note Format */}
                          <div className="p-2.5 rounded-lg bg-card/90 dark:bg-[#131924] border border-emerald-500/30 dark:border-emerald-500/35 space-y-1.5 shadow-2xs">
                            <span className="font-bold text-foreground flex items-center gap-1.5 text-xs font-heading">
                              <span className="flex items-center justify-center size-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold">2</span>
                              Task Note Format: Document Type + Provider's Last Name
                            </span>
                            <div className="p-2 rounded-md bg-emerald-500/10 dark:bg-emerald-950/25 border border-emerald-500/30 dark:border-emerald-500/35 text-2xs font-mono text-emerald-800 dark:text-emerald-300">
                              <strong>Note Format:</strong> <code>[Document Type] - [Provider's Last Name]</code>
                            </div>
                            <ul className="text-2xs text-muted-foreground space-y-1 pl-1">
                              <li className="flex items-start gap-1.5">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">•</span>
                                <span><strong>Provider name on document:</strong> Use the provider's last name mentioned in the received document.</span>
                              </li>
                              <li className="flex items-start gap-1.5">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">•</span>
                                <span><strong>Provider name NOT mentioned:</strong> Find the patient's assigned provider in <strong>NextGen</strong> and use that provider's last name.</span>
                              </li>
                              <li className="flex items-start gap-1.5">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">•</span>
                                <span><strong>Outside provider mentioned (not ours):</strong> Look up our Phoenix Heart provider in <strong>NextGen</strong> and use our provider's last name.</span>
                              </li>
                            </ul>
                          </div>

                          {/* 3. Move to Indexing Bucket */}
                          <div className="p-2.5 rounded-lg bg-card/90 dark:bg-[#131924] border border-emerald-500/30 dark:border-emerald-500/35 space-y-1 shadow-2xs">
                            <span className="font-bold text-foreground flex items-center gap-1.5 text-xs font-heading">
                              <span className="flex items-center justify-center size-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold">3</span>
                              Move to Indexing Bucket
                            </span>
                            <p className="text-2xs text-muted-foreground leading-relaxed">
                              Once patient demographics are verified and the task note is formatted, move the document into the <strong>Indexing Bucket</strong>.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Patient Not in NextGen -> Athena Check & Outcomes */}
                    <div className="md:col-span-8 flex flex-col">
                      {/* Step 3: Check Athena */}
                      <div className="rounded-xl bg-card/90 dark:bg-[#131924] border-2 border-amber-500/40 dark:border-amber-500/40 shadow-xs overflow-hidden">
                        <div className="px-3 py-1 bg-amber-500/10 dark:bg-amber-950/25 border-b border-amber-500/30 dark:border-amber-500/35 flex items-center justify-between text-2xs font-mono">
                          <span className="font-bold text-amber-600 dark:text-amber-400 uppercase">
                            Step 3: Check Athena Next
                          </span>
                          <span className="text-muted-foreground">Secondary EHR Lookup</span>
                        </div>
                        <div className="p-3 text-center space-y-0.5">
                          <h4 className="text-sm font-bold text-foreground font-heading">
                            Did you find the patient in Athena?
                          </h4>
                          <p className="text-2xs text-muted-foreground">
                            If patient is not available in NextGen, search Athena before faxing back.
                          </p>
                        </div>
                      </div>

                      {/* Vertical connector from Step 3 to Cardiac Clearance Exception */}
                      <VerticalArrow height={18} />

                      {/* SPECIAL RULE: Cardiac Clearance Exception */}
                      <div className="rounded-xl bg-purple-500/10 dark:bg-purple-950/25 border-2 border-purple-400/80 shadow-xs overflow-hidden">
                        <div className="px-3.5 py-1.5 bg-purple-500/15 dark:bg-purple-950/35 border-b border-purple-500/30 dark:border-purple-500/35 flex items-center justify-between text-2xs font-mono">
                          <span className="font-bold text-purple-600 dark:text-purple-400 uppercase flex items-center gap-1.5">
                            <ShieldAlert className="size-3.5 text-purple-600" />
                            Cardiac Clearance Exception
                          </span>
                          <Badge className="bg-purple-600 text-white text-[10px] font-mono font-bold tracking-wider border-none shadow-2xs">
                            NEVER FAX BACK
                          </Badge>
                        </div>
                        <div className="p-3.5 space-y-2 text-xs">
                          <p className="font-semibold text-foreground leading-snug">
                            Patient NOT in NextGen &amp; Document is a Cardiac Clearance:
                          </p>
                          <div className="p-2 rounded-md bg-purple-500/15 dark:bg-purple-950/40 border border-purple-500/30 dark:border-purple-500/35 text-purple-700 dark:text-purple-300 font-medium text-2xs leading-relaxed">
                            ⚠️ <strong>Crucial Exception:</strong> Even if the patient is <strong>found in Athena</strong> (or missing in both systems), it will <strong>STILL be considered as a Referral</strong>! NEVER fax back a cardiac clearance!
                          </div>
                          <div className="p-2.5 rounded-lg bg-card/90 dark:bg-[#131924] border border-purple-500/30 dark:border-purple-500/35 font-mono text-xs space-y-1 text-foreground/90 shadow-2xs">
                            <p className="text-purple-600 dark:text-purple-400 font-bold">
                              ➔ Move to REFERRAL BUCKET as "New Patient":
                            </p>
                            <p className="text-2xs">1. Change Category to: <strong>PATIENT REFERRAL</strong></p>
                            <p className="text-2xs">2. Select: <strong>"New Patient"</strong></p>
                            <p className="text-2xs">3. Move to Referral bucket (Do NOT fax back)</p>
                          </div>
                        </div>
                      </div>

                      {/* Branch Splitter: Found in Athena vs Not Found in Athena */}
                      <BranchSplitter2
                        leftLabel="Found in Athena"
                        rightLabel="Not Found in Athena"
                        leftColor="emerald"
                        rightColor="red"
                        ratio="67-33"
                      />

                      {/* 2 Outcome Sections: Found in Athena (Left 8 cols) vs Not Found in Athena (Right 4 cols) */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-stretch">
                        {/* LEFT CONTAINER: Found in Athena (2 Outcomes) */}
                        <div className="sm:col-span-8 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border-2 border-emerald-500/35 dark:border-emerald-500/40 dark:border-emerald-500/40 shadow-2xs overflow-hidden flex flex-col justify-between">
                          <div className="px-3 py-1.5 bg-emerald-500/15 dark:bg-emerald-950/35 border-b border-emerald-500/30 dark:border-emerald-500/35 flex items-center justify-between gap-2 text-2xs font-mono">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tight flex items-center gap-1.5 whitespace-nowrap text-[11px]">
                              <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                              Found in Athena • Check History
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400 shrink-0 whitespace-nowrap">
                              2 Outcomes
                            </span>
                          </div>

                          <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1 items-stretch">
                            {/* Outcome 1: Chart in Athena Only */}
                            <div className="p-3 rounded-lg bg-card/90 dark:bg-[#131924] border border-emerald-500/30 dark:border-emerald-500/35 shadow-2xs flex flex-col justify-between space-y-2.5">
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide bg-amber-500/10 dark:bg-amber-950/25 px-1.5 py-0.5 rounded border border-amber-500/30 dark:border-amber-500/35 inline-block">
                                  Outcome 1
                                </span>
                                <h5 className="text-xs font-bold text-foreground block tracking-tight font-heading">
                                  Chart in Athena Only
                                </h5>
                                <p className="text-2xs text-muted-foreground leading-relaxed">
                                  Patient exists in Athena, but is missing in NextGen.
                                </p>
                              </div>

                              <div className="p-2 rounded-md bg-amber-500/10 dark:bg-amber-950/25 border border-amber-500/30 dark:border-amber-500/35 space-y-1">
                                <span className="text-[10px] font-mono uppercase text-amber-600 dark:text-amber-400 block font-bold tracking-wider">
                                  Faxback Response:
                                </span>
                                <p className="text-xs font-mono font-medium text-foreground select-all leading-snug">
                                  Patient not seen by Phoenix heart
                                </p>
                              </div>

                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => copyToClipboard("Patient not seen by Phoenix heart", "Copied phrase")}
                                className="text-xs h-7 px-2.5 gap-1.5 w-full font-medium bg-card/90 dark:bg-[#131924] hover:bg-muted/60 dark:bg-white/[0.05] active:scale-[0.97] transition-all duration-150 text-foreground/90 border border-border/70 dark:border-white/10 font-mono cursor-pointer shadow-2xs"
                              >
                                <Copy className="size-3" />
                                Copy Phrase
                              </Button>
                            </div>

                            {/* Outcome 2: Found Only Old Visits */}
                            <div className="p-3 rounded-lg bg-card/90 dark:bg-[#131924] border border-emerald-500/30 dark:border-emerald-500/35 shadow-2xs flex flex-col justify-between space-y-2.5">
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide bg-amber-500/10 dark:bg-amber-950/25 px-1.5 py-0.5 rounded border border-amber-500/30 dark:border-amber-500/35 inline-block">
                                  Outcome 2
                                </span>
                                <h5 className="text-xs font-bold text-foreground block tracking-tight font-heading">
                                  Found Only Old Visits eg. 2021, 2022, 2023, etc
                                </h5>
                                <p className="text-2xs text-muted-foreground leading-relaxed">
                                  Patient was seen previously, but has no recent visits.
                                </p>
                              </div>

                              <div className="p-2 rounded-md bg-amber-500/10 dark:bg-amber-950/25 border border-amber-500/30 dark:border-amber-500/35 space-y-1">
                                <span className="text-[10px] font-mono uppercase text-amber-600 dark:text-amber-400 block font-bold tracking-wider">
                                  Faxback Response:
                                </span>
                                <p className="text-xs font-mono font-medium text-foreground select-all leading-snug">
                                  Patient not recently seen by Phoenix Heart, last encounter was on [MM/DD/YYYY]
                                </p>
                              </div>

                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  copyToClipboard(
                                    "Patient not recently seen by Phoenix Heart, last encounter was on",
                                    "Copied phrase"
                                  )
                                }
                                className="text-xs h-7 px-2.5 gap-1.5 w-full font-medium bg-card/90 dark:bg-[#131924] hover:bg-muted/60 dark:bg-white/[0.05] active:scale-[0.97] transition-all duration-150 text-foreground/90 border border-border/70 dark:border-white/10 font-mono cursor-pointer shadow-2xs"
                              >
                                <Copy className="size-3" />
                                Copy Phrase
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* RIGHT CONTAINER: Not in NextGen OR Athena */}
                        <div className="sm:col-span-4 rounded-xl bg-rose-500/5 dark:bg-rose-950/20 border-2 border-rose-500/35 dark:border-rose-500/40 shadow-2xs overflow-hidden flex flex-col justify-between">
                          <div className="px-2.5 py-1.5 bg-rose-500/15 dark:bg-rose-950/35 border-b border-rose-500/30 dark:border-rose-500/35 flex items-center justify-between gap-1 text-2xs font-mono">
                            <span className="font-bold text-rose-600 dark:text-rose-400 uppercase tracking-tight flex items-center gap-1.5 whitespace-nowrap text-[11px]">
                              <XCircle className="size-3.5 text-rose-600 shrink-0" />
                              Not in Athena
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 dark:bg-rose-950/45 text-rose-600 dark:text-rose-400 shrink-0 whitespace-nowrap">
                              Missing in Both
                            </span>
                          </div>

                          <div className="p-2.5 flex flex-col flex-1 items-stretch">
                            {/* Case 3: Missing in both */}
                            <div className="p-3 rounded-lg bg-card/90 dark:bg-[#131924] border border-rose-500/30 dark:border-rose-500/35 shadow-2xs flex flex-col justify-between space-y-2.5 flex-1">
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide bg-rose-500/10 dark:bg-rose-950/25 px-1.5 py-0.5 rounded border border-rose-500/30 dark:border-rose-500/35 inline-block">
                                  Missing in Both
                                </span>
                                <h5 className="text-xs font-bold text-foreground block tracking-tight font-heading">
                                  Not in NextGen OR Athena
                                </h5>
                                <p className="text-2xs text-muted-foreground leading-relaxed">
                                  Patient does not exist in either NextGen or Athena.
                                </p>
                              </div>

                              <div className="p-2 rounded-md bg-rose-500/10 dark:bg-rose-950/25 border border-rose-500/30 dark:border-rose-500/35 space-y-1">
                                <span className="text-[10px] font-mono uppercase text-rose-600 dark:text-rose-400 block font-bold tracking-wider">
                                  Faxback Response:
                                </span>
                                <p className="text-xs font-mono font-medium text-foreground select-all leading-snug">
                                  No patient found, please update your system
                                </p>
                              </div>

                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => copyToClipboard("No patient found, please update your system", "Copied phrase")}
                                className="text-xs h-7 px-2.5 gap-1.5 w-full font-medium bg-card/90 dark:bg-[#131924] hover:bg-muted/60 dark:bg-white/[0.05] active:scale-[0.97] transition-all duration-150 text-foreground/90 border border-border/70 dark:border-white/10 font-mono cursor-pointer shadow-2xs"
                              >
                                <Copy className="size-3" />
                                Copy Phrase
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════
                  FLOWCHART 3: EKG & HIPAA SPLIT
                  ══════════════════════════════════════════════════════════ */}
              {activeFlowchart === "ekg" && (
                <div className="w-full max-w-5xl mx-auto">

                  <div className="flex flex-col items-center">
                    <div className="px-5 py-2 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-mono text-xs font-bold shadow-xs tracking-wide border border-rose-500/30">
                      Workflow: EKG
                    </div>
                    <VerticalArrow height={20} />
                  </div>

                  {/* Step 1: Multi-Patient Check */}
                  <div className="max-w-md mx-auto rounded-xl bg-card/90 dark:bg-[#131924] border-2 border-rose-500/40 dark:border-rose-500/40 shadow-xs overflow-hidden">
                    <div className="px-3 py-1 bg-rose-500/10 dark:bg-rose-950/25 border-b border-rose-500/30 dark:border-rose-500/35 flex items-center justify-between text-2xs font-mono">
                      <span className="font-bold text-rose-600 dark:text-rose-400 uppercase">
                        Step 1: Check Pages
                      </span>
                      <span className="text-muted-foreground">HIPAA Rule: Check All Pages</span>
                    </div>
                    <div className="p-3 text-center space-y-0.5">
                      <h4 className="text-sm font-bold text-foreground">
                        Are multiple patients bundled in this single PDF?
                      </h4>
                      <p className="text-2xs text-muted-foreground">
                        Scroll through all pages of the PDF before indexing anything
                      </p>
                    </div>
                  </div>

                  <BranchSplitter2
                    leftLabel="Yes: Multiple Patients"
                    rightLabel="No: Single Patient Only"
                    leftColor="red"
                    rightColor="emerald"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    {/* Multiple Patients Branch */}
                    <div className="space-y-0">
                      <div className="rounded-xl bg-rose-500/5 dark:bg-rose-950/20 border-2 border-rose-500/30 dark:border-rose-500/35 shadow-xs overflow-hidden">
                        <div className="px-3 py-1 bg-rose-500/15 dark:bg-rose-950/35 border-b border-rose-500/30 dark:border-rose-500/35 flex items-center justify-between">
                          <span className="text-2xs font-mono font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                            <ShieldAlert className="size-3.5" />
                            Action Required: Split PDF First
                          </span>
                          <Badge className="bg-rose-600 text-white text-2xs border-none font-mono">
                            HIPAA WARNING
                          </Badge>
                        </div>
                        <div className="p-3.5 space-y-2 text-xs text-foreground/90 bg-card/90 dark:bg-[#131924]">
                          <p className="font-bold text-rose-600 dark:text-rose-400">
                            Do NOT index together: Split into separate files!
                          </p>
                          <p className="text-2xs text-muted-foreground leading-relaxed">
                            1. Split the PDF so each patient has their own dedicated file (e.g. 10 patients = 10 separate PDFs).
                          </p>
                          <p className="text-2xs text-muted-foreground leading-relaxed">
                            2. Never index a multiple pts EKG into a single patient chart (severe HIPAA violation).
                          </p>
                        </div>
                      </div>

                      {/* Transition: Next Step becomes Single Patient */}
                      <div className="flex flex-col items-center">
                        <VerticalArrow height={16} />
                        <div className="px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-950/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/35 dark:border-emerald-500/40 dark:border-emerald-500/40 text-2xs font-mono font-bold shadow-2xs flex items-center gap-1.5">
                          <CheckCircle2 className="size-3" />
                          <span>Next Step: Split the Document</span>
                        </div>
                        <VerticalArrow height={16} />
                      </div>

                      {/* Converted state box */}
                      <div className="p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/25 border border-emerald-500/30 dark:border-emerald-500/35 text-xs space-y-1">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 block font-mono text-2xs">
                          Each Split Document is Now a Single Patient File
                        </span>
                        <p className="text-2xs text-foreground/90 leading-relaxed">
                          Once split page-wise, each individual document is now processed as a <strong>Single Patient</strong> file. Follow the Indexing Setup on the right ➔
                        </p>
                      </div>
                    </div>

                    {/* Single Patient Branch */}
                    <div className="rounded-xl bg-emerald-500/10 dark:bg-emerald-950/25 border-2 border-emerald-500/35 dark:border-emerald-500/40 dark:border-emerald-500/40 shadow-xs overflow-hidden">
                      <div className="px-3 py-1 bg-emerald-500/15 dark:bg-emerald-950/35 border-b border-emerald-500/30 dark:border-emerald-500/35 flex items-center justify-between">
                        <span className="text-2xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          EKG Workflow
                        </span>
                      </div>
                      <div className="p-4 space-y-2 text-xs">
                        <div className="p-3.5 bg-card/90 dark:bg-[#131924] rounded-lg border border-emerald-500/30 dark:border-emerald-500/35 font-mono text-xs space-y-2 text-foreground/90 shadow-2xs">
                          <p className="flex items-start gap-2">
                            <span className="text-emerald-600 font-bold shrink-0">•</span>
                            <span>Confirm this is a single-patient EKG (no multiple patients).</span>
                          </p>
                          <p className="flex items-start gap-2">
                            <span className="text-emerald-600 font-bold shrink-0">•</span>
                            <span>Verify patient details thoroughly: First Name, Last Name, and DOB.</span>
                          </p>
                          <p className="flex items-start gap-2">
                            <span className="text-emerald-600 font-bold shrink-0">•</span>
                            <span>Search using the ID mentioned on the EKG (e.g. <strong>402301</strong>).</span>
                          </p>
                          <p className="flex items-start gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                            <span className="text-emerald-600 font-bold shrink-0">•</span>
                            <span>Move to Indexing and ensure the Category is selected as <strong>EKG</strong>.</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════
                  FLOWCHART 4: CATH LAB
                  ══════════════════════════════════════════════════════════ */}
              {activeFlowchart === "cath" && (
                <div className="w-full max-w-4xl mx-auto">

                  <div className="flex flex-col items-center">
                    <div className="px-5 py-2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold shadow-xs tracking-wide border border-emerald-500/30">
                      Workflow: Cath Lab
                    </div>
                    <VerticalArrow height={20} />
                  </div>

                  <div className="rounded-xl bg-card/90 dark:bg-[#131924] border-2 border-emerald-500/60 shadow-xs overflow-hidden">
                    <div className="px-3.5 py-1.5 bg-emerald-500/10 dark:bg-emerald-950/25 border-b border-emerald-500/30 dark:border-emerald-500/35 flex items-center justify-between text-2xs font-mono">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                        Step 1: Find Patient in NextGen
                      </span>
                      <Badge className="bg-rose-600 text-white font-mono text-[10px] font-bold border-none shadow-2xs">
                        NEVER FAX BACK
                      </Badge>
                    </div>
                    <div className="p-4 text-center space-y-3">
                      <h4 className="text-sm font-bold text-foreground font-heading">
                        Look Up &amp; Confirm Patient in NextGen
                      </h4>
                      <div className="p-3 rounded-lg bg-amber-500/10 dark:bg-amber-950/25 border border-amber-500/35 dark:border-amber-500/40 text-xs text-left space-y-2 shadow-2xs">
                        <p className="font-semibold text-foreground leading-snug">
                          Cath Lab patients are established Phoenix Heart patients and should <strong>always exist in NextGen</strong>.
                        </p>
                        <div className="p-2.5 rounded bg-card/90 dark:bg-[#131924] border border-amber-500/30 dark:border-amber-500/35 text-2xs text-foreground space-y-1">
                          <p className="font-medium">
                            ⚠️ <strong>Cannot find the patient or information does not match?</strong> Check directly with your <strong>TL / Senior</strong>.
                          </p>
                          <p className="text-rose-600 dark:text-rose-400 font-bold font-mono tracking-wide">
                            ➔ DO NOT FAX BACK UNDER ANY CIRCUMSTANCES.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <VerticalArrow height={20} />

                  <div className="rounded-xl bg-emerald-500/10 dark:bg-emerald-950/25 border-2 border-emerald-500/35 dark:border-emerald-500/40 dark:border-emerald-500/40 shadow-xs overflow-hidden">
                    <div className="px-3 py-1 bg-emerald-500/15 dark:bg-emerald-950/35 border-b border-emerald-500/30 dark:border-emerald-500/35 flex items-center justify-between">
                      <span className="text-2xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        Step 2: Cath Lab Workflow
                      </span>
                    </div>
                    <div className="p-4 space-y-2 text-xs">
                      <div className="p-3.5 bg-card/90 dark:bg-[#131924] rounded-lg border border-emerald-500/30 dark:border-emerald-500/35 font-mono text-xs space-y-2 text-foreground/90 shadow-2xs">
                        <p className="flex items-start gap-2">
                          <span className="text-emerald-600 font-bold shrink-0">•</span>
                          <span>Confirm this is a single-patient Cath Lab document (no multiple patients).</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <span className="text-emerald-600 font-bold shrink-0">•</span>
                          <span>Verify patient details thoroughly: First Name, Last Name, and DOB.</span>
                        </p>
                        <p className="flex items-start gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                          <span className="text-emerald-600 font-bold shrink-0">•</span>
                          <span>Move to Indexing and ensure the Category is selected as <strong>Cath Lab</strong>.</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════
                  FLOWCHART 5: PATIENT REFERRAL
                  ══════════════════════════════════════════════════════════ */}
              {activeFlowchart === "referral" && (
                <div className="w-full max-w-5xl mx-auto">

                  <div className="flex flex-col items-center">
                    <div className="px-5 py-2 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-mono text-xs font-bold shadow-xs tracking-wide border border-cyan-500/30">
                      Workflow: Patient Referrals
                    </div>
                    <VerticalArrow height={20} />
                  </div>

                  <div className="max-w-md mx-auto rounded-xl bg-card/90 dark:bg-[#131924] border-2 border-cyan-500/60 shadow-xs overflow-hidden">
                    <div className="px-3 py-1 bg-cyan-500/10 dark:bg-cyan-950/25 border-b border-cyan-500/30 dark:border-cyan-500/35 text-2xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
                      Step 1: Check Document Type
                    </div>
                    <div className="p-3 text-center space-y-0.5">
                      <h4 className="text-sm font-bold text-foreground">
                        Is this a genuine Patient Referral document?
                      </h4>
                      <p className="text-2xs text-muted-foreground">
                        Review the fax facesheet, doctor's orders, and referral clinic
                      </p>
                    </div>
                  </div>

                  {/* 3-Way Branch Splitter: Complete vs Incomplete vs Wrong Type */}
                  <div className="w-full select-none">
                    {/* Desktop/Tablet Fork Bar */}
                    <div className="w-full hidden md:block">
                      <svg
                        className="w-full h-5 text-muted-foreground/80 block overflow-visible"
                        viewBox="0 0 100 20"
                        preserveAspectRatio="none"
                      >
                        <line x1="50" y1="0" x2="50" y2="10" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                        <line x1="16.67" y1="10" x2="83.33" y2="10" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                        <line x1="16.67" y1="10" x2="16.67" y2="20" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                        <line x1="50" y1="10" x2="50" y2="20" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                        <line x1="83.33" y1="10" x2="83.33" y2="20" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                      </svg>
                    </div>

                    {/* Mobile stem */}
                    <div className="flex justify-center md:hidden">
                      <VerticalArrow height={16} />
                    </div>

                    {/* 3 Branch Pill Labels with directional down arrows */}
                    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      <div className="flex flex-col items-center">
                        <span className="px-3 py-1 rounded-full text-2xs font-mono font-bold uppercase shadow-2xs border bg-emerald-500/10 dark:bg-emerald-950/25 text-emerald-600 dark:text-emerald-400 border-emerald-500/35 dark:border-emerald-500/40 dark:border-emerald-500/40 leading-tight">
                          Real Referral (Complete)
                        </span>
                        <VerticalArrow height={18} />
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="px-3 py-1 rounded-full text-2xs font-mono font-bold uppercase shadow-2xs border bg-rose-500/10 dark:bg-rose-950/25 text-rose-600 dark:text-rose-400 border-rose-500/35 dark:border-rose-500/40 leading-tight">
                          Visibly Incomplete Document
                        </span>
                        <VerticalArrow height={18} />
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="px-3 py-1 rounded-full text-2xs font-mono font-bold uppercase shadow-2xs border bg-amber-500/10 dark:bg-amber-950/25 text-amber-600 dark:text-amber-400 border-amber-500/35 dark:border-amber-500/40 leading-tight">
                          Wrong Document Type
                        </span>
                        <VerticalArrow height={18} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-stretch">
                    {/* Scenario 1: Complete & Genuine Referral */}
                    <div className="rounded-xl bg-cyan-500/10 dark:bg-cyan-950/25 border-2 border-cyan-500/35 dark:border-cyan-500/40 shadow-xs overflow-hidden flex flex-col justify-between">
                      <div>
                        <div className="px-3 py-1.5 bg-cyan-500/15 dark:bg-cyan-950/35 border-b border-cyan-500/30 dark:border-cyan-500/35 flex items-center justify-between">
                          <span className="text-2xs font-mono font-bold text-cyan-600 dark:text-cyan-400 uppercase">
                            1. Complete Referral
                          </span>
                          <Badge className="bg-cyan-600 text-white font-mono text-[10px] font-bold border-none shadow-2xs">
                            NEVER FAX BACK
                          </Badge>
                        </div>
                        <div className="p-3.5 space-y-2.5 text-xs text-foreground/90">
                          <p className="text-2xs text-muted-foreground">
                            1. Review patient name, DOB, and demographics from the document.
                          </p>

                          <div className="p-2 rounded-lg bg-card/90 dark:bg-[#131924] border border-cyan-500/30 dark:border-cyan-500/35 space-y-1.5 shadow-2xs">
                            <span className="font-bold text-cyan-600 dark:text-cyan-400 font-mono text-2xs block uppercase">
                              Patient Selection in Inbox:
                            </span>
                            <div className="space-y-1 text-2xs">
                              <div className="flex items-start gap-1">
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">• Existing Chart:</span>
                                <span>Select existing chart. <strong>Do NOT select "New Patient"</strong> if patient exists.</span>
                              </div>
                              <div className="flex items-start gap-1">
                                <span className="font-bold text-amber-600 dark:text-amber-400 shrink-0">• Not Found:</span>
                                <span>Select <strong>"New Patient"</strong> and register demographics.</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1 text-2xs">
                            <p>2. Ensure Category = <strong>PATIENT REFERRAL</strong></p>
                            <div className="p-2 bg-card/90 dark:bg-[#131924] rounded-lg font-mono font-bold text-cyan-600 dark:text-cyan-400 border border-cyan-500/35 dark:border-cyan-500/40 text-center shadow-2xs text-2xs">
                              Move directly to REFERRAL BUCKET
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="p-2 bg-cyan-500/10 dark:bg-cyan-950/25 border-t border-cyan-500/30 dark:border-cyan-500/35 text-center text-2xs font-mono text-cyan-600 dark:text-cyan-400 font-medium">
                        ✓ Complete clinical orders verified
                      </div>
                    </div>

                    {/* Scenario 2: Visibly Incomplete Referral Document */}
                    <div className="rounded-xl bg-rose-500/10 dark:bg-rose-950/25 border-2 border-rose-500/35 dark:border-rose-500/40 shadow-xs overflow-hidden flex flex-col justify-between">
                      <div>
                        <div className="px-3 py-1.5 bg-rose-500/15 dark:bg-rose-950/35 border-b border-rose-500/30 dark:border-rose-500/35 flex items-center justify-between">
                          <span className="text-2xs font-mono font-bold text-rose-600 dark:text-rose-400 uppercase">
                            2. Incomplete Referral
                          </span>
                          <Badge className="bg-rose-600 text-white font-mono text-[10px] font-bold border-none shadow-2xs">
                            FAXBACK TO FACILITY
                          </Badge>
                        </div>
                        <div className="p-3.5 space-y-2.5 text-xs text-foreground/90">
                          <div className="p-2.5 rounded-lg bg-rose-500/15 dark:bg-rose-950/40 border border-rose-500/30 dark:border-rose-500/35 text-rose-700 dark:text-rose-300 text-2xs font-medium leading-snug">
                            ⚠️ <strong>100% Visibly Incomplete:</strong> If it is plainly obvious to anyone that pages or key clinical orders are missing, fax back immediately.
                          </div>

                          <div className="p-2 rounded-lg bg-card/90 dark:bg-[#131924] border border-rose-500/30 dark:border-rose-500/35 space-y-1.5 shadow-2xs">
                            <span className="font-bold text-rose-600 dark:text-rose-400 font-mono text-2xs block uppercase">
                              Hints That Document Is Incomplete:
                            </span>
                            <ul className="text-2xs text-muted-foreground space-y-1">
                              <li className="flex items-start gap-1.5">
                                <span className="text-rose-600 font-bold shrink-0">•</span>
                                <span><strong>Page count mismatch:</strong> Header says "Page 1 of 4", but only 1 page was sent.</span>
                              </li>
                              <li className="flex items-start gap-1.5">
                                <span className="text-rose-600 font-bold shrink-0">•</span>
                                <span><strong>Truncated / cut-off text:</strong> Doctor's note or orders cut off mid-sentence at the bottom.</span>
                              </li>
                              <li className="flex items-start gap-1.5">
                                <span className="text-rose-600 font-bold shrink-0">•</span>
                                <span><strong>Blank or corrupted:</strong> Pages are solid black, blank, or heavily scrambled.</span>
                              </li>
                            </ul>
                          </div>

                          <div className="p-2 rounded-md bg-rose-500/10 dark:bg-rose-950/25 border border-rose-500/30 dark:border-rose-500/35 space-y-1">
                            <span className="text-[10px] font-mono uppercase text-rose-600 dark:text-rose-400 block font-bold tracking-wider">
                              Required Faxback Response:
                            </span>
                            <p className="text-xs font-mono font-medium text-foreground select-all leading-snug">
                              Incomplete document, please refax
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 pt-0">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => copyToClipboard("Incomplete document, please refax", "Copied phrase")}
                          className="text-xs h-7 px-2.5 gap-1.5 w-full font-medium bg-card/90 dark:bg-[#131924] hover:bg-muted/60 dark:bg-white/[0.05] active:scale-[0.97] transition-all duration-150 text-foreground/90 border border-border/70 dark:border-white/10 font-mono cursor-pointer shadow-2xs"
                        >
                          <Copy className="size-3" />
                          Copy Phrase
                        </Button>
                      </div>
                    </div>

                    {/* Scenario 3: Miscategorized / Wrong Document Type */}
                    <div className="rounded-xl bg-amber-500/10 dark:bg-amber-950/25/50 border-2 border-amber-500/35 dark:border-amber-500/40 shadow-xs overflow-hidden flex flex-col justify-between">
                      <div>
                        <div className="px-3 py-1.5 bg-amber-500/15 dark:bg-amber-950/35 border-b border-amber-500/30 dark:border-amber-500/35 flex items-center justify-between">
                          <span className="text-2xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase">
                            3. Wrong Document Type
                          </span>
                          <Badge className="bg-amber-600 text-white font-mono text-[10px] font-bold border-none shadow-2xs">
                            TL REVIEW FIRST
                          </Badge>
                        </div>
                        <div className="p-3.5 space-y-2.5 text-xs text-foreground/90">
                          <p className="text-2xs text-muted-foreground leading-relaxed">
                            If a non-referral document (e.g. ROI request, routine lab, clinic progress note) arrived in the Referral bucket by mistake:
                          </p>
                          <div className="p-2.5 rounded-lg bg-card/90 dark:bg-[#131924] border border-amber-500/30 dark:border-amber-500/35 text-2xs space-y-1 shadow-2xs">
                            <p className="font-bold text-amber-600 dark:text-amber-400">
                              ⚠️ Do NOT fax back on your own!
                            </p>
                            <p className="text-muted-foreground">
                              Show the document to your Team Lead (TL) first. Only after the TL confirms it is NOT a referral, add the required task note:
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 pt-0">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => copyToClipboard("Valarie Faxback Needed", "Copied note")}
                          className="text-xs h-7 px-2.5 gap-1.5 w-full font-medium bg-card/90 dark:bg-[#131924] hover:bg-muted/60 dark:bg-white/[0.05] active:scale-[0.97] transition-all duration-150 text-foreground/90 border border-border/70 dark:border-white/10 font-mono cursor-pointer shadow-2xs"
                        >
                          <Copy className="size-3" />
                          Copy: "Valarie Faxback Needed"
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════
                  FLOWCHART 6: ARCHIVE WORKFLOW
                  ══════════════════════════════════════════════════════════ */}
              {activeFlowchart === "banner-ads" && (
                <div className="w-full max-w-5xl mx-auto">

                  <div className="flex flex-col items-center">
                    <div className="px-5 py-2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono text-xs font-bold shadow-xs tracking-wide border border-amber-500/30">
                      Workflow: Archive
                    </div>
                    <VerticalArrow height={20} />
                  </div>

                  {/* Step 1: Source Check */}
                  <div className="max-w-md mx-auto rounded-xl bg-card/90 dark:bg-[#131924] border-2 border-border/90 dark:border-white/20 shadow-xs overflow-hidden">
                    <div className="px-3 py-1 bg-muted/60 dark:bg-white/[0.05] border-b border-border/70 dark:border-white/10 text-2xs font-mono font-bold text-muted-foreground flex items-center justify-between">
                      <span className="uppercase">Step 1: Check Who Sent This Fax</span>
                      <span className="text-muted-foreground">Archive / Keep Check</span>
                    </div>
                    <div className="p-3 text-center space-y-0.5">
                      <h4 className="text-sm font-bold text-foreground font-heading">
                        Identify Sender &amp; Document Source
                      </h4>
                      <p className="text-2xs text-muted-foreground">
                        Check whether this document must be archived or routed to clinical workflows
                      </p>
                    </div>
                  </div>

                  <BranchSplitter2
                    leftLabel="Banner Health / Abrazo Hospital"
                    rightLabel="Ads, Promotions & Junk Faxes"
                    leftColor="emerald"
                    rightColor="amber"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    {/* Banner Health Protocols */}
                    <div className="rounded-xl bg-card/90 dark:bg-[#131924] border-2 border-border/70 dark:border-white/10 shadow-xs overflow-hidden space-y-0">
                      <div className="px-3.5 py-2 bg-muted/60 dark:bg-white/[0.05] border-b border-border/70 dark:border-white/10 flex items-center justify-between text-2xs font-mono font-bold">
                        <span className="uppercase text-foreground">
                          Banner Health Protocols
                        </span>
                        <span className="text-muted-foreground text-[10px]">
                          Phoenix Heart Clarification
                        </span>
                      </div>

                      <div className="p-4 space-y-3.5 text-xs">
                        {/* Mandatory Multi-Patient & Verification Notice */}
                        <div className="p-3 rounded-xl bg-amber-500/10 dark:bg-amber-950/25 border border-amber-500/35 dark:border-amber-500/40 space-y-2">
                          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold font-mono text-2xs uppercase">
                            <ShieldAlert className="size-3.5 shrink-0" />
                            <span>Mandatory Pre-Filing Verification</span>
                          </div>
                          <ul className="text-2xs text-foreground/90 space-y-1.5 leading-relaxed">
                            <li className="flex items-start gap-1.5">
                              <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">•</span>
                              <span><strong>Multi-Patient Alert:</strong> Banner faxes frequently bundle records for multiple patients. If a document has &gt;1 patient or is unclear, <strong>do NOT file</strong>—flag for TL.</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">•</span>
                              <span><strong>Match Every Page:</strong> Confirm patient name and DOB on <em>every single page</em> match the target chart before filing.</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">•</span>
                              <span><strong>Progress Notes Rule:</strong> Never file progress notes from Banner Health without an attached Phoenix Heart letterhead request. Without PH letterhead, archive them.</span>
                            </li>
                          </ul>
                        </div>

                        {/* 1. Banner Health Clinics: KEEP */}
                        <div className="p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/25 border border-emerald-500/30 dark:border-emerald-500/35 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                              1. Banner Health Clinics
                            </span>
                            <Badge className="bg-emerald-600 text-white font-mono text-[10px] font-bold border-none">
                              KEEP &amp; FILE
                            </Badge>
                          </div>
                          <p className="text-2xs text-foreground/90 leading-relaxed">
                            Keep documents from <strong>Banner Health clinics</strong> and file them directly to the patient's chart. Do <strong>NOT</strong> archive them.
                          </p>
                          <p className="text-2xs text-muted-foreground">
                            ➔ Index using the standard indexing workflow for that specific document type.
                          </p>
                        </div>

                        {/* 2. Banner Imaging / Radiology: KEEP */}
                        <div className="p-3 rounded-xl bg-cyan-500/10 dark:bg-cyan-950/25 border border-cyan-500/30 dark:border-cyan-500/35 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-cyan-600 dark:text-cyan-400 font-mono text-xs">
                              2. Banner Imaging &amp; Radiology
                            </span>
                            <Badge className="bg-cyan-600 text-white font-mono text-[10px] font-bold border-none">
                              KEEP (IMAGING)
                            </Badge>
                          </div>
                          <p className="text-2xs text-foreground/90 leading-relaxed">
                            Imaging and radiology reports sent from <strong>Banner Imaging</strong>, or documents with <strong>Phoenix Heart (PH) Letterhead</strong>, are kept.
                          </p>
                          <p className="text-2xs text-muted-foreground">
                            ➔ Follow the standard Imaging workflow.
                          </p>
                        </div>

                        {/* 3. Banner Health Hospitals: ARCHIVE UNLESS PH REQUESTED */}
                        <div className="p-3 rounded-xl bg-card/95 dark:bg-[#141a24] border border-border/80 dark:border-white/10 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-foreground font-mono text-xs">
                              3. Banner Health Hospitals
                            </span>
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                              BTMC · BEMC · BBWMC · BUMC
                            </span>
                          </div>
                          <p className="text-2xs text-muted-foreground leading-relaxed">
                            Banner hospitals include: <strong>Banner Thunderbird (BTMC)</strong>, <strong>Banner Estrella (BEMC)</strong>, <strong>Banner Boswell (BBWMC)</strong>, <strong>Banner University Medical (BUMC)</strong>, and Abrazo hospitals.
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            <div className="p-2.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-950/25 border border-emerald-500/30 dark:border-emerald-500/35 space-y-1">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-2xs block">
                                WITH PH REQUEST ATTACHED:
                              </span>
                              <p className="text-2xs text-foreground/90 leading-snug">
                                <strong>KEEP:</strong> If Phoenix Heart requested the records (PH request attached), file them to chart.
                              </p>
                            </div>

                            <div className="p-2.5 rounded-lg bg-rose-500/10 dark:bg-rose-950/25 border border-rose-500/30 dark:border-rose-500/35 space-y-1">
                              <span className="font-bold text-rose-600 dark:text-rose-400 text-2xs block">
                                WITHOUT PH REQUEST:
                              </span>
                              <p className="text-2xs text-foreground/90 leading-snug">
                                <strong>ARCHIVE IMMEDIATELY:</strong> Archive hospital records (H&amp;Ps, labs, discharge summaries, unsolicited progress notes).
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Advertisements */}
                    <div className="rounded-xl bg-card/90 dark:bg-[#131924] border-2 border-border/70 dark:border-white/10 shadow-xs overflow-hidden">
                      <div className="px-3 py-1 bg-amber-500/10 dark:bg-amber-950/25 border-b border-amber-500/30 dark:border-amber-500/35 text-2xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase">
                        Advertisements & Marketing Faxes
                      </div>
                      <div className="p-4 space-y-3 text-xs">
                        <div className="p-2.5 rounded-lg bg-amber-500/10 dark:bg-amber-950/25 border border-amber-500/30 dark:border-amber-500/35 space-y-1">
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            Medication & Drug Promotions:
                          </span>
                          <p className="text-muted-foreground">File under Category: <strong>Admin</strong> → Assign to: <strong>Dr. Khan</strong> (if no specific doctor is named).</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-muted/60 dark:bg-white/[0.05] border border-border/70 dark:border-white/10 space-y-1">
                          <span className="font-bold text-foreground">
                            All Other Advertisements & Spam Faxes:
                          </span>
                          <p className="text-muted-foreground">Archive immediately. Never fax back spam.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
  );
}
