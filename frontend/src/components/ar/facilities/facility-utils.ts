import { toast } from "sonner";
import type { Facility } from "@/hooks/useFacilities";

// Beautifies a US fax number for display: (623) 930-6060.
export function formatFax(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw;
}

// E.164 for dialing/copying: +16239306060.
export function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw;
}

export function copyFax(f: Facility): Promise<void> {
  return navigator.clipboard
    .writeText(toE164(f.fax_number))
    .then(() => {
      toast.success(`${f.name} Fax copied`, {
        description: toE164(f.fax_number),
      });
    })
    .catch(() => {
      toast.error("Couldn't copy — select the number manually");
    });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Copies one or more facilities in table format:
 * Columns: Facility Name | Address | Fax Number
 * Writes both HTML table (for Word/Docs/Email/Teams) and TSV plain text (for Excel/Sheets/Plain text).
 */
export async function copyFacilitiesTable(rows: Facility[]): Promise<void> {
  if (rows.length === 0) return;

  const plainRows = rows.map((f) => {
    const name = f.name.trim();
    const address = (f.address ?? "").trim().replace(/[\r\n\t]+/g, " ") || "—";
    const fax = formatFax(f.fax_number);
    return `${name}\t${address}\t${fax}`;
  });
  const plainText = `Facility Name\tAddress\tFax Number\n${plainRows.join("\n")}`;

  const htmlBody = rows
    .map((f) => {
      const name = f.name.trim();
      const address = (f.address ?? "").trim() || "—";
      const fax = formatFax(f.fax_number);
      return `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(address)}</td><td>${escapeHtml(fax)}</td></tr>`;
    })
    .join("");

  const htmlTable = `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;font-size:13px;"><thead><tr style="background:#f3f4f6;font-weight:600;text-align:left;"><th>Facility Name</th><th>Address</th><th>Fax Number</th></tr></thead><tbody>${htmlBody}</tbody></table>`;

  const writeSuccessToast = () => {
    if (rows.length === 1) {
      toast.success(`Copied ${rows[0].name.trim()}`);
    } else {
      toast.success(`Copied ${rows.length} facilities`);
    }
  };

  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([plainText], { type: "text/plain" }),
          "text/html": new Blob([htmlTable], { type: "text/html" }),
        }),
      ]);
    } else {
      await navigator.clipboard.writeText(plainText);
    }
    writeSuccessToast();
  } catch {
    try {
      await navigator.clipboard.writeText(plainText);
      writeSuccessToast();
    } catch {
      toast.error("Couldn't copy facility details");
    }
  }
}

export async function copyFacilityTable(f: Facility): Promise<void> {
  return copyFacilitiesTable([f]);
}

export function logoSrc(url: string): string {
  return window.location.protocol === "https:" ? `/api/logo?url=${encodeURIComponent(url)}` : url;
}

// ── Dynamic & Fuzzy Facility Search ─────────────────────────────────────────

export type FacilityStatusFilter = "all" | "verified" | "unverified";

export function normalizeSearchText(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "") // ignore apostrophes so "St. Mary's" matches "marys" or "mary"
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singleEditDistance(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a === b) return true;

  if (a.length === b.length) {
    let diff = 0;
    let idx1 = -1;
    let idx2 = -1;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        diff++;
        if (diff === 1) idx1 = i;
        else if (diff === 2) idx2 = i;
        else return false;
      }
    }
    if (diff === 1) return true; // 1 substitution
    if (
      diff === 2 &&
      idx2 === idx1 + 1 &&
      a[idx1] === b[idx2] &&
      a[idx2] === b[idx1]
    ) {
      return true; // 1 adjacent transposition (e.g. pheonix -> phoenix)
    }
    return false;
  }

  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  let i = 0;
  let j = 0;
  let diff = 0;
  while (i < longer.length && j < shorter.length) {
    if (longer[i] !== shorter[j]) {
      diff++;
      if (diff > 1) return false;
      i++;
    } else {
      i++;
      j++;
    }
  }
  return true;
}

function isFuzzyMatch(target: string, token: string): boolean {
  if (target.startsWith(token)) return true;
  if (singleEditDistance(target, token)) return true;

  // Check singular/base word if target ends in 's' (e.g. childrens -> children)
  if (target.endsWith("s") && target.length > 3) {
    const base = target.slice(0, -1);
    if (base.startsWith(token) || singleEditDistance(base, token)) return true;
  }

  // Check prefix of target with same length (for prefixes with a typo)
  if (target.length > token.length) {
    const targetSlice = target.slice(0, token.length);
    if (singleEditDistance(targetSlice, token)) return true;
  }

  return false;
}

