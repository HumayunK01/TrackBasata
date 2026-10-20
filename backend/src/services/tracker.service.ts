import { supabaseAdmin } from "../config/supabase.js";
import {
  TrackerExportQuery,
  TrackerExportRow,
  TrackerExportResult,
} from "../types/tracker.js";
import { logAuditEvent } from "./audit.service.js";

export function getStatusGroup(overallStatus: string | null | undefined): "Resolved" | "Failed" | "Waiting" | "Incomplete" | null {
  if (!overallStatus) return null;
  const s = overallStatus.trim();
  if (s.startsWith("Resolved")) return "Resolved";
  if (s === "All Steps Failed") return "Failed";
  if (s.startsWith("Waiting")) return "Waiting";
  if (s.startsWith("Move to") || s === "Pending") return "Incomplete";
  return null;
}

export function displayStatus(status: string | null | undefined): string {
  if (!status) return "Pending";
  if (status.startsWith("Resolved")) return "Resolved";
  return status.replace(/\s*#\s*$/, "").trim();
}

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

export function getTrackerFilename(
  mode: "fax" | "indexable",
  ext: "csv" | "json",
  date: Date = new Date(),
  randomDigits = generate10RandomDigits()
): string {
  const prefix = mode === "fax" ? "FAX" : "INDEXABLE";
  const dateStr = formatMMDDYYYY(date);
  return `${prefix}_${dateStr}_${randomDigits}.${ext}`;
}

export function escapeCSVCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toISOString().replace("T", " ").substring(0, 19);
}

