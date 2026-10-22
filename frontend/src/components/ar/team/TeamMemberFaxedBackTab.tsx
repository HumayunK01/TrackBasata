import React, { useState, useMemo } from "react";
import {
  FileCheck2,
  Search,
  Download,
  Loader2,
  CheckCheck,
  X,
  Ban,
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/Pagination";
import { pageNumbersArr } from "@/components/ar/tracker/tracker-helpers";
import { formatTableDate } from "@/types/log";
import { formatUSDate } from "@/lib/log-utils";
import type { TeamFaxedBackDoc } from "@/hooks/useTeamData";
import Skeleton from "react-loading-skeleton";
import { cn } from "@/lib/utils";

interface TeamMemberFaxedBackTabProps {
  documents: TeamFaxedBackDoc[];
  totalCount: number;
  loading: boolean;
  page: number;
  pageSize?: number;
  search: string;
  onSearchChange: (q: string) => void;
  onPageChange: (p: number) => void;
  onExport: () => void;
  exporting: boolean;
}

function FBStatusBadge({ status }: { status: string }) {
  if (status === "Pending") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-mono">
        <Loader2 className="size-3 animate-spin" /> Pending
      </span>
    );
  }
  if (status === "Sent") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono">
        <CheckCheck className="size-3" /> Sent
      </span>
    );
  }
  if (status === "Failed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20 font-mono">
        <X className="size-3" /> Failed
      </span>
    );
  }
  if (status === "Rejected") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 font-mono">
        <Ban className="size-3" /> Rejected
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">{status}</span>;
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-primary rounded-sm px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

const withPdf = (name: string) => (/\.pdf$/i.test(name) ? name : `${name}.pdf`);

export const TeamMemberFaxedBackTab = React.memo(function TeamMemberFaxedBackTab({
  documents,
  totalCount,
  loading,
  page,
  pageSize = 25,
  search,
  onSearchChange,
  onPageChange,
  onExport,
  exporting,
}: TeamMemberFaxedBackTabProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Summary counts for current slice
  const statusCounts = useMemo(() => {
    let sent = 0;
    let pending = 0;
    let failed = 0;
    for (const d of documents) {
      if (d.status === "Sent") sent++;
      else if (d.status === "Pending") pending++;
      else failed++;
    }
    return { sent, pending, failed };
  }, [documents]);

  const filteredDocs = useMemo(() => {
    if (statusFilter === "all") return documents;
    return documents.filter((d) => d.status.toLowerCase() === statusFilter.toLowerCase());
  }, [documents, statusFilter]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-4">
      {/* 1. Summary Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border/60 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            Total Logged
          </span>
          <div className="text-xl font-bold tabular-nums text-foreground mt-1 flex items-center gap-1.5">
            <FileCheck2 className="size-4 text-primary" />
            <span>{totalCount} docs</span>
          </div>
        </div>
        <div className="bg-card border border-border/60 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            Successfully Sent
          </span>
          <div className="text-xl font-bold tabular-nums text-emerald-500 mt-1 flex items-center gap-1.5">
            <CheckCheck className="size-4" />
            <span>{statusCounts.sent} sent</span>
          </div>
        </div>
        <div className="bg-card border border-border/60 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            Pending Processing
          </span>
          <div className="text-xl font-bold tabular-nums text-amber-500 mt-1 flex items-center gap-1.5">
            <Loader2 className="size-4" />
            <span>{statusCounts.pending} pending</span>
          </div>
        </div>
        <div className="bg-card border border-border/60 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            Failed / Rejected
          </span>
          <div className="text-xl font-bold tabular-nums text-rose-500 mt-1 flex items-center gap-1.5">
            <Ban className="size-4" />
            <span>{statusCounts.failed}</span>
          </div>
        </div>
      </div>

      {/* 2. Controls & Search Toolbar */}
      <div className="bg-card border border-border/60 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9 h-9 text-xs w-full bg-background border-border/60"
              placeholder="Search file name, patient name, notes…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status pills */}
            <div className="flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/50 text-xs">
              {(["all", "Sent", "Pending", "Failed"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer capitalize",
                    statusFilter === s
                      ? "bg-card text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s === "all" ? "All Status" : s}
                </button>
              ))}
            </div>

            {/* Export CSV */}
            <button
              type="button"
              onClick={onExport}
              disabled={exporting}
              className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/70 border border-border/50 rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <Download className="size-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Faxed Back Documents Table */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="space-y-2 p-4">
            <Skeleton height={40} count={5} />
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No faxed-back documents match the active filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20 text-muted-foreground uppercase text-[10px] font-semibold tracking-wider font-mono">
                  <th className="px-4 py-3">File Document</th>
                  <th className="px-3 py-3">Patient Details</th>
                  <th className="px-3 py-3">Worked On</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-4 py-3">Notes / Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredDocs.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium truncate max-w-[240px]">
                      <span className="inline-flex items-center gap-1.5">
                        <img src="/pdf.png" alt="" className="size-5 shrink-0 object-contain" />
                        <span className="font-mono text-foreground font-semibold">
                          <Highlight text={withPdf(d.file_name)} query={search} />
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-foreground">
                        {d.patient_name ? <Highlight text={d.patient_name} query={search} /> : "—"}
                      </div>
                      {d.patient_dob && (
                        <p className="text-[10px] text-muted-foreground font-mono">
                          DOB: {formatUSDate(d.patient_dob)}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground font-mono">
                      {formatTableDate(d.worked_on)}
                    </td>
                    <td className="px-3 py-3">
                      <FBStatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-[220px]">
                      {d.notes ? <Highlight text={d.notes} query={search} /> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Pagination */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          pageNumbers={pageNumbersArr(totalPages, page)}
          onPageChange={onPageChange}
          total={totalCount}
          pageSize={pageSize}
          entityLabel="documents"
        />
      )}
    </div>
  );
});