/**
 * Evaluates match quality across name, fax number, and address.
 * Returns a score > 0 if all query tokens match, or 0 if non-matching.
 */
export function scoreFacilityMatch(f: Facility, query: string): number {
  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) return 1;

  const normName = normalizeSearchText(f.name);
  const normAddr = normalizeSearchText(f.address ?? "");
  const normQuery = normalizeSearchText(cleanQ);

  const rawFax = f.fax_number.toLowerCase();
  const faxDigits = f.fax_number.replace(/\D/g, "");
  const queryDigits = cleanQ.replace(/\D/g, "");

  // Highest priority: Exact full matches
  if (normName === normQuery) return 1000;
  if (faxDigits && queryDigits && faxDigits === queryDigits) return 950;
  if (normName.startsWith(normQuery)) return 800;

  const tokens = normQuery.split(" ").filter(Boolean);
  if (tokens.length === 0) return 0;

  const nameWords = normName.split(" ").filter(Boolean);
  const addrWords = normAddr.split(" ").filter(Boolean);
  const acronym = nameWords.map((w) => w[0]).join("");

  let totalScore = 0;

  // Every token must match somewhere (name, fax, or address)
  for (const token of tokens) {
    const tokenDigits = token.replace(/\D/g, "");
    let tokenMatched = false;
    let tokenScore = 0;

    // 1. Fax match (digit-based or raw)
    if (tokenDigits.length >= 3 && faxDigits.includes(tokenDigits)) {
      tokenMatched = true;
      if (faxDigits.endsWith(tokenDigits)) {
        tokenScore = Math.max(tokenScore, 350); // typed line digits
      } else if (faxDigits.startsWith(tokenDigits)) {
        tokenScore = Math.max(tokenScore, 300); // typed area code
      } else {
        tokenScore = Math.max(tokenScore, 250);
      }
    } else if (rawFax.includes(token)) {
      tokenMatched = true;
      tokenScore = Math.max(tokenScore, 200);
    }

    // 2. Name match (exact, prefix, word prefix, acronym, or fuzzy)
    if (normName.includes(token)) {
      tokenMatched = true;
      if (nameWords.some((w) => w.startsWith(token))) {
        tokenScore = Math.max(tokenScore, 220);
      } else {
        tokenScore = Math.max(tokenScore, 160);
      }
    } else if (token.length >= 2 && acronym.length >= 2 && (acronym === token || acronym.startsWith(token))) {
      tokenMatched = true;
      tokenScore = Math.max(tokenScore, 180);
    }

    // 3. Address match (street, city, state, zip)
    if (normAddr.includes(token)) {
      tokenMatched = true;
      if (addrWords.some((w) => w.startsWith(token))) {
        tokenScore = Math.max(tokenScore, 120);
      } else {
        tokenScore = Math.max(tokenScore, 90);
      }
    }

    // 4. Fuzzy fallback for minor typos (words length >= 4)
    if (!tokenMatched && token.length >= 4 && !tokenDigits) {
      if (nameWords.some((w) => isFuzzyMatch(w, token))) {
        tokenMatched = true;
        tokenScore = Math.max(tokenScore, 130);
      } else if (addrWords.some((w) => isFuzzyMatch(w, token))) {
        tokenMatched = true;
        tokenScore = Math.max(tokenScore, 70);
      }
    }

    if (!tokenMatched) {
      return 0; // All tokens must match
    }

    totalScore += tokenScore;
  }

  // Bonus if entire phrase appears contiguously in name or address
  if (normName.includes(normQuery)) totalScore += 100;
  if (normAddr.includes(normQuery)) totalScore += 50;

  // Verified facilities get a slight boost
  if (f.verified) totalScore += 5;

  return totalScore;
}

/**
 * Extracts city name from a facility's address string if available.
 */