export async function exportTrackerData(
  userId: string,
  query: TrackerExportQuery
): Promise<TrackerExportResult> {
  const isFax = query.mode === "fax";
  const tableName = isFax ? "fax_tracker" : "indexable_tracker";
  const step3Label = isFax ? "Step 3 (Reupload ROI)" : "Step 3 (Reupload Indexable)";

  // 1. Fetch account lookup map (id -> name)
  const accountMap = new Map<string, string>();
  let selectedAccountName = "";
  try {
    const { data: accounts } = await supabaseAdmin
      .from("fax_accounts")
      .select("id, name");
    if (accounts) {
      for (const a of accounts) {
        accountMap.set(a.id, a.name);
      }
    }
    if (query.account_id) {
      selectedAccountName = accountMap.get(query.account_id) || "";
    }
  } catch {
    // Non-fatal if account names cannot be retrieved
  }

  // 2. Fetch rows in batches to bypass Supabase 1,000-row limit
  const PAGE_SIZE = 1000;
  let page = 0;
  const rawRows: TrackerExportRow[] = [];

  while (page < 100) {
    let dbQuery = supabaseAdmin
      .from(tableName)
      .select("id, account_id, patient_name, step1, step2, step3, overall_status, notes, created_at, updated_at")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (query.account_id) {
      dbQuery = dbQuery.eq("account_id", query.account_id);
    }

    const { data, error } = await dbQuery;
    if (error) throw error;
    if (!data || data.length === 0) break;

    rawRows.push(...(data as TrackerExportRow[]));
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  // 3. Attach human-friendly account name
  for (const r of rawRows) {
    r.account_name = accountMap.get(r.account_id) || "Unknown Account";
  }

  // 4. Apply status filtering (e.g. if 'waiting' is selected, only waiting rows export)
  let filteredRows = rawRows;
  if (query.status && query.status.trim()) {
    const targetStatuses = new Set(
      query.status
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    );

    if (targetStatuses.size > 0) {
      filteredRows = filteredRows.filter((r) => {
        const group = getStatusGroup(r.overall_status)?.toLowerCase();
        const rawStatus = (r.overall_status || "").toLowerCase();
        const cleanDisplay = displayStatus(r.overall_status).toLowerCase();

        return (
          (group && targetStatuses.has(group)) ||
          targetStatuses.has(rawStatus) ||
          targetStatuses.has(cleanDisplay) ||
          Array.from(targetStatuses).some((target) => rawStatus.includes(target))
        );
      });
    }
  }

  // 5. Apply search filtering (q / search)
  const searchTerm = (query.q || query.search || "").trim().toLowerCase();
  if (searchTerm) {
    filteredRows = filteredRows.filter((r) => {
      const patientMatch = (r.patient_name || "").toLowerCase().includes(searchTerm);
      const notesMatch = (r.notes || "").toLowerCase().includes(searchTerm);
      return patientMatch || notesMatch;
    });
  }

  // 6. Sort results
  const sortKey = query.sort;
  const sortDir = query.sort_dir === "asc" ? 1 : -1;

  filteredRows.sort((a, b) => {
    if (sortKey === "updated_at" || sortKey === "created_at") {
      const at = a[sortKey] ? new Date(a[sortKey]).getTime() : 0;
      const bt = b[sortKey] ? new Date(b[sortKey]).getTime() : 0;
      return (at - bt) * sortDir;
    }
    if (sortKey === "overall_status") {
      const av = displayStatus(a.overall_status);
      const bv = displayStatus(b.overall_status);
      return av.localeCompare(bv, undefined, { sensitivity: "base" }) * sortDir;
    }
    // Default patient_name
    const av = a.patient_name || "";
    const bv = b.patient_name || "";
    return av.localeCompare(bv, undefined, { sensitivity: "base" }) * sortDir;
  });

  // 7. Generate export payload & filename: FAX_MMDDYYYY_(10RandomNumbers) or INDEXABLE_MMDDYYYY_(10RandomNumbers)
  const now = new Date();
  const randomDigits = generate10RandomDigits();
  const filename = getTrackerFilename(query.mode, query.format === "json" ? "json" : "csv", now, randomDigits);

  // Log audit event
  await logAuditEvent(userId, "tracker_data_exported", {
    mode: query.mode,
    account_id: query.account_id || null,
    account_name: selectedAccountName || "All Accounts",
    status_filter: query.status || "all",
    search_filter: searchTerm || null,
    format: query.format,
    records_count: filteredRows.length,
  });

  if (query.format === "json") {
    const jsonOutput = {
      exported_at: now.toISOString(),
      mode: query.mode,
      account_id: query.account_id || null,
      account_name: selectedAccountName || "All Accounts",
      filters: {
        status: query.status || null,
        search: searchTerm || null,
      },
      total_count: filteredRows.length,
      records: filteredRows.map((r) => ({
        id: r.id,
        patient_name: r.patient_name,
        account_name: r.account_name,
        account_id: r.account_id,
        step1: r.step1,
        step2: r.step2 ?? null,
        step3: r.step3 ?? null,
        overall_status: displayStatus(r.overall_status),
        raw_status: r.overall_status,
        notes: r.notes ?? "",
        created_at: r.created_at,
        updated_at: r.updated_at,
      })),
    };

    return {
      format: "json",
      filename,
      contentType: "application/json; charset=utf-8",
      content: JSON.stringify(jsonOutput, null, 2),
      count: filteredRows.length,
    };
  }

  // Default: CSV format with UTF-8 BOM
  const headers = [
    "Patient Name",
    "Account",
    "Step 1 (Refax Same)",
    "Step 2 (Refax New)",
    step3Label,
    "Overall Status",
    "Status Detail",
    "Notes",
    "Created At",
    "Updated At",
  ];

  const csvRows: string[] = [];
  csvRows.push(headers.map(escapeCSVCell).join(","));

  for (const r of filteredRows) {
    const rowValues = [
      r.patient_name,
      r.account_name,
      r.step1,
      r.step2 || "—",
      r.step3 || "—",
      displayStatus(r.overall_status),
      r.overall_status,
      r.notes || "",
      formatDateTime(r.created_at),
      formatDateTime(r.updated_at),
    ];
    csvRows.push(rowValues.map(escapeCSVCell).join(","));
  }

  // Prepend UTF-8 BOM for flawless Excel rendering
  const BOM = "\uFEFF";
  const csvContent = BOM + csvRows.join("\r\n");

  return {
    format: "csv",
    filename,
    contentType: "text/csv; charset=utf-8",
    content: csvContent,
    count: filteredRows.length,
  };
}
