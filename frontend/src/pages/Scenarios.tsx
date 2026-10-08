import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  INDEXING_DOC_TYPES,
  INBOX_LABELS,
  TEST_PATIENTS,
} from "@/data/scenariosData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Copy,
  FileText,
  ShieldAlert,
  GitFork,
  CheckCircle2,
  XCircle,
  Tags,
  X,
  CornerDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "flowcharts" | "pipeline-lookup" | "reference";
type FlowchartKey = "roi" | "indexable" | "ekg" | "cath" | "referral" | "banner-ads";

// ── Shared SVG Connector Components for System Flowcharts ─────────────
function VerticalArrow({ height = 22, className }: { height?: number; className?: string }) {
  return (
    <div className={cn("flex justify-center items-center w-full shrink-0 select-none", className)}>
      <svg
        width="16"
        height={height}
        viewBox={`0 0 16 ${height}`}
        className="text-slate-400 block overflow-visible"
      >
        <line
          x1="8"
          y1="0"
          x2="8"
          y2={height - 6}
          stroke="currentColor"
          strokeWidth="2"
        />
        <polygon
          points={`4,${height - 6} 8,${height} 12,${height - 6}`}
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

function BranchSplitter2({
  leftLabel,
  rightLabel,
  leftColor = "emerald",
  rightColor = "amber",
  ratio = "50-50",
}: {
  leftLabel: string;
  rightLabel: string;
  leftColor?: "emerald" | "purple" | "red";
  rightColor?: "amber" | "red" | "emerald";
  ratio?: "50-50" | "33-67" | "67-33";
}) {
  const is3367 = ratio === "33-67";
  const is6733 = ratio === "67-33";
  const leftX = is3367 ? 16.67 : is6733 ? 33.33 : 25;
  const rightX = is3367 ? 66.67 : is6733 ? 83.33 : 75;

  return (
    <div className="w-full select-none">
      {/* SVG Fork Bar (visible on multi-column screens) */}
      <div className={cn("w-full", is6733 ? "hidden sm:block" : "hidden md:block")}>
        <svg
          className="w-full h-5 text-slate-400 block overflow-visible"
          viewBox="0 0 100 20"
          preserveAspectRatio="none"
        >
          {/* Top stem from decision node - starts at y=0 touching parent node */}
          <line
            x1="50"
            y1="0"
            x2="50"
            y2="10"
            stroke="currentColor"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          {/* Horizontal crossbar */}
          <line
            x1={leftX}
            y1="10"
            x2={rightX}
            y2="10"
            stroke="currentColor"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          {/* Left drop line touching label pill */}
          <line
            x1={leftX}
            y1="10"
            x2={leftX}
            y2="20"
            stroke="currentColor"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          {/* Right drop line touching label pill */}
          <line
            x1={rightX}
            y1="10"
            x2={rightX}
            y2="20"
            stroke="currentColor"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      {/* Mobile stem */}
      <div className={cn("flex justify-center", is6733 ? "sm:hidden" : "md:hidden")}>
        <VerticalArrow height={18} />
      </div>

      {/* Branch pill labels and directional down arrows to destination cards */}
      <div
        className={cn(
          "w-full",
          is3367 && "grid grid-cols-1 md:grid-cols-12 gap-4",
          is6733 && "grid grid-cols-1 sm:grid-cols-12 gap-3",
          !is3367 && !is6733 && "grid grid-cols-1 md:grid-cols-2 gap-4",
        )}
      >
        <div className={cn("flex flex-col items-center", is3367 && "md:col-span-4", is6733 && "sm:col-span-8")}>
          <span
            className={cn(
              "px-3 py-1 rounded-full text-2xs font-mono font-bold uppercase shadow-2xs border bg-white leading-tight",
              leftColor === "emerald" && "bg-emerald-50 text-emerald-700 border-emerald-300",
              leftColor === "purple" && "bg-purple-50 text-purple-700 border-purple-300",
              leftColor === "red" && "bg-red-50 text-red-700 border-red-300",
            )}
          >
            {leftLabel}
          </span>
          <VerticalArrow height={18} />
        </div>

        <div className={cn("flex flex-col items-center", is3367 && "md:col-span-8", is6733 && "sm:col-span-4")}>
          <span
            className={cn(
              "px-3 py-1 rounded-full text-2xs font-mono font-bold uppercase shadow-2xs border bg-white leading-tight",
              rightColor === "amber" && "bg-amber-50 text-amber-800 border-amber-300",
              rightColor === "red" && "bg-red-50 text-red-700 border-red-300",
              rightColor === "emerald" && "bg-emerald-50 text-emerald-700 border-emerald-300",
            )}
          >
            {rightLabel}
          </span>
          <VerticalArrow height={18} />
        </div>
      </div>
    </div>
  );
}

export default function ScenariosPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("flowcharts");
  const [activeFlowchart, setActiveFlowchart] = useState<FlowchartKey>("roi");

  // Pipeline lookup search
  const [lookupSearch, setLookupSearch] = useState("");

  // Reference quick tab
  const [refTab, setRefTab] = useState<"labels" | "patients">("labels");
  const [labelSearch, setLabelSearch] = useState("");

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
    <main className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-4 py-3 sm:py-4 bg-background">
      <div className="w-full space-y-4">
        {/* Top Header Card */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <GitFork className="size-4" />
              </span>
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground font-heading">
                Inbox Process Guide
              </h1>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Step-by-step intake guides for checking patient records in NextGen and Athena, splitting multi-patient files, routing to buckets, and faxback rules.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/70 self-start lg:self-auto overflow-x-auto shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("flowcharts")}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring",
                viewMode === "flowcharts"
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {viewMode === "flowcharts" && (
                <motion.div
                  layoutId="active-viewmode-pill"
                  className="absolute inset-0 bg-background rounded-lg shadow-2xs"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <GitFork className="size-3.5 text-primary" />
                Step-by-Step Flowcharts
              </span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("pipeline-lookup")}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring",
                viewMode === "pipeline-lookup"
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {viewMode === "pipeline-lookup" && (
                <motion.div
                  layoutId="active-viewmode-pill"
                  className="absolute inset-0 bg-background rounded-lg shadow-2xs"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <FileText className="size-3.5 text-blue-500" />
                Document Routing Guide
              </span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("reference")}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring",
                viewMode === "reference"
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {viewMode === "reference" && (
                <motion.div
                  layoutId="active-viewmode-pill"
                  className="absolute inset-0 bg-background rounded-lg shadow-2xs"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Tags className="size-3.5 text-emerald-500" />
                Approved Labels & Test Patients
              </span>
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>

        {/* ══════════════════════════════════════════════════════════════════
            MODE 1: ARCHITECTURAL SYSTEM DESIGN FLOWCHARTS
            ══════════════════════════════════════════════════════════════════ */}
        {viewMode === "flowcharts" && (
          <motion.div
            key="flowcharts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-4"
          >
            {/* Flowchart Diagram Selector Strip */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5">
              {[
                { key: "roi", label: "ROI" },
                { key: "indexable", label: "Indexable" },
                { key: "ekg", label: "EKG" },
                { key: "cath", label: "Cath Lab" },
                { key: "referral", label: "Patient Referrals" },
                { key: "banner-ads", label: "Archive" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveFlowchart(tab.key as FlowchartKey)}
                  className={cn(
                    "relative px-3 py-1.5 rounded-xl text-xs font-medium border cursor-pointer shrink-0 flex items-center gap-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    activeFlowchart === tab.key
                      ? "text-primary-foreground border-transparent font-semibold shadow-xs"
                      : "bg-card hover:bg-muted/70 text-foreground border-border/80",
                  )}
                >
                  {activeFlowchart === tab.key && (
                    <motion.div
                      layoutId="active-flowchart-pill"
                      className="absolute -inset-px bg-primary rounded-xl"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span
                    className={cn(
                      "relative z-10 size-2 rounded-full transition-colors",
                      activeFlowchart === tab.key ? "bg-primary-foreground" : "bg-muted-foreground/40",
                    )}
                  />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* FLOWCHART CANVAS */}
            <div
              className="flowchart-light-canvas border border-slate-200/90 rounded-2xl p-3 sm:p-6 shadow-sm relative overflow-hidden bg-slate-50 text-slate-900"
              style={{
                backgroundImage:
                  "radial-gradient(circle, #cbd5e1 1.2px, transparent 1.2px)",
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
                    <div className="px-5 py-2 rounded-full bg-blue-600 text-white font-mono text-xs font-bold shadow-sm tracking-wide border border-blue-400/40">
                      Workflow: ROI (Medical Records Request)
                    </div>
                    <VerticalArrow height={20} />
                  </div>

                  {/* SPECIAL CASE: Multiple Patients in ROI */}
                  <div className="max-w-2xl mx-auto rounded-xl bg-amber-50/20 border-2 border-amber-400/80 shadow-xs overflow-hidden">
                    <div className="px-3.5 py-1.5 bg-amber-100/70 border-b border-amber-200/90 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xs font-mono font-bold text-amber-800 uppercase bg-amber-200/70 px-1.5 py-0.5 rounded border border-amber-300/80">
                          Special Case
                        </span>
                        <span className="text-xs font-bold text-slate-900 font-heading">
                          Multiple Patients in One ROI Document
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Case A: Splittable across pages */}
                      <div className="p-3 rounded-lg bg-white border border-amber-200/80 shadow-2xs flex flex-col justify-between space-y-2">
                        <div className="space-y-1">
                          <span className="text-2xs font-mono font-bold text-amber-800 block uppercase">
                            Case A • Pages Can Be Split
                          </span>
                          <p className="font-semibold text-slate-900 leading-snug">
                            Patients are on separate pages:
                          </p>
                          <p className="text-2xs text-slate-600 leading-relaxed">
                            Split the PDF into separate files so each patient has their own dedicated file. Once split, process and move each into the <strong>ROI Bucket</strong>.
                          </p>
                        </div>
                        <div className="pt-1">
                          <span className="inline-flex items-center gap-1 text-2xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="size-3" />
                            Split ➔ Move to ROI Bucket
                          </span>
                        </div>
                      </div>

                      {/* Case B: Bundled / Cannot be split */}
                      <div className="p-3 rounded-lg bg-white border border-amber-200/80 shadow-2xs flex flex-col justify-between space-y-2">
                        <div className="space-y-1">
                          <span className="text-2xs font-mono font-bold text-amber-800 block uppercase">
                            Case B • Same Page / Cannot Split
                          </span>
                          <p className="font-semibold text-slate-900 leading-snug">
                            Multiple patients are on the same page:
                          </p>
                          <p className="text-2xs text-slate-600 leading-relaxed">
                            In Inbox task, write note <code className="font-bold text-amber-900 bg-amber-100 px-1 py-0.5 rounded border border-amber-200">Multiple Pts</code> and push document directly to the <strong>ROI Bucket</strong>.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => copyToClipboard("Multiple Pts", "Copied note 'Multiple Pts'")}
                          className="text-xs h-7 px-2 gap-1.5 w-full font-medium bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-mono"
                        >
                          <Copy className="size-3" />
                          Copy Note: "Multiple Pts"
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Flow continues down to standard Single Patient flow */}
                  <div className="flex flex-col items-center">
                    <VerticalArrow height={18} />
                    <span className="text-2xs font-mono text-slate-500 uppercase tracking-wider bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                      Standard Flow: Single Patient ROI
                    </span>
                    <VerticalArrow height={18} />
                  </div>

                  {/* STEP 1: NextGen Search */}
                  <div className="max-w-xl mx-auto rounded-xl bg-white border-2 border-emerald-600/70 shadow-xs overflow-hidden">
                    <div className="px-3 py-1 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between text-2xs font-mono">
                      <span className="font-bold text-emerald-700 uppercase">Step 1: Check NextGen First</span>
                      <span className="text-slate-500">Main NextGen Search</span>
                    </div>
                    <div className="p-3 text-center space-y-0.5">
                      <h4 className="text-sm font-bold text-slate-900">
                        Find the Patient in NextGen
                      </h4>
                      <p className="text-2xs text-slate-500">
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
                    <div className="md:col-span-4 flex flex-col justify-between rounded-xl bg-emerald-50 border-2 border-emerald-500/40 shadow-xs overflow-hidden">
                      <div className="px-3 py-1 bg-emerald-100/70 border-b border-emerald-200 flex items-center justify-between">
                        <span className="text-2xs font-mono font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="size-3.5" />
                          What to Do: Patient Found
                        </span>
                      </div>
                      <div className="p-3.5 space-y-1.5">
                        <p className="text-xs font-bold text-slate-900">
                          Move to ROI Bucket
                        </p>
                        <p className="text-2xs text-slate-600 leading-relaxed">
                          If you find and match the patient here, move the document straight to the ROI Bucket. Make sure the category selected is ROI. (Do NOT send to indexing and do NOT fax back).
                        </p>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: STEP 2 ATHENA CHECK & OUTCOMES */}
                    <div className="md:col-span-8">
                      {/* Step 2: Athena Search */}
                      <div className="rounded-xl bg-white border-2 border-amber-500/70 shadow-xs overflow-hidden">
                        <div className="px-3 py-1 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-2xs font-mono">
                          <span className="font-bold text-amber-800 uppercase">
                            Step 2: Check Athena Next
                          </span>
                          <span className="text-slate-500">Athena Lookup</span>
                        </div>
                        <div className="p-3 text-center space-y-0.5">
                          <h4 className="text-sm font-bold text-slate-900">
                            Did you find the patient in Athena?
                          </h4>
                          <p className="text-2xs text-slate-500">
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
                        <div className="sm:col-span-8 rounded-xl bg-emerald-50/30 border-2 border-emerald-300/70 shadow-2xs overflow-hidden flex flex-col justify-between">
                          <div className="px-3 py-1.5 bg-emerald-100/70 border-b border-emerald-200/90 flex items-center justify-between gap-2 text-2xs font-mono">
                            <span className="font-bold text-emerald-900 uppercase tracking-tight flex items-center gap-1.5 whitespace-nowrap text-[11px]">
                              <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                              Found in Athena • Check History
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 shrink-0 whitespace-nowrap">
                              2 Outcomes
                            </span>
                          </div>

                          <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1 items-stretch">
                            {/* Case 1: Empty visits */}
                            <div className="p-3 rounded-lg bg-white border border-emerald-200/70 shadow-2xs flex flex-col justify-between space-y-2.5">
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-wide bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 inline-block">
                                  Outcome 1
                                </span>
                                <h5 className="text-xs font-bold text-slate-900 block tracking-tight font-heading">
                                  No Visits / Empty Chart
                                </h5>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                  Patient exists in Athena, but has 0 visits or an empty chart.
                                </p>
                              </div>

                              <div className="p-2 rounded-md bg-amber-50/70 border border-amber-200/80 space-y-1">
                                <span className="text-[10px] font-mono uppercase text-amber-800 block font-bold tracking-wider">
                                  Faxback Response:
                                </span>
                                <p className="text-xs font-mono font-medium text-slate-900 select-all leading-snug">
                                  Medical records not available for patient
                                </p>
                              </div>

                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => copyToClipboard("Medical records not available for patient", "Copied phrase")}
                                className="text-xs h-7 px-2 gap-1.5 w-full font-medium bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-mono"
                              >
                                <Copy className="size-3" />
                                Copy Phrase
                              </Button>
                            </div>

                            {/* Case 2: Old visits */}
                            <div className="p-3 rounded-lg bg-white border border-emerald-200/70 shadow-2xs flex flex-col justify-between space-y-2.5">
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-wide bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 inline-block">
                                  Outcome 2
                                </span>
                                <h5 className="text-xs font-bold text-slate-900 block tracking-tight font-heading">
                                  Found Only Old Visits eg. 2021, 2022, 2023, etc
                                </h5>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                  Patient was seen previously, but has no recent visits.
                                </p>
                              </div>

                              <div className="p-2 rounded-md bg-amber-50/70 border border-amber-200/80 space-y-1">
                                <span className="text-[10px] font-mono uppercase text-amber-800 block font-bold tracking-wider">
                                  Faxback Response:
                                </span>
                                <p className="text-xs font-mono font-medium text-slate-900 select-all leading-snug">
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
                                className="text-xs h-7 px-2 gap-1.5 w-full font-medium bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-mono"
                              >
                                <Copy className="size-3" />
                                Copy Phrase
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* RIGHT CONTAINER: Not in NextGen OR Athena */}
                        <div className="sm:col-span-4 rounded-xl bg-rose-50/30 border-2 border-rose-300/70 shadow-2xs overflow-hidden flex flex-col justify-between">
                          <div className="px-2.5 py-1.5 bg-rose-100/70 border-b border-rose-200/90 flex items-center justify-between gap-1 text-2xs font-mono">
                            <span className="font-bold text-rose-900 uppercase tracking-tight flex items-center gap-1.5 whitespace-nowrap text-[11px]">
                              <XCircle className="size-3.5 text-rose-600 shrink-0" />
                              Not in Athena
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-200/70 text-rose-900 shrink-0 whitespace-nowrap">
                              Missing in Both
                            </span>
                          </div>

                          <div className="p-2.5 flex flex-col flex-1 items-stretch">
                            {/* Case 3: Missing in both */}
                            <div className="p-3 rounded-lg bg-white border border-rose-200/70 shadow-2xs flex flex-col justify-between space-y-2.5 flex-1">
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono font-bold text-rose-700 uppercase tracking-wide bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/60 inline-block">
                                  Outcome 3
                                </span>
                                <h5 className="text-xs font-bold text-slate-900 block tracking-tight font-heading">
                                  Not in NextGen OR Athena
                                </h5>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                  Patient does not exist in either NextGen or Athena.
                                </p>
                              </div>

                              <div className="p-2 rounded-md bg-rose-50/70 border border-rose-200/80 space-y-1">
                                <span className="text-[10px] font-mono uppercase text-rose-800 block font-bold tracking-wider">
                                  Faxback Response:
                                </span>
                                <p className="text-xs font-mono font-medium text-slate-900 select-all leading-snug">
                                  No patient found, please update your system
                                </p>
                              </div>

                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => copyToClipboard("No patient found, please update your system", "Copied phrase")}
                                className="text-xs h-7 px-2 gap-1.5 w-full font-medium bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-mono"
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
                    <div className="px-5 py-2 rounded-full bg-purple-600 text-white font-mono text-xs font-bold shadow-sm tracking-wide">
                      Workflow: Indexable
                    </div>
                    <VerticalArrow height={18} />
                  </div>

                  {/* STEP 1: Identify Document Type */}
                  <div className="max-w-xl mx-auto rounded-xl bg-white border-2 border-purple-500/70 shadow-xs overflow-hidden">
                    <div className="px-3 py-1 bg-purple-50 border-b border-purple-200 flex items-center justify-between text-2xs font-mono">
                      <span className="font-bold text-purple-700 uppercase">
                        Step 1: Identify Document Type
                      </span>
                      <span className="text-slate-500">Document Classification</span>
                    </div>
                    <div className="p-3 text-center space-y-1">
                      <h4 className="text-sm font-bold text-slate-900 font-heading">
                        Identify the Document Type
                      </h4>
                      <p className="text-2xs text-slate-600 max-w-md mx-auto leading-relaxed">
                        Determine document category (Labs, Progress Notes, Orders, Rx, Billing, or <strong>Cardiac Clearance</strong>).
                      </p>
                    </div>
                  </div>

                  {/* Connector Arrow */}
                  <div className="flex justify-center">
                    <VerticalArrow height={18} />
                  </div>

                  {/* STEP 2: Patient Lookup in NextGen */}
                  <div className="max-w-xl mx-auto rounded-xl bg-white border-2 border-emerald-600/70 shadow-xs overflow-hidden">
                    <div className="px-3 py-1 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between text-2xs font-mono">
                      <span className="font-bold text-emerald-700 uppercase">
                        Step 2: Find the Patient
                      </span>
                      <span className="text-slate-500">Primary NextGen EHR Lookup</span>
                    </div>
                    <div className="p-3 text-center space-y-1">
                      <h4 className="text-sm font-bold text-slate-900 font-heading">
                        Search Patient in NextGen First
                      </h4>
                      <p className="text-2xs text-slate-600 max-w-md mx-auto leading-relaxed">
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
                      <div className="rounded-xl bg-emerald-50/40 border-2 border-emerald-300/80 shadow-xs overflow-hidden">
                        <div className="px-3.5 py-1.5 bg-emerald-100/70 border-b border-emerald-200/90 flex items-center justify-between text-2xs font-mono">
                          <span className="font-bold text-emerald-900 uppercase flex items-center gap-1.5">
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                            Patient Available: Details & Note Rules
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900">
                            NextGen Verified
                          </span>
                        </div>

                        <div className="p-3.5 space-y-2.5 text-xs">
                          {/* 1. Verify Details */}
                          <div className="p-2.5 rounded-lg bg-white border border-emerald-200 space-y-1 shadow-2xs">
                            <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs font-heading">
                              <span className="flex items-center justify-center size-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold">1</span>
                              Verify All Patient Details Thoroughly
                            </span>
                            <p className="text-2xs text-slate-600 leading-relaxed">
                              Double-check patient demographics: First Name, Last Name, Date of Birth against NextGen.
                            </p>
                          </div>

                          {/* 2. Provider Task Note Format */}
                          <div className="p-2.5 rounded-lg bg-white border border-emerald-200 space-y-1.5 shadow-2xs">
                            <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs font-heading">
                              <span className="flex items-center justify-center size-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold">2</span>
                              Task Note Format: Document Type + Provider's Last Name
                            </span>
                            <div className="p-2 rounded-md bg-emerald-50 border border-emerald-200/70 text-2xs font-mono text-emerald-950">
                              <strong>Note Format:</strong> <code>[Document Type] - [Provider's Last Name]</code>
                            </div>
                            <ul className="text-2xs text-slate-700 space-y-1 pl-1">
                              <li className="flex items-start gap-1.5">
                                <span className="text-emerald-700 font-bold shrink-0">•</span>
                                <span><strong>Provider name on document:</strong> Use the provider's last name mentioned in the received document.</span>
                              </li>
                              <li className="flex items-start gap-1.5">
                                <span className="text-emerald-700 font-bold shrink-0">•</span>
                                <span><strong>Provider name NOT mentioned:</strong> Find the patient's assigned provider in <strong>NextGen</strong> and use that provider's last name.</span>
                              </li>
                              <li className="flex items-start gap-1.5">
                                <span className="text-emerald-700 font-bold shrink-0">•</span>
                                <span><strong>Outside provider mentioned (not ours):</strong> Look up our Phoenix Heart provider in <strong>NextGen</strong> and use our provider's last name.</span>
                              </li>
                            </ul>
                          </div>

                          {/* 3. Move to Indexing Bucket */}
                          <div className="p-2.5 rounded-lg bg-white border border-emerald-200 space-y-1 shadow-2xs">
                            <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs font-heading">
                              <span className="flex items-center justify-center size-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold">3</span>
                              Move to Indexing Bucket
                            </span>
                            <p className="text-2xs text-slate-600 leading-relaxed">
                              Once patient demographics are verified and the task note is formatted, move the document into the <strong>Indexing Bucket</strong>.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Patient Not in NextGen -> Athena Check & Outcomes */}
                    <div className="md:col-span-8 flex flex-col">
                      {/* Step 3: Check Athena */}
                      <div className="rounded-xl bg-white border-2 border-amber-500/70 shadow-xs overflow-hidden">
                        <div className="px-3 py-1 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-2xs font-mono">
                          <span className="font-bold text-amber-800 uppercase">
                            Step 3: Check Athena Next
                          </span>
                          <span className="text-slate-500">Secondary EHR Lookup</span>
                        </div>
                        <div className="p-3 text-center space-y-0.5">
                          <h4 className="text-sm font-bold text-slate-900 font-heading">
                            Did you find the patient in Athena?
                          </h4>
                          <p className="text-2xs text-slate-500">
                            If patient is not available in NextGen, search Athena before faxing back.
                          </p>
                        </div>
                      </div>

                      {/* Vertical connector from Step 3 to Cardiac Clearance Exception */}
                      <VerticalArrow height={18} />

                      {/* SPECIAL RULE: Cardiac Clearance Exception */}
                      <div className="rounded-xl bg-purple-50 border-2 border-purple-400/80 shadow-xs overflow-hidden">
                        <div className="px-3.5 py-1.5 bg-purple-100/70 border-b border-purple-200 flex items-center justify-between text-2xs font-mono">
                          <span className="font-bold text-purple-800 uppercase flex items-center gap-1.5">
                            <ShieldAlert className="size-3.5 text-purple-600" />
                            Cardiac Clearance Exception
                          </span>
                          <Badge className="bg-purple-600 text-white text-[10px] font-mono font-bold tracking-wider border-none shadow-2xs">
                            NEVER FAX BACK
                          </Badge>
                        </div>
                        <div className="p-3.5 space-y-2 text-xs">
                          <p className="font-semibold text-slate-900 leading-snug">
                            Patient NOT in NextGen &amp; Document is a Cardiac Clearance:
                          </p>
                          <div className="p-2 rounded-md bg-purple-100/90 border border-purple-300 text-purple-950 font-medium text-2xs leading-relaxed">
                            ⚠️ <strong>Crucial Exception:</strong> Even if the patient is <strong>found in Athena</strong> (or missing in both systems), it will <strong>STILL be considered as a Referral</strong>! NEVER fax back a cardiac clearance!
                          </div>
                          <div className="p-2.5 rounded-lg bg-white border border-purple-200 font-mono text-xs space-y-1 text-slate-800 shadow-2xs">
                            <p className="text-purple-700 font-bold">
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
                        <div className="sm:col-span-8 rounded-xl bg-emerald-50/30 border-2 border-emerald-300/70 shadow-2xs overflow-hidden flex flex-col justify-between">
                          <div className="px-3 py-1.5 bg-emerald-100/70 border-b border-emerald-200/90 flex items-center justify-between gap-2 text-2xs font-mono">
                            <span className="font-bold text-emerald-900 uppercase tracking-tight flex items-center gap-1.5 whitespace-nowrap text-[11px]">
                              <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                              Found in Athena • Check History
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 shrink-0 whitespace-nowrap">
                              2 Outcomes
                            </span>
                          </div>

                          <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1 items-stretch">
                            {/* Outcome 1: Chart in Athena Only */}
                            <div className="p-3 rounded-lg bg-white border border-emerald-200/70 shadow-2xs flex flex-col justify-between space-y-2.5">
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-wide bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 inline-block">
                                  Outcome 1
                                </span>
                                <h5 className="text-xs font-bold text-slate-900 block tracking-tight font-heading">
                                  Chart in Athena Only
                                </h5>
                                <p className="text-2xs text-slate-600 leading-relaxed">
                                  Patient exists in Athena, but is missing in NextGen.
                                </p>
                              </div>

                              <div className="p-2 rounded-md bg-amber-50/70 border border-amber-200/80 space-y-1">
                                <span className="text-[10px] font-mono uppercase text-amber-800 block font-bold tracking-wider">
                                  Faxback Response:
                                </span>
                                <p className="text-xs font-mono font-medium text-slate-900 select-all leading-snug">
                                  Patient not seen by Phoenix heart
                                </p>
                              </div>

                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => copyToClipboard("Patient not seen by Phoenix heart", "Copied phrase")}
                                className="text-xs h-7 px-2 gap-1.5 w-full font-medium bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-mono"
                              >
                                <Copy className="size-3" />
                                Copy Phrase
                              </Button>
                            </div>

                            {/* Outcome 2: Found Only Old Visits */}
                            <div className="p-3 rounded-lg bg-white border border-emerald-200/70 shadow-2xs flex flex-col justify-between space-y-2.5">
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-wide bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 inline-block">
                                  Outcome 2
                                </span>
                                <h5 className="text-xs font-bold text-slate-900 block tracking-tight font-heading">
                                  Found Only Old Visits eg. 2021, 2022, 2023, etc
                                </h5>
                                <p className="text-2xs text-slate-600 leading-relaxed">
                                  Patient was seen previously, but has no recent visits.
                                </p>
                              </div>

                              <div className="p-2 rounded-md bg-amber-50/70 border border-amber-200/80 space-y-1">
                                <span className="text-[10px] font-mono uppercase text-amber-800 block font-bold tracking-wider">
                                  Faxback Response:
                                </span>
                                <p className="text-xs font-mono font-medium text-slate-900 select-all leading-snug">
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
                                className="text-xs h-7 px-2 gap-1.5 w-full font-medium bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-mono"
                              >
                                <Copy className="size-3" />
                                Copy Phrase
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* RIGHT CONTAINER: Not in NextGen OR Athena */}
                        <div className="sm:col-span-4 rounded-xl bg-rose-50/30 border-2 border-rose-300/70 shadow-2xs overflow-hidden flex flex-col justify-between">
                          <div className="px-2.5 py-1.5 bg-rose-100/70 border-b border-rose-200/90 flex items-center justify-between gap-1 text-2xs font-mono">
                            <span className="font-bold text-rose-900 uppercase tracking-tight flex items-center gap-1.5 whitespace-nowrap text-[11px]">
                              <XCircle className="size-3.5 text-rose-600 shrink-0" />
                              Not in Athena
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-200/70 text-rose-900 shrink-0 whitespace-nowrap">
                              Missing in Both
                            </span>
                          </div>

                          <div className="p-2.5 flex flex-col flex-1 items-stretch">
                            {/* Case 3: Missing in both */}
                            <div className="p-3 rounded-lg bg-white border border-rose-200/70 shadow-2xs flex flex-col justify-between space-y-2.5 flex-1">
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono font-bold text-rose-700 uppercase tracking-wide bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/60 inline-block">
                                  Missing in Both
                                </span>
                                <h5 className="text-xs font-bold text-slate-900 block tracking-tight font-heading">
                                  Not in NextGen OR Athena
                                </h5>
                                <p className="text-2xs text-slate-600 leading-relaxed">
                                  Patient does not exist in either NextGen or Athena.
                                </p>
                              </div>

                              <div className="p-2 rounded-md bg-rose-50/70 border border-rose-200/80 space-y-1">
                                <span className="text-[10px] font-mono uppercase text-rose-800 block font-bold tracking-wider">
                                  Faxback Response:
                                </span>
                                <p className="text-xs font-mono font-medium text-slate-900 select-all leading-snug">
                                  No patient found, please update your system
                                </p>
                              </div>

                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => copyToClipboard("No patient found, please update your system", "Copied phrase")}
                                className="text-xs h-7 px-2 gap-1.5 w-full font-medium bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-mono"
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
                    <div className="px-5 py-2 rounded-full bg-red-600 text-white font-mono text-xs font-bold shadow-sm tracking-wide">
                      Workflow: EKG
                    </div>
                    <VerticalArrow height={20} />
                  </div>

                  {/* Step 1: Multi-Patient Check */}
                  <div className="max-w-md mx-auto rounded-xl bg-white border-2 border-red-500/70 shadow-xs overflow-hidden">
                    <div className="px-3 py-1 bg-red-50 border-b border-red-200 flex items-center justify-between text-2xs font-mono">
                      <span className="font-bold text-red-700 uppercase">
                        Step 1: Check Pages
                      </span>
                      <span className="text-slate-500">HIPAA Rule: Check All Pages</span>
                    </div>
                    <div className="p-3 text-center space-y-0.5">
                      <h4 className="text-sm font-bold text-slate-900">
                        Are multiple patients bundled in this single PDF?
                      </h4>
                      <p className="text-2xs text-slate-500">
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
                      <div className="rounded-xl bg-red-50 border-2 border-red-300 shadow-xs overflow-hidden">
                        <div className="px-3 py-1 bg-red-100/70 border-b border-red-200 flex items-center justify-between">
                          <span className="text-2xs font-mono font-bold text-red-700 flex items-center gap-1">
                            <ShieldAlert className="size-3.5" />
                            Action Required: Split PDF First
                          </span>
                          <Badge className="bg-red-600 text-white text-2xs border-none">
                            HIPAA WARNING
                          </Badge>
                        </div>
                        <div className="p-3.5 space-y-2 text-xs text-slate-800">
                          <p className="font-bold text-red-700">
                            Do NOT index together: Split into separate files!
                          </p>
                          <p className="text-2xs text-slate-600 leading-relaxed">
                            1. Split the PDF so each patient has their own dedicated file (e.g. 10 patients = 10 separate PDFs).
                          </p>
                          <p className="text-2xs text-slate-600 leading-relaxed">
                            2. Never index a multiple pts EKG into a single patient chart (severe HIPAA violation).
                          </p>
                        </div>
                      </div>

                      {/* Transition: Next Step becomes Single Patient */}
                      <div className="flex flex-col items-center">
                        <VerticalArrow height={16} />
                        <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 text-2xs font-mono font-bold shadow-2xs flex items-center gap-1.5">
                          <CheckCircle2 className="size-3" />
                          <span>Next Step: Split the Document</span>
                        </div>
                        <VerticalArrow height={16} />
                      </div>

                      {/* Converted state box */}
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                        <span className="font-bold text-emerald-700 block font-mono text-2xs">
                          Each Split Document is Now a Single Patient File
                        </span>
                        <p className="text-2xs text-slate-800 leading-relaxed">
                          Once split page-wise, each individual document is now processed as a <strong>Single Patient</strong> file. Follow the Indexing Setup on the right ➔
                        </p>
                      </div>
                    </div>

                    {/* Single Patient Branch */}
                    <div className="rounded-xl bg-emerald-50 border-2 border-emerald-300 shadow-xs overflow-hidden">
                      <div className="px-3 py-1 bg-emerald-100/70 border-b border-emerald-200 flex items-center justify-between">
                        <span className="text-2xs font-mono font-bold text-emerald-700">
                          EKG Workflow
                        </span>
                      </div>
                      <div className="p-4 space-y-2 text-xs">
                        <div className="p-3.5 bg-white rounded-lg border border-emerald-200 font-mono text-xs space-y-2 text-slate-800 shadow-2xs">
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
                          <p className="flex items-start gap-2 text-emerald-800 font-bold">
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
                    <div className="px-5 py-2 rounded-full bg-emerald-600 text-white font-mono text-xs font-bold shadow-sm tracking-wide">
                      Workflow: Cath Lab
                    </div>
                    <VerticalArrow height={20} />
                  </div>

                  <div className="rounded-xl bg-white border-2 border-emerald-500/60 shadow-xs overflow-hidden">
                    <div className="px-3.5 py-1.5 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between text-2xs font-mono">
                      <span className="font-bold text-emerald-800 uppercase">
                        Step 1: Find Patient in NextGen
                      </span>
                      <Badge className="bg-red-600 text-white font-mono text-[10px] font-bold border-none shadow-2xs">
                        NEVER FAX BACK
                      </Badge>
                    </div>
                    <div className="p-4 text-center space-y-3">
                      <h4 className="text-sm font-bold text-slate-900 font-heading">
                        Look Up &amp; Confirm Patient in NextGen
                      </h4>
                      <div className="p-3 rounded-lg bg-amber-50/90 border border-amber-300 text-xs text-left space-y-2 shadow-2xs">
                        <p className="font-semibold text-slate-900 leading-snug">
                          Cath Lab patients are established Phoenix Heart patients and should <strong>always exist in NextGen</strong>.
                        </p>
                        <div className="p-2.5 rounded bg-white border border-amber-200 text-2xs text-amber-950 space-y-1">
                          <p className="font-medium">
                            ⚠️ <strong>Cannot find the patient or information does not match?</strong> Check directly with your <strong>TL / Senior</strong>.
                          </p>
                          <p className="text-red-700 font-bold font-mono tracking-wide">
                            ➔ DO NOT FAX BACK UNDER ANY CIRCUMSTANCES.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <VerticalArrow height={20} />

                  <div className="rounded-xl bg-emerald-50 border-2 border-emerald-300 shadow-xs overflow-hidden">
                    <div className="px-3 py-1 bg-emerald-100/70 border-b border-emerald-200 flex items-center justify-between">
                      <span className="text-2xs font-mono font-bold text-emerald-700">
                        Step 2: Cath Lab Workflow
                      </span>
                    </div>
                    <div className="p-4 space-y-2 text-xs">
                      <div className="p-3.5 bg-white rounded-lg border border-emerald-200 font-mono text-xs space-y-2 text-slate-800 shadow-2xs">
                        <p className="flex items-start gap-2">
                          <span className="text-emerald-600 font-bold shrink-0">•</span>
                          <span>Confirm this is a single-patient Cath Lab document (no multiple patients).</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <span className="text-emerald-600 font-bold shrink-0">•</span>
                          <span>Verify patient details thoroughly: First Name, Last Name, and DOB.</span>
                        </p>
                        <p className="flex items-start gap-2 text-emerald-800 font-bold">
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
                    <div className="px-5 py-2 rounded-full bg-cyan-600 text-white font-mono text-xs font-bold shadow-sm tracking-wide">
                      Workflow: Patient Referrals
                    </div>
                    <VerticalArrow height={20} />
                  </div>

                  <div className="max-w-md mx-auto rounded-xl bg-white border-2 border-cyan-500/60 shadow-xs overflow-hidden">
                    <div className="px-3 py-1 bg-cyan-50 border-b border-cyan-200 text-2xs font-mono font-bold text-cyan-700">
                      Step 1: Check Document Type
                    </div>
                    <div className="p-3 text-center space-y-0.5">
                      <h4 className="text-sm font-bold text-slate-900">
                        Is this a genuine Patient Referral document?
                      </h4>
                      <p className="text-2xs text-slate-500">
                        Review the fax facesheet, doctor's orders, and referral clinic
                      </p>
                    </div>
                  </div>

                  {/* 3-Way Branch Splitter: Complete vs Incomplete vs Wrong Type */}
                  <div className="w-full select-none">
                    {/* Desktop/Tablet Fork Bar */}
                    <div className="w-full hidden md:block">
                      <svg
                        className="w-full h-5 text-slate-400 block overflow-visible"
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
                        <span className="px-3 py-1 rounded-full text-2xs font-mono font-bold uppercase shadow-2xs border bg-emerald-50 text-emerald-700 border-emerald-300 leading-tight">
                          Real Referral (Complete)
                        </span>
                        <VerticalArrow height={18} />
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="px-3 py-1 rounded-full text-2xs font-mono font-bold uppercase shadow-2xs border bg-rose-50 text-rose-700 border-rose-300 leading-tight">
                          Visibly Incomplete Document
                        </span>
                        <VerticalArrow height={18} />
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="px-3 py-1 rounded-full text-2xs font-mono font-bold uppercase shadow-2xs border bg-amber-50 text-amber-800 border-amber-300 leading-tight">
                          Wrong Document Type
                        </span>
                        <VerticalArrow height={18} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-stretch">
                    {/* Scenario 1: Complete & Genuine Referral */}
                    <div className="rounded-xl bg-cyan-50/50 border-2 border-cyan-300 shadow-xs overflow-hidden flex flex-col justify-between">
                      <div>
                        <div className="px-3 py-1.5 bg-cyan-100/70 border-b border-cyan-200 flex items-center justify-between">
                          <span className="text-2xs font-mono font-bold text-cyan-800 uppercase">
                            1. Complete Referral
                          </span>
                          <Badge className="bg-cyan-600 text-white font-mono text-[10px] font-bold border-none shadow-2xs">
                            NEVER FAX BACK
                          </Badge>
                        </div>
                        <div className="p-3.5 space-y-2.5 text-xs text-slate-800">
                          <p className="text-2xs text-slate-600">
                            1. Review patient name, DOB, and demographics from the document.
                          </p>

                          <div className="p-2 rounded-lg bg-white border border-cyan-200 space-y-1.5 shadow-2xs">
                            <span className="font-bold text-cyan-700 font-mono text-2xs block uppercase">
                              Patient Selection in Inbox:
                            </span>
                            <div className="space-y-1 text-2xs">
                              <div className="flex items-start gap-1">
                                <span className="font-bold text-emerald-700 shrink-0">• Existing Chart:</span>
                                <span>Select existing chart. <strong>Do NOT select "New Patient"</strong> if patient exists.</span>
                              </div>
                              <div className="flex items-start gap-1">
                                <span className="font-bold text-amber-800 shrink-0">• Not Found:</span>
                                <span>Select <strong>"New Patient"</strong> and register demographics.</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1 text-2xs">
                            <p>2. Ensure Category = <strong>PATIENT REFERRAL</strong></p>
                            <div className="p-2 bg-white rounded-lg font-mono font-bold text-cyan-800 border border-cyan-300 text-center shadow-2xs text-2xs">
                              Move directly to REFERRAL BUCKET
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="p-2 bg-cyan-100/40 border-t border-cyan-200/60 text-center text-2xs font-mono text-cyan-900 font-medium">
                        ✓ Complete clinical orders verified
                      </div>
                    </div>

                    {/* Scenario 2: Visibly Incomplete Referral Document */}
                    <div className="rounded-xl bg-rose-50/50 border-2 border-rose-300 shadow-xs overflow-hidden flex flex-col justify-between">
                      <div>
                        <div className="px-3 py-1.5 bg-rose-100/70 border-b border-rose-200 flex items-center justify-between">
                          <span className="text-2xs font-mono font-bold text-rose-800 uppercase">
                            2. Incomplete Referral
                          </span>
                          <Badge className="bg-rose-600 text-white font-mono text-[10px] font-bold border-none shadow-2xs">
                            FAXBACK TO FACILITY
                          </Badge>
                        </div>
                        <div className="p-3.5 space-y-2.5 text-xs text-slate-800">
                          <div className="p-2 rounded-md bg-rose-100/80 border border-rose-300 text-rose-950 text-2xs font-medium leading-snug">
                            ⚠️ <strong>100% Visibly Incomplete:</strong> If it is plainly obvious to anyone that pages or key clinical orders are missing, fax back immediately.
                          </div>

                          <div className="p-2 rounded-lg bg-white border border-rose-200 space-y-1.5 shadow-2xs">
                            <span className="font-bold text-rose-800 font-mono text-2xs block uppercase">
                              Hints That Document Is Incomplete:
                            </span>
                            <ul className="text-2xs text-slate-700 space-y-1">
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

                          <div className="p-2 rounded-md bg-rose-50 border border-rose-200 space-y-1">
                            <span className="text-[10px] font-mono uppercase text-rose-800 block font-bold tracking-wider">
                              Required Faxback Response:
                            </span>
                            <p className="text-xs font-mono font-medium text-slate-900 select-all leading-snug">
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
                          className="text-xs h-7 px-2 gap-1.5 w-full font-medium bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-mono"
                        >
                          <Copy className="size-3" />
                          Copy Phrase
                        </Button>
                      </div>
                    </div>

                    {/* Scenario 3: Miscategorized / Wrong Document Type */}
                    <div className="rounded-xl bg-amber-50/50 border-2 border-amber-300 shadow-xs overflow-hidden flex flex-col justify-between">
                      <div>
                        <div className="px-3 py-1.5 bg-amber-100/70 border-b border-amber-200 flex items-center justify-between">
                          <span className="text-2xs font-mono font-bold text-amber-800 uppercase">
                            3. Wrong Document Type
                          </span>
                          <Badge className="bg-amber-600 text-white font-mono text-[10px] font-bold border-none shadow-2xs">
                            TL REVIEW FIRST
                          </Badge>
                        </div>
                        <div className="p-3.5 space-y-2.5 text-xs text-slate-800">
                          <p className="text-2xs text-slate-600 leading-relaxed">
                            If a non-referral document (e.g. ROI request, routine lab, clinic progress note) arrived in the Referral bucket by mistake:
                          </p>
                          <div className="p-2.5 rounded-lg bg-white border border-amber-200 text-2xs space-y-1 shadow-2xs">
                            <p className="font-bold text-amber-900">
                              ⚠️ Do NOT fax back on your own!
                            </p>
                            <p className="text-slate-600">
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
                          className="text-xs h-7 gap-1.5 w-full bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-mono"
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
                    <div className="px-5 py-2 rounded-full bg-slate-800 text-white font-mono text-xs font-bold shadow-sm tracking-wide">
                      Workflow: Archive
                    </div>
                    <VerticalArrow height={20} />
                  </div>

                  {/* Step 1: Source Check */}
                  <div className="max-w-md mx-auto rounded-xl bg-white border-2 border-slate-400 shadow-xs overflow-hidden">
                    <div className="px-3 py-1 bg-slate-100 border-b border-slate-200 text-2xs font-mono font-bold text-slate-700 flex items-center justify-between">
                      <span className="uppercase">Step 1: Check Who Sent This Fax</span>
                      <span className="text-slate-500">Archive / Keep Check</span>
                    </div>
                    <div className="p-3 text-center space-y-0.5">
                      <h4 className="text-sm font-bold text-slate-900 font-heading">
                        Identify Sender &amp; Document Source
                      </h4>
                      <p className="text-2xs text-slate-500">
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
                    {/* Banner / Abrazo */}
                    <div className="rounded-xl bg-white border-2 border-slate-200 shadow-xs overflow-hidden">
                      <div className="px-3 py-1 bg-slate-100 border-b border-slate-200 text-2xs font-mono font-bold text-slate-800 uppercase">
                        Banner Health & Abrazo Hospital Faxes
                      </div>
                      <div className="p-4 space-y-3 text-xs">
                        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1">
                          <span className="font-bold text-emerald-700">
                            KEEP (Move to Imaging Workflow):
                          </span>
                          <p className="text-slate-700">• Imaging and radiology reports sent from Banner Imaging</p>
                          <p className="text-slate-700">• Documents with Phoenix Heart (PH) Letterhead</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 space-y-1">
                          <span className="font-bold text-red-700">
                            ARCHIVE IMMEDIATELY:
                          </span>
                          <p className="text-slate-700">• All other hospital documents: Labs, H&Ps, Consult notes, and Progress notes</p>
                        </div>
                      </div>
                    </div>

                    {/* Advertisements */}
                    <div className="rounded-xl bg-white border-2 border-slate-200 shadow-xs overflow-hidden">
                      <div className="px-3 py-1 bg-amber-50 border-b border-amber-200 text-2xs font-mono font-bold text-amber-800 uppercase">
                        Advertisements & Marketing Faxes
                      </div>
                      <div className="p-4 space-y-3 text-xs">
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 space-y-1">
                          <span className="font-bold text-amber-800">
                            Medication & Drug Promotions:
                          </span>
                          <p className="text-slate-700">File under Category: <strong>Admin</strong> → Assign to: <strong>Dr. Khan</strong> (if no specific doctor is named).</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 space-y-1">
                          <span className="font-bold text-slate-900">
                            All Other Advertisements & Spam Faxes:
                          </span>
                          <p className="text-slate-600">Archive immediately. Never fax back spam.</p>
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
        )}

        {/* ══════════════════════════════════════════════════════════════════
            MODE 2: DOCUMENT ROUTING LOOKUP
            ══════════════════════════════════════════════════════════════════ */}
        {viewMode === "pipeline-lookup" && (
          <motion.div
            key="pipeline-lookup"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-4"
          >
            <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs space-y-3">
              <h2 className="text-sm font-semibold text-foreground">
                Document Routing & Indexing Search
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  className="pl-9 h-10 text-xs sm:text-sm bg-background border-border/60"
                  placeholder="Search document type (e.g. 'Cardiac Clearance', 'INR', 'Labs', 'CT/CTA', 'PFT', 'VCC')…"
                  value={lookupSearch}
                  onChange={(e) => setLookupSearch(e.target.value)}
                />
                {lookupSearch && (
                  <button
                    type="button"
                    onClick={() => setLookupSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 size-5 rounded-full hover:bg-muted text-muted-foreground flex items-center justify-center cursor-pointer"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredIndexing.map((doc) => {
                const flowString = doc.flow.join(" → ");
                return (
                  <div key={doc.id} className="p-4 rounded-xl border border-border/80 bg-card space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-foreground">
                        {doc.title}
                      </span>
                      {doc.priority === "HIGH" && (
                        <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 text-2xs">
                          HIGH
                        </Badge>
                      )}
                    </div>
                    <p className="text-2xs text-muted-foreground line-clamp-2">
                      <strong className="text-foreground">Indicators:</strong> {doc.indicators}
                    </p>
                    <div className="pt-2 border-t border-border/50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-2xs font-mono text-muted-foreground uppercase">Routing Steps</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(flowString, `Copied routing steps for ${doc.title}`)}
                          className="h-5 px-1.5 text-2xs"
                        >
                          <Copy className="size-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        {doc.flow.map((step, idx) => (
                          <span key={idx} className="inline-flex items-center">
                            <span className="text-2xs font-mono px-1.5 py-0.5 rounded bg-muted text-foreground border border-border/50">
                              {step}
                            </span>
                            {idx < doc.flow.length - 1 && (
                              <CornerDownRight className="size-2.5 mx-0.5 text-muted-foreground/60" />
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            MODE 4: REFERENCE
            ══════════════════════════════════════════════════════════════════ */}
        {viewMode === "reference" && (
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
        )}
        </AnimatePresence>
      </div>
    </main>
  );
}
