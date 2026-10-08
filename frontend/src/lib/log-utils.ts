import type { Category } from "@/hooks/useCategories";
import { type DailyLog, type DailyLogInsert, totalForLog, isoDate, isWeekend } from "@/types/log";

const DAY_MS = 86_400_000;

// ponytail: business is Chicago-based; one source of truth instead of 3 inline copies.
const APP_TZ = "America/Chicago";

// Interpret the date at UTC noon, then render in APP_TZ — correct weekday for any viewer tz.
function weekday(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: APP_TZ, weekday: "long" });
}

/**
 * Logging streaks in working days. A day with docs logged extends the streak;
 * weekends, off-days, and a not-yet-logged today are neutral (skipped, not
 * broken); a weekday with no log breaks it.
 */
export function computeStreaks(logs: DailyLog[]): { current: number; best: number } {
  if (logs.length === 0) return { current: 0, best: 0 };
  const byDate = new Map(logs.map((l) => [l.log_date, l]));
  const today = isoDate();

  type DayKind = "count" | "neutral" | "break";
  const dayKind = (iso: string): DayKind => {
    const log = byDate.get(iso);
    if (log && !log.is_off_day && totalForLog(log) > 0) return "count";
    if (isWeekend(iso) || log?.is_off_day) return "neutral";
    return "break";
  };

  // Current streak: walk back from today (bounded ~3y, matching the query's 1000-row cap)
  let current = 0;
  for (let t = Date.now(), i = 0; i < 1100; i++, t -= DAY_MS) {
    const iso = isoDate(new Date(t));
    const kind = dayKind(iso);
    if (kind === "count") current++;
    else if (kind === "break" && iso !== today) break;
  }

  // Best streak: walk from the earliest logged day up to today
  const earliest = [...byDate.keys()].sort()[0];
  let best = 0;
  let run = 0;
  for (let t = new Date(`${earliest}T12:00:00`).getTime(), i = 0; i < 4000; i++, t += DAY_MS) {
    const iso = isoDate(new Date(t));
    if (iso > today) break;
    const kind = dayKind(iso);
    if (kind === "count") {
      run++;
      if (run > best) best = run;
    } else if (kind === "break") {
      run = 0;
    }
    if (iso === today) break;
  }

  return { current, best: Math.max(best, current) };
}

