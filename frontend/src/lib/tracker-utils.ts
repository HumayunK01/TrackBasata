import type { TrackerRow } from "@/hooks/useTracker";
import { displayStatus, labelFor } from "@/components/ar/tracker/tracker-helpers";
import { supabase } from "@/integrations/supabase/client";

export interface TrackerPDFConfig {
  title: string;
  step3Label: string;
  defaultFilename: string;
}

/**
 * Export the given tracker rows to a PDF. Pass the already-filtered list so
 * the export matches whatever filters/search are active on screen.
 */
export async function downloadTrackerPDF(
  rows: TrackerRow[],
  config: TrackerPDFConfig,
  filename = config.defaultFilename,
  opts: {
    subtitle?: string;
    userName?: string;
    accountName?: (row: TrackerRow) => string;
  } = {},
) {
  const stepHead = ["Step 1 – Refax Same", "Step 2 – Refax New", config.step3Label];
  const groupByAccount = typeof opts.accountName === "function";
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new JsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  const resolved = rows.filter((r) => r.overall_status.startsWith("Resolved")).length;
  const failed = rows.filter((r) => r.overall_status === "All Steps Failed").length;
  const waiting = rows.filter((r) => r.overall_status.startsWith("Waiting")).length;

  try {
    const img = new Image();
    img.src = "/lightlogo.png";
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
    const logoH = 28;
    const logoW = (img.naturalWidth / img.naturalHeight) * logoH;
    doc.addImage(canvas.toDataURL("image/png"), "PNG", pageWidth - margin - logoW, 24, logoW, logoH);
  } catch {
    // logo unavailable — skip it
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30);
  doc.text(config.title, margin, 44);

  let y = 60;
  if (opts.userName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text(opts.userName, margin, y);
    y += 14;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  if (opts.subtitle) doc.text(opts.subtitle, margin, y);
  doc.text(
    `Exported ${new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`,
    pageWidth - margin,
    y,
    { align: "right" },
  );
  y += 20;

  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(
    `${rows.length} patients  ·  ${resolved} resolved  ·  ${failed} all steps failed  ·  ${waiting} waiting`,
    margin,
    y,
  );
  y += 16;

  const renderTable = (tableRows: TrackerRow[]) => {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Patient", ...stepHead, "Overall Status", "Notes"]],
      body: tableRows.map((r) => [
        r.patient_name,
        labelFor(r.step1),
        labelFor(r.step2 ?? "—"),
        labelFor(r.step3 ?? "—"),
        displayStatus(r.overall_status),
        r.notes ?? "",
      ]),
      theme: "grid",
      styles: { font: "helvetica", fontSize: 8, cellPadding: 4, textColor: 40, lineColor: [220, 220, 225], lineWidth: 0.5, overflow: "linebreak" },
      headStyles: { fillColor: [37, 42, 60], textColor: 255, fontStyle: "bold", halign: "center" },
      columnStyles: {
        0: { cellWidth: 110, fontStyle: "bold" },
        1: { halign: "center" },
        2: { halign: "center" },
        3: { halign: "center" },
        4: { halign: "center", cellWidth: 120 },
        5: { cellWidth: "auto" },
      },
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const row = tableRows[data.row.index];
        if (!row) return;
        if (row.overall_status.startsWith("Resolved")) {
          data.cell.styles.fillColor = [232, 248, 239];
        } else if (row.overall_status === "All Steps Failed") {
          data.cell.styles.fillColor = [252, 235, 235];
        } else if (row.overall_status.startsWith("Waiting")) {
          data.cell.styles.fillColor = [253, 248, 228];
        }
        const text = String(data.cell.raw ?? "");
        if (data.column.index >= 1 && data.column.index <= 4) {
          if (text === "Sent" || text.startsWith("Resolved")) data.cell.styles.textColor = [21, 128, 61];
          else if (text === "Failed" || text === "All Steps Failed") data.cell.styles.textColor = [185, 28, 28];
          else if (text === "Waiting" || text.startsWith("Waiting")) data.cell.styles.textColor = [161, 98, 7];
        }
      },
      didDrawPage: () => {
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Page ${doc.getCurrentPageInfo().pageNumber}`,
          pageWidth - margin,
          pageHeight - 20,
          { align: "right" },
        );
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  };

  if (!groupByAccount) {
    renderTable(rows);
    doc.save(filename);
    return;
  }

  const groups = new Map<string, TrackerRow[]>();
  for (const r of rows) {
    const name = opts.accountName!(r);
    const list = groups.get(name);
    if (list) list.push(r);
    else groups.set(name, [r]);
  }
  const accountNames = [...groups.keys()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );

  accountNames.forEach((name, i) => {
    const groupRows = groups.get(name)!;
    const gResolved = groupRows.filter((r) => r.overall_status.startsWith("Resolved")).length;
    const gFailed = groupRows.filter((r) => r.overall_status === "All Steps Failed").length;
    const gWaiting = groupRows.filter((r) => r.overall_status.startsWith("Waiting")).length;

    if (i > 0) y += 18;
    if (y > pageHeight - 90) {
      doc.addPage();
      y = margin;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text(name, margin, y);
    y += 14;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(
      `${groupRows.length} patients  ·  ${gResolved} resolved  ·  ${gFailed} all steps failed  ·  ${gWaiting} waiting`,
      margin,
      y,
    );
    y += 8;

    renderTable(groupRows);
  });

  doc.save(filename);
}

export const FAX_PDF_CONFIG: TrackerPDFConfig = {
  title: "Phoenix Heart Outbox Tracker",
  step3Label: "Step 3 – Reupload ROI",
  defaultFilename: "fax-tracker.pdf",
};

export const INDEXABLE_PDF_CONFIG: TrackerPDFConfig = {
  title: "Phoenix Heart Indexable Tracker",
  step3Label: "Step 3 – Reupload Indexable",
  defaultFilename: "indexable-tracker.pdf",
};

export function formatMMDDYYYY(d: Date = new Date()): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}${dd}${yyyy}`;
}

export function generate10RandomDigits(): string {
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

export function getTrackerReportFilename(
  mode: "fax" | "indexable",
  ext: "pdf" | "csv" | "json",
  date: Date = new Date(),
  randomSuffix = generate10RandomDigits()
): string {
  const prefix = mode === "fax" ? "FAX" : "INDEXABLE";
  const dateStr = formatMMDDYYYY(date);
  return `${prefix}_${dateStr}_${randomSuffix}.${ext}`;
}

const BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";

export interface ServerTrackerExportOptions {
  mode: "fax" | "indexable";
  accountId?: string | null;
  accountName?: string;
  statuses?: string[];
  search?: string;
  format?: "csv" | "json";
  sort?: "patient_name" | "updated_at" | "created_at" | "overall_status";
  sortDir?: "asc" | "desc";
}

/**
 * Downloads full tracker data directly from the server endpoint /api/v1/tracker/export
 * with all active filters applied (status, search query, mode, account).
 */
export async function exportTrackerServer(opts: ServerTrackerExportOptions): Promise<{ count: number; filename: string }> {
  let token: string | null = null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token || null;
  } catch {
    // proceed without token if session check fails
  }

  const searchParams = new URLSearchParams();
  searchParams.set("mode", opts.mode);
  if (opts.accountId) {
    searchParams.set("account_id", opts.accountId);
  }
  if (opts.statuses && opts.statuses.length > 0) {
    searchParams.set("status", opts.statuses.join(","));
  }
  if (opts.search && opts.search.trim()) {
    searchParams.set("q", opts.search.trim());
  }
  if (opts.format) {
    searchParams.set("format", opts.format);
  }
  if (opts.sort) {
    searchParams.set("sort", opts.sort);
  }
  if (opts.sortDir) {
    searchParams.set("sort_dir", opts.sortDir);
  }

  const url = `${BASE_URL}/tracker/export?${searchParams.toString()}`;

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    let errMsg = "Export request failed";
    try {
      const errJson = await response.json();
      errMsg = errJson?.error?.message || errMsg;
    } catch {
      errMsg = `${response.status} ${response.statusText}`;
    }
    throw new Error(errMsg);
  }

  // Extract filename from Content-Disposition header if available
  let filename = "";
  const disposition = response.headers.get("content-disposition");
  if (disposition) {
    const match = disposition.match(/filename=["']?([^"';]+)["']?/i);
    if (match?.[1]) {
      filename = match[1];
    }
  }

  if (!filename) {
    const ext = opts.format === "json" ? "json" : "csv";
    filename = getTrackerReportFilename(opts.mode, ext);
  }

  const countHeader = response.headers.get("x-export-count");
  const count = countHeader ? parseInt(countHeader, 10) : 0;

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);

  return { count, filename };
}

