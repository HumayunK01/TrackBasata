import { toast } from "sonner";
import { formatDayName, formatTableDate } from "@/types/log";
import { formatUSDate } from "@/lib/log-utils";
import {
  formatDuration,
  formatTime12h,
  isOvernightWindow,
  type OvertimeLog,
} from "@/hooks/useOvertimeLogs";

const safeCsvCell = (s: string) => (s && /^[=+@\-|%]/.test(s) ? `'${s}` : s);

export function overtimeToCSV(
  rows: OvertimeLog[],
  addedBy?: (r: OvertimeLog) => string,
): string {
  const headers = [
    "OT Date",
    "Day",
    "Start Time",
    "End Time",
    "Duration",
    "Duration (Mins)",
    ...(addedBy ? ["Added By"] : []),
    "Notes",
  ];

  const escape = (v: unknown) => {
    const s = v == null ? "" : safeCsvCell(String(v));
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = rows.map((r) =>
    [
      r.ot_date,
      formatDayName(r.ot_date),
      formatTime12h(r.start_time),
      `${formatTime12h(r.end_time)}${isOvernightWindow(r.start_time, r.end_time) ? " (+1d)" : ""}`,
      formatDuration(r.duration_minutes),
      r.duration_minutes,
      ...(addedBy ? [addedBy(r)] : []),
      r.notes ?? "",
    ]
      .map(escape)
      .join(","),
  );

  return [headers.join(","), ...lines].join("\n");
}

export function downloadOvertimeCSV(
  rows: OvertimeLog[],
  addedBy?: (r: OvertimeLog) => string,
  filename = "overtime-logs.csv",
) {
  const blob = new Blob([overtimeToCSV(rows, addedBy)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function overtimeToJSON(
  rows: OvertimeLog[],
  addedBy?: (r: OvertimeLog) => string,
): string {
  const totalMinutes = rows.reduce((s, r) => s + r.duration_minutes, 0);
  const payload = {
    exported_at: new Date().toISOString(),
    summary: {
      entries: rows.length,
      total_minutes: totalMinutes,
      total_duration: formatDuration(totalMinutes),
    },
    entries: rows.map((r) => ({
      ot_date: r.ot_date,
      day: formatDayName(r.ot_date),
      start_time: r.start_time,
      end_time: r.end_time,
      duration_minutes: r.duration_minutes,
      duration_formatted: formatDuration(r.duration_minutes),
      ...(addedBy ? { added_by: addedBy(r) } : {}),
      notes: r.notes ?? "",
    })),
  };
  return JSON.stringify(payload, null, 2);
}

export function downloadOvertimeJSON(
  rows: OvertimeLog[],
  addedBy?: (r: OvertimeLog) => string,
  filename = "overtime-logs.json",
) {
  const blob = new Blob([overtimeToJSON(rows, addedBy)], {
    type: "application/json;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadOvertimePDF(
  rows: OvertimeLog[],
  filename = "overtime-report.pdf",
  opts: {
    subtitle?: string;
    userName?: string;
    addedBy?: (r: OvertimeLog) => string;
  } = {},
) {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new JsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 36;
  const usableWidth = pageWidth - margin * 2;

  const totalMinutes = rows.reduce((s, r) => s + r.duration_minutes, 0);
  const avgMinutes = rows.length > 0 ? Math.round(totalMinutes / rows.length) : 0;

  try {
    const img = new Image();
    img.src = "/lightlogo.png";
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
    const logoH = 26;
    const logoW = (img.naturalWidth / img.naturalHeight) * logoH;
    doc.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      pageWidth - margin - logoW,
      28,
      logoW,
      logoH,
    );
  } catch {
    // logo unavailable — skip
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(17, 24, 39);
  doc.text("Overtime (OT) Report", margin, 44);

  let metaY = 60;
  if (opts.userName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    doc.text(opts.userName, margin, metaY);
    metaY += 13;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  if (opts.subtitle) {
    doc.text(opts.subtitle, margin, metaY);
  }
  doc.text(
    `Generated: ${new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`,
    pageWidth - margin,
    metaY,
    { align: "right" },
  );

  const y = metaY + 16;

  const metrics = [
    { label: "TOTAL OT TIME", value: formatDuration(totalMinutes) },
    { label: "OT SESSIONS", value: `${rows.length} ${rows.length === 1 ? "entry" : "entries"}` },
    { label: "AVG / SESSION", value: formatDuration(avgMinutes) },
  ];

  const barH = 38;
  const colW = usableWidth / metrics.length;
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, y, usableWidth, barH, 4, 4, "FD");

  metrics.forEach((m, idx) => {
    const colX = margin + idx * colW;
    if (idx > 0) {
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(colX, y + 6, colX, y + barH - 6);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text(m.label, colX + 12, y + 13);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text(m.value, colX + 12, y + 28);
  });

  const hasAddedBy = typeof opts.addedBy === "function";
  autoTable(doc, {
    startY: y + barH + 16,
    margin: { left: margin, right: margin },
    head: [
      hasAddedBy
        ? ["OT Date", "Day", "Overtime Window", "Duration", "Added By", "Notes"]
        : ["OT Date", "Day", "Overtime Window", "Duration", "Notes"],
    ],
    body: rows.map((r) => [
      formatUSDate(r.ot_date),
      formatDayName(r.ot_date),
      `${formatTime12h(r.start_time)} – ${formatTime12h(r.end_time)}${
        isOvernightWindow(r.start_time, r.end_time) ? " (+1d)" : ""
      }`,
      formatDuration(r.duration_minutes),
      ...(hasAddedBy ? [opts.addedBy!(r)] : []),
      r.notes ?? "",
    ]),
    foot: [
      hasAddedBy
        ? ["Total", "", `${rows.length} ${rows.length === 1 ? "session" : "sessions"}`, formatDuration(totalMinutes), "", ""]
        : ["Total", "", `${rows.length} ${rows.length === 1 ? "session" : "sessions"}`, formatDuration(totalMinutes), ""],
    ],
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: { top: 5.5, bottom: 5.5, left: 7, right: 7 },
      textColor: [31, 41, 55],
      lineColor: [229, 231, 235],
      lineWidth: { bottom: 0.5 },
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [243, 244, 246],
      textColor: [17, 24, 39],
      fontStyle: "bold",
      fontSize: 8.5,
      lineColor: [209, 213, 219],
      lineWidth: { top: 1, bottom: 1.5 },
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    footStyles: {
      fillColor: [243, 244, 246],
      textColor: [17, 24, 39],
      fontStyle: "bold",
      fontSize: 9,
      lineColor: [156, 163, 175],
      lineWidth: { top: 1.5, bottom: 1 },
    },
    columnStyles: hasAddedBy
      ? {
          0: { cellWidth: 80 },
          1: { cellWidth: 46 },
          2: { cellWidth: 145 },
          3: { cellWidth: 72, fontStyle: "bold" },
          4: { cellWidth: 110 },
          5: { cellWidth: "auto" },
        }
      : {
          0: { cellWidth: 85 },
          1: { cellWidth: 50 },
          2: { cellWidth: 160 },
          3: { cellWidth: 80, fontStyle: "bold" },
          4: { cellWidth: "auto" },
        },
    didDrawPage: () => {
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(margin, pageHeight - 26, pageWidth - margin, pageHeight - 26);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text("Basata Tracker · Overtime Report", margin, pageHeight - 14);
      doc.text(
        `Page ${doc.getCurrentPageInfo().pageNumber}`,
        pageWidth - margin,
        pageHeight - 14,
        { align: "right" },
      );
    },
  });

  doc.save(filename);
}

export async function copyOvertimeEntry(row: OvertimeLog): Promise<boolean> {
  const timeRange = `${formatTime12h(row.start_time)} – ${formatTime12h(row.end_time)}${
    isOvernightWindow(row.start_time, row.end_time) ? " (+1d)" : ""
  }`;
  const pairs: [string, string][] = [
    ["OT Date", `${formatTableDate(row.ot_date)} (${formatDayName(row.ot_date)})`],
    ["Overtime Window", timeRange],
    ["Duration", formatDuration(row.duration_minutes)],
    ...(row.notes ? [["Notes", row.notes] as [string, string]] : []),
  ];

  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const tdStyle = "border:1px solid #444;padding:4px 12px;text-align:left;";
  const thStyle = `${tdStyle}font-weight:600;background:#1e2130;color:#e2e8f0;`;
  const html = `<table style="border-collapse:collapse;font-family:sans-serif;font-size:13px;">${pairs
    .map(([k, v]) => `<tr><td style="${thStyle}">${escapeHtml(k)}</td><td style="${tdStyle}">${escapeHtml(v)}</td></tr>`)
    .join("")}</table>`;
  const plain = pairs.map(([k, v]) => `${k}\t${v}`).join("\n");

  try {
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ]);
    } else {
      await navigator.clipboard.writeText(plain);
    }
    toast.success("Overtime details copied");
    return true;
  } catch {
    toast.error("Couldn't copy to clipboard");
    return false;
  }
}