export function toCSV(logs: DailyLog[], categories: Category[]): string {
  const headers = ["Date", "Day", ...categories.map((c) => c.label), "Total", "Off Day", "Notes"];
  const safeStr = (s: string) => s && /^[=+@\-|%]/.test(s) ? `'${s}` : s;
  const escape = (v: unknown) => {
    const s = v == null ? "" : safeStr(String(v));
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = logs.map((l) => {
    const dayName = weekday(l.log_date);
    return [
      l.log_date,
      dayName,
      ...categories.map((c) => (l.counts ?? {})[c.key] ?? 0),
      totalForLog(l),
      l.is_off_day ? "Yes" : "",
      l.notes ?? "",
    ]
      .map(escape)
      .join(",");
  });
  return [headers.join(","), ...rows].join("\n");
}

export function downloadCSV(logs: DailyLog[], categories: Category[], filename = "ar-record.csv") {
  const blob = new Blob([toCSV(logs, categories)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function toJSON(logs: DailyLog[], categories: Category[]): string {
  const safeStr = (s: string | null | undefined) => s ?? "";
  const payload = {
    exported_at: new Date().toISOString(),
    categories: categories.map((c) => ({ key: c.key, label: c.label, short: c.short })),
    logs: logs.map((l) => ({
      date: l.log_date,
      day: weekday(l.log_date),
      counts: Object.fromEntries(
        categories.map((c) => [c.key, (l.counts ?? {})[c.key] ?? 0])
      ),
      total: totalForLog(l),
      is_off_day: l.is_off_day,
      notes: safeStr(l.notes),
    })),
  };
  return JSON.stringify(payload, null, 2);
}

export function downloadJSON(logs: DailyLog[], categories: Category[], filename = "ar-record.json") {
  const blob = new Blob([toJSON(logs, categories)], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** ISO `YYYY-MM-DD` → `MM-DD-YYYY` (US display format used in PDF exports). */
export function formatUSDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${m}-${d}-${y}`;
}

/**
 * Print-ready PDF export. jspdf + autotable are dynamically imported so the
 * ~300KB library only loads when a user actually exports a PDF.
 */
export async function downloadPDF(
  logs: DailyLog[],
  categories: Category[],
  filename = "ar-record.pdf",
  opts: { title?: string; subtitle?: string; userName?: string } = {},
) {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const working = logs.filter((l) => !l.is_off_day);

  // Skip categories with no counts in the exported range — all-zero columns are noise
  const activeCategories = categories.filter((c) =>
    working.some((l) => ((l.counts ?? {})[c.key] ?? 0) > 0),
  );

  // Landscape keeps many category columns readable
  const orientation = activeCategories.length > 6 ? "landscape" : "portrait";
  const doc = new JsPDF({ orientation, unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 36;
  const usableWidth = pageWidth - margin * 2;

  const totalDocs = working.reduce((s, l) => s + totalForLog(l), 0);
  const avg = working.length ? Math.round(totalDocs / working.length) : 0;
  const sorted = [...logs].sort((a, b) => a.log_date.localeCompare(b.log_date));
  const rangeLabel = sorted.length
    ? `${formatUSDate(sorted[0].log_date)} to ${formatUSDate(sorted[sorted.length - 1].log_date)}`
    : "No data";

  // ── Header Logo ──
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
    doc.addImage(canvas.toDataURL("image/png"), "PNG", pageWidth - margin - logoW, 30, logoW, logoH);
  } catch {
    // logo unavailable — skip it
  }

  // ── Header Titles ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(17, 24, 39); // gray-900
  doc.text(opts.title ?? "Basata Tracker Report", margin, 46);

  let metaY = 62;
  if (opts.userName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81); // gray-700
    doc.text(opts.userName, margin, metaY);
    metaY += 13;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128); // gray-500
  doc.text(`Date Range: ${opts.subtitle ?? rangeLabel}`, margin, metaY);
  doc.text(
    `Generated: ${new Date().toLocaleString("en-US", { timeZone: APP_TZ, dateStyle: "medium", timeStyle: "short" })}`,
    pageWidth - margin,
    metaY,
    { align: "right" },
  );

  let y = metaY + 16;

  // ── Summary Bar ──
  const offCount = logs.length - working.length;
  const metrics = [
    { label: "TOTAL DOCUMENTS", value: totalDocs.toLocaleString() },
    { label: "DAYS WORKED", value: `${working.length} ${working.length === 1 ? "day" : "days"}` },
    { label: "DAILY AVERAGE", value: `${avg} docs / day` },
    { label: "DAYS OFF", value: `${offCount} ${offCount === 1 ? "day" : "days"}` },
  ];

  const barH = 38;
  const colW = usableWidth / metrics.length;

  // Single unified neutral container
  doc.setFillColor(249, 250, 251); // gray-50
  doc.setDrawColor(229, 231, 235); // gray-200
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, y, usableWidth, barH, 4, 4, "FD");

  metrics.forEach((m, idx) => {
    const colX = margin + idx * colW;

    // Subtle divider between metric columns
    if (idx > 0) {
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(colX, y + 6, colX, y + barH - 6);
    }

    // Micro Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text(m.label, colX + 12, y + 13);

    // Metric Value
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39); // gray-900
    doc.text(m.value, colX + 12, y + 28);
  });

  y += barH + 16;

  // ── Table ──
  const dayName = (iso: string) => weekday(iso);

  const body = sorted.map((l) => {
    if (l.is_off_day) {
      return [
        formatUSDate(l.log_date),
        dayName(l.log_date),
        ...activeCategories.map(() => "—"),
        isWeekend(l.log_date) ? "Weekend" : "Off Day",
      ];
    }
    return [
      formatUSDate(l.log_date),
      dayName(l.log_date),
      ...activeCategories.map((c) => {
        const val = (l.counts ?? {})[c.key] ?? 0;
        return val ? val.toLocaleString() : "0";
      }),
      totalForLog(l).toLocaleString(),
    ];
  });

  const catTotals = activeCategories.map((c) =>
    working.reduce((s, l) => s + ((l.counts ?? {})[c.key] ?? 0), 0),
  );

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Date", "Day", ...activeCategories.map((c) => c.short), "Total"]],
    body,
    foot: [["Total", "", ...catTotals.map((n) => n.toLocaleString()), totalDocs.toLocaleString()]],
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: { top: 5.5, bottom: 5.5, left: 8, right: 8 },
      textColor: [31, 41, 55], // gray-800
      lineColor: [229, 231, 235], // gray-200
      lineWidth: { bottom: 0.5 },
    },
    headStyles: {
      fillColor: [243, 244, 246], // gray-100
      textColor: [17, 24, 39], // gray-900
      fontStyle: "bold",
      fontSize: 8.5,
      cellPadding: { top: 6.5, bottom: 6.5, left: 8, right: 8 },
      lineColor: [209, 213, 219], // gray-300
      lineWidth: { top: 1, bottom: 1.5 },
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250], // subtle gray-50
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    footStyles: {
      fillColor: [243, 244, 246], // gray-100
      textColor: [17, 24, 39],
      fontStyle: "bold",
      fontSize: 9,
      lineColor: [156, 163, 175], // gray-400
      lineWidth: { top: 1.5, bottom: 1 },
      cellPadding: { top: 6.5, bottom: 6.5, left: 8, right: 8 },
    },
    columnStyles: {
      0: { cellWidth: 70, halign: "left" },
      1: { cellWidth: 70, halign: "left" },
      ...Object.fromEntries(activeCategories.map((_, i) => [i + 2, { halign: "right" as const }])),
      [activeCategories.length + 2]: { halign: "right" as const, fontStyle: "bold" as const },
    },
    didParseCell: (data) => {
      // Right align numeric headers
      if (data.section === "head" && data.column.index >= 2) {
        data.cell.styles.halign = "right";
      }
      // Style weekend/off-day rows
      if (data.section === "body" && sorted[data.row.index]?.is_off_day) {
        data.cell.styles.textColor = [156, 163, 175];
        data.cell.styles.fillColor = [248, 249, 250];
        data.cell.styles.fontStyle = "italic";
        if (data.column.index >= 2 && data.column.index < activeCategories.length + 2) {
          data.cell.styles.halign = "center";
        }
      }
      // Right align foot totals
      if (data.section === "foot" && data.column.index >= 2) {
        data.cell.styles.halign = "right";
      }
    },
    didDrawPage: () => {
      const pageHeight = doc.internal.pageSize.getHeight();
      // Clean footer divider line
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(margin, pageHeight - 26, pageWidth - margin, pageHeight - 26);

      // Running footer text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text("Basata Tracker · Activity Report", margin, pageHeight - 14);
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

/**
 * Canonical fingerprint of a draft log for dirty-checking: zeros are ignored
 * (touching a counter back to 0 isn't a change), count keys are sorted so
 * entry order can't produce false positives.
 */
export function canonEntry(d: DailyLogInsert): string {
  return JSON.stringify([
    d.log_date,
    d.is_off_day,
    d.notes?.trim() || null,
    Object.entries(d.counts ?? {})
      .filter(([, v]) => v !== 0)
      .sort(([a], [b]) => a.localeCompare(b)),
  ]);
}