export function extractCity(address?: string | null): string | null {
  if (!address || typeof address !== "string") return null;
  const cleaned = address.trim().replace(/[,.\s]+$/, "");
  if (!cleaned || cleaned.toLowerCase().includes("no street address")) return null;

  // 1. Check comma-separated parts: "..., City, ST 12345" or "..., City, ST"
  const commaParts = cleaned.split(",").map((p) => p.trim()).filter(Boolean);
  if (commaParts.length >= 2) {
    const last = commaParts[commaParts.length - 1];
    // State abbreviation + optional zip (e.g. "AZ 85351" or "AZ" or "VA 20153-1166")
    const stZipMatch = last.match(/^[A-Za-z]{2}(?:\s+\d{5}(?:-\d{4})?)?$/);
    if (stZipMatch) {
      const cityPart = commaParts[commaParts.length - 2];
      const cleanCity = cityPart
        .replace(/^(?:suite|ste|apt|bldg|unit|dept|p\.?o\.?\s*box)\s*[\w#.-]+\s*/i, "")
        .trim();
      if (cleanCity && cleanCity.length < 35 && !/\d/.test(cleanCity)) {
        return cleanCity;
      }
    }
  }

  // 2. Regex for "... City, ST 12345"
  const match = cleaned.match(/(?:,\s*|\s+)([A-Za-z\s.]+?),\s*([A-Za-z]{2})(?:\s+\d{5}(?:-\d{4})?)?$/);
  if (match && match[1]) {
    const city = match[1].trim();
    if (city && city.length < 35 && !/\d/.test(city)) {
      return city;
    }
  }

  return null;
}

export function filterAndRankFacilities(
  facilities: Facility[],
  query: string,
  statusFilter: FacilityStatusFilter = "all",
  cityFilter: string = "all"
): Facility[] {
  const normCity = cityFilter.trim().toLowerCase();
  const isCityFilterActive = normCity !== "all" && normCity !== "";

  const statusFiltered = facilities.filter((f) => {
    if (statusFilter === "verified" && !f.verified) return false;
    if (statusFilter === "unverified" && f.verified) return false;

    if (isCityFilterActive) {
      const city = extractCity(f.address);
      const matchCity = city?.toLowerCase() === normCity;
      const matchAddress = (f.address ?? "").toLowerCase().includes(normCity);
      if (!matchCity && !matchAddress) return false;
    }

    return true;
  });

  const q = query.trim();
  if (!q) {
    return [...statusFiltered].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true })
    );
  }

  const scored: { facility: Facility; score: number }[] = [];
  for (const f of statusFiltered) {
    const score = scoreFacilityMatch(f, q);
    if (score > 0) {
      scored.push({ facility: f, score });
    }
  }

  return scored
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.facility.name.localeCompare(b.facility.name, undefined, {
        sensitivity: "base",
        numeric: true,
      });
    })
    .map((s) => s.facility);
}

// ── Facilities Directory Export (CSV & PDF) ─────────────────────────────────

export function facilitiesToCSV(rows: Facility[]): string {
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["Facility Name", "Fax Number", "Status", "Physical Address"].map(escape).join(",");
  const body = rows
    .map((f) =>
      [
        f.name,
        formatFax(f.fax_number),
        f.verified ? "Verified" : "Standard",
        f.address ?? "",
      ]
        .map(escape)
        .join(","),
    )
    .join("\n");
  return `${header}\n${body}`;
}

export function downloadFacilitiesCSV(rows: Facility[], filename = "facilities-directory") {
  const blob = new Blob([facilitiesToCSV(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${rows.length} ${rows.length === 1 ? "facility" : "facilities"} to CSV`);
}

export async function downloadFacilitiesPDF(
  rows: Facility[],
  filename = "facilities-directory",
  title = "Facilities Directory",
) {
  const [{ default: JsPdf }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new JsPdf({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

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
    doc.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      pageWidth - margin - logoW,
      24,
      logoW,
      logoH,
    );
  } catch {
    // logo unavailable — skip it
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30);
  doc.text(title, margin, 44);

  let y = 60;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(
    `Exported ${new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`,
    pageWidth - margin,
    y,
    { align: "right" },
  );
  y += 20;

  const verifiedTotal = rows.filter((r) => r.verified).length;
  const standardTotal = rows.length - verifiedTotal;
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(
    `${rows.length} facilities (${verifiedTotal} Verified, ${standardTotal} Standard)`,
    margin,
    y,
  );
  y += 16;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Facility Name", "Fax Number", "Status", "Physical Address"]],
    body: rows.map((f) => [
      f.name,
      formatFax(f.fax_number),
      f.verified ? "Verified" : "Standard",
      f.address ?? "—",
    ]),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: 5,
      textColor: 40,
      lineColor: [220, 220, 225],
      lineWidth: 0.5,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [37, 42, 60],
      textColor: 255,
      fontStyle: "bold",
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: 180, fontStyle: "bold" },
      1: { cellWidth: 120 },
      2: { cellWidth: 90 },
      3: { cellWidth: "auto" },
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

  doc.save(`${filename}.pdf`);
  toast.success(`Exported ${rows.length} ${rows.length === 1 ? "facility" : "facilities"} to PDF`);
}


