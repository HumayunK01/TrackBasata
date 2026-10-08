import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  useCredentialFolders,
  useCredentials,
  useAllCredentials,
  useDeleteCredential,
  useDeleteFolder,
  useMoveCredential,
  useBulkDeleteCredentials,
  useBulkMoveCredentials,
  type Credential,
  type CredentialFolder,
} from "@/hooks/useCredentials";
import { EmptyState } from "@/components/ar/industrial";
import { CredentialDialog } from "@/components/ar/credentials/CredentialDialog";
import { NewFolderDialog } from "@/components/ar/credentials/NewFolderDialog";
import { RenameFolderDialog } from "@/components/ar/credentials/RenameFolderDialog";
import { ServiceLogo } from "@/components/ar/credentials/ServiceLogo";
import { SelectCheckbox } from "@/components/ar/credentials/SelectCheckbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  FileDown,
  FileText,
  Folder,
  FolderInput,
  FolderPlus,
  KeyRound,
  Layers,
  LayoutGrid,
  List,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "@/components/ui/icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { CredentialCardItem } from "@/components/ar/credentials/CredentialCardItem";

const FOLDER_KEY = "credential-folder";
const VIEW_KEY = "credential-view";

// Mirrors the Daily Log CSV export: downloads a real .csv file so the whole
// folder can be opened as a table in Excel/Sheets.
function credentialCSV(rows: Credential[]): string {
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["Service", "ID", "Password", "Notes"].map(escape).join(",");
  const body = rows
    .map((r) => [r.service, r.login_id, r.password, r.notes ?? ""].map(escape).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

function downloadCredentialCSV(rows: Credential[], name: string) {
  const blob = new Blob([credentialCSV(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name || "credentials"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Mirrors the tracker PDF chrome (src/lib/tracker-utils.ts): logo, title,
// export timestamp, summary line, grid table, page-number footer.
async function downloadCredentialPDF(rows: Credential[], name: string, title: string) {
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
    doc.addImage(canvas.toDataURL("image/png"), "PNG", pageWidth - margin - logoW, 24, logoW, logoH);
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

  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(`${rows.length} credentials`, margin, y);
  y += 16;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Service", "Login ID", "Password", "Notes"]],
    body: rows.map((r) => [r.service, r.login_id, r.password, r.notes ?? ""]),
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8, cellPadding: 4, textColor: 40, lineColor: [220, 220, 225], lineWidth: 0.5, overflow: "linebreak" },
    headStyles: { fillColor: [37, 42, 60], textColor: 255, fontStyle: "bold", halign: "left" },
    columnStyles: {
      0: { cellWidth: 140, fontStyle: "bold" },
      1: { cellWidth: 170 },
      2: { cellWidth: 200 },
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

  doc.save(`${name || "credentials"}.pdf`);
}

const activeSpringTransition = {
  type: "spring" as const,
  stiffness: 450,
  damping: 32,
};

const CredentialsPage = () => {
  const reduceMotion = useReducedMotion();
  const tabTransition = reduceMotion ? { duration: 0 } : activeSpringTransition;
  const { user } = useAuth();
  const me = user?.id;
  const { data: folders = [], isLoading: foldersLoading } = useCredentialFolders();

  const [folderId, setFolderId] = useState<string | null>(() => localStorage.getItem(FOLDER_KEY));
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<CredentialFolder | null>(null);
  const [folderToRename, setFolderToRename] = useState<CredentialFolder | null>(null);

  useEffect(() => {
    if (foldersLoading || folders.length === 0) return;
    if (!folderId || !folders.some((f) => f.id === folderId)) {
      setFolderId(folders[0].id);
    }
  }, [folders, foldersLoading, folderId]);

  useEffect(() => {
    if (folderId) localStorage.setItem(FOLDER_KEY, folderId);
  }, [folderId]);

  const activeFolder = folders.find((f) => f.id === folderId) ?? null;
  const otherFolders = folders.filter((f) => f.id !== folderId);
  const [showAll, setShowAll] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "cards">(
    () => (localStorage.getItem(VIEW_KEY) as "list" | "cards" | null) ?? "list",
  );
  useEffect(() => { localStorage.setItem(VIEW_KEY, viewMode); }, [viewMode]);

  const folderQuery = useCredentials(showAll ? undefined : folderId ?? undefined);
  const allQuery = useAllCredentials(showAll);
  const { data: credentials = [], isLoading } = showAll ? allQuery : folderQuery;

  // Vault-wide credentials cache for the summary KPI cards
  const { data: allVaultCredentials = [] } = useAllCredentials(true);

  const deleteCredential = useDeleteCredential();
  const deleteFolder = useDeleteFolder();
  const moveCredential = useMoveCredential();
  const bulkDelete = useBulkDeleteCredentials();
  const bulkMove = useBulkMoveCredentials();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Credential | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Credential | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<Set<string>>(new Set());
  const revealTimers = useRef<Record<string, number>>({});

  useEffect(() => () => {
    Object.values(revealTimers.current).forEach((t) => clearTimeout(t));
  }, []);

  const copyField = async (key: string, text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
      flashCopied(key);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  const flashCopied = (key: string) => {
    setCopied((prev) => new Set(prev).add(key));
    window.setTimeout(() => {
      setCopied((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 1200);
  };

  const copyTable = (html: string, plain: string, onDone: () => void) => {
    const fail = () => toast.error("Couldn't copy to clipboard");
    if (navigator.clipboard && "ClipboardItem" in window) {
      navigator.clipboard
        .write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([plain], { type: "text/plain" }),
          }),
        ])
        .then(onDone)
        .catch(fail);
    } else {
      navigator.clipboard.writeText(plain).then(onDone).catch(fail);
    }
  };

  const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const TD_STYLE = "border:1px solid #444;padding:4px 12px;text-align:left;";
  const TH_STYLE = `${TD_STYLE}font-weight:600;background:#1e2130;color:#e2e8f0;`;
  const htmlTable = (headerCells: string[], bodyRows: string[][]) =>
    `<table style="border-collapse:collapse;font-family:sans-serif;font-size:13px;">` +
    `<tr>${headerCells.map((h) => `<td style="${TH_STYLE}">${escHtml(h)}</td>`).join("")}</tr>` +
    bodyRows
      .map((row) => `<tr>${row.map((v) => `<td style="${TD_STYLE}">${escHtml(v)}</td>`).join("")}</tr>`)
      .join("") +
    `</table>`;

  const copyCredential = (c: Credential) => {
    const rows: [string, string][] = [
      ["Service", c.service],
      ["ID", c.login_id],
      ["Password", c.password],
    ];
    if (c.notes) rows.push(["Notes", c.notes]);
    const html = htmlTable(
      rows.map(([k]) => k),
      [rows.map(([, v]) => v)],
    );
    const plain = rows.map(([k, v]) => `${k}\t${v}`).join("\n");
    copyTable(html, plain, () => {
      toast.success("Copied all fields");
      flashCopied(`${c.id}:copy`);
    });
  };

  const copyCredentialsTable = (rows: Credential[]) => {
    const headers = ["Service", "ID", "Password", "Notes"];
    const html = htmlTable(
      headers,
      rows.map((r) => [r.service, r.login_id, r.password, r.notes ?? ""]),
    );
    const plain = [
      headers.join("\t"),
      ...rows.map((r) => [r.service, r.login_id, r.password, r.notes ?? ""].join("\t")),
    ].join("\n");
    copyTable(html, plain, () => {
      toast.success("Copied table to clipboard");
      flashCopied("bulk:copy");
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return credentials;
    return credentials.filter(
      (c) =>
        c.service.toLowerCase().includes(q) ||
        c.login_id.toLowerCase().includes(q) ||
        (c.notes ?? "").toLowerCase().includes(q),
    );
  }, [credentials, search]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => { setSelected(new Set()); }, [showAll, folderId]);

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allVisibleSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const toggleSelectAll = () =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (allVisibleSelected) filtered.forEach((c) => n.delete(c.id));
      else filtered.forEach((c) => n.add(c.id));
      return n;
    });
  const selectedRows = credentials.filter((c) => selected.has(c.id));
  const allSelectedMine = selectedRows.length > 0 && selectedRows.every((c) => c.created_by === me);
  const clearSelection = () => setSelected(new Set());

  const toggleReveal = (id: string) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (revealTimers.current[id]) {
          clearTimeout(revealTimers.current[id]);
          delete revealTimers.current[id];
        }
      } else {
        next.add(id);
        revealTimers.current[id] = window.setTimeout(() => {
          setRevealed((p) => {
            const n = new Set(p);
            n.delete(id);
            return n;
          });
          delete revealTimers.current[id];
        }, 5000);
      }
      return next;
    });

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (row: Credential) => { setEditing(row); setDialogOpen(true); };

  return (
    <>
      <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-5 sm:py-6">
        <div className="w-full max-w-7xl mx-auto space-y-5 animate-fade-in">
          {/* Folder Navigation & Management Rail */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
            <div className="inline-flex items-center rounded-xl bg-muted/40 p-1 border border-border/50 text-xs h-10 shrink-0 shadow-2xs gap-1">
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className={cn(
                  "relative h-8 px-3 rounded-lg text-xs transition-colors duration-150 cursor-pointer select-none flex items-center gap-2 font-medium shrink-0",
                  showAll
                    ? "text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                {showAll && (
                  <motion.div
                    layoutId="vault-active-folder-pill"
                    className="absolute inset-0 rounded-lg bg-emerald-600 shadow-sm shadow-emerald-600/25"
                    transition={tabTransition}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Layers className={cn("size-3.5 shrink-0 transition-colors", showAll ? "text-white" : "text-muted-foreground")} />
                  <span>All Vault</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium leading-none transition-colors",
                      showAll ? "bg-white/20 text-white font-semibold" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {allVaultCredentials.length}
                  </span>
                </span>
              </button>

              {folders.map((f) => {
                const active = !showAll && f.id === folderId;
                const count = allVaultCredentials.filter((c) => c.folder_id === f.id).length;
                return (
                  <div
                    key={f.id}
                    className={cn(
                      "group relative h-8 pl-3 pr-1.5 rounded-lg text-xs transition-colors duration-150 flex items-center gap-2 shrink-0 font-medium",
                      active
                        ? "text-white font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    )}
                  >
                    {active && (
                      <motion.div
                        layoutId="vault-active-folder-pill"
                        className="absolute inset-0 rounded-lg bg-emerald-600 shadow-sm shadow-emerald-600/25"
                        transition={tabTransition}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => { setFolderId(f.id); setShowAll(false); }}
                      title={f.name}
                      className="relative z-10 flex items-center gap-1.5 h-full cursor-pointer min-w-0 max-w-[12rem]"
                    >
                      <Folder className={cn("size-3.5 shrink-0 transition-colors", active ? "text-white" : "text-muted-foreground")} />
                      <span className="truncate">{f.name}</span>
                      {count > 0 && (
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium leading-none ml-0.5 transition-colors",
                            active ? "bg-white/20 text-white font-semibold" : "bg-muted text-muted-foreground",
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                    {f.created_by === me && (
                      <button
                        type="button"
                        title={`Rename ${f.name}`}
                        onClick={() => setFolderToRename(f)}
                        className={cn(
                          "relative z-10 p-1 rounded-md transition-all cursor-pointer",
                          active
                            ? "text-white/80 hover:text-white hover:bg-white/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/80 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-100",
                        )}
                      >
                        <Pencil className="size-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFolderDialogOpen(true)}
              className="h-10 px-3.5 rounded-xl border-dashed border-border/60 hover:border-emerald-500/50 text-xs font-medium text-muted-foreground hover:text-foreground shrink-0 gap-1.5 bg-background/50 hover:bg-muted/50"
            >
              <FolderPlus className="size-3.5 text-emerald-500" />
              <span>New folder</span>
            </Button>
          </div>

          {/* Unified Command Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[200px] sm:min-w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search credentials, accounts, websites..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-9 h-10 rounded-xl bg-muted/40 border-border/50 text-sm focus-visible:ring-1 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500/50"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  title="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 size-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* View Mode Switcher (List vs Cards) */}
            <div className="inline-flex items-center rounded-xl bg-muted/40 p-1 border border-border/50 text-xs h-10 shrink-0 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                title="List view"
                aria-pressed={viewMode === "list"}
                className={cn(
                  "relative h-8 px-3 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer flex items-center gap-1.5",
                  viewMode === "list"
                    ? "text-white font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                {viewMode === "list" && (
                  <motion.div
                    layoutId="vault-active-view-pill"
                    className="absolute inset-0 rounded-lg bg-emerald-600 shadow-xs"
                    transition={tabTransition}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <List className="size-3.5" />
                  <span className="hidden sm:inline">List</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                title="Card view"
                aria-pressed={viewMode === "cards"}
                className={cn(
                  "relative h-8 px-3 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer flex items-center gap-1.5",
                  viewMode === "cards"
                    ? "text-white font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                {viewMode === "cards" && (
                  <motion.div
                    layoutId="vault-active-view-pill"
                    className="absolute inset-0 rounded-lg bg-emerald-600 shadow-xs"
                    transition={tabTransition}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <LayoutGrid className="size-3.5" />
                  <span className="hidden sm:inline">Cards</span>
                </span>
              </button>
            </div>

            {/* Export Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 rounded-xl px-3.5 border-border/50 bg-background/80 hover:bg-muted/60 text-xs font-medium shrink-0"
                  disabled={credentials.length === 0}
                  title={credentials.length === 0 ? "Nothing to export" : undefined}
                >
                  <FileDown className="size-4 mr-1.5 text-muted-foreground" />
                  <span>Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 font-sans p-1 rounded-xl shadow-lg border-border/60">
                <DropdownMenuItem
                  className="text-xs gap-2 cursor-pointer rounded-lg"
                  onClick={() => downloadCredentialCSV(credentials, showAll ? "all-credentials" : activeFolder?.name ?? "vault")}
                >
                  <FileText className="size-3.5 text-muted-foreground" /> CSV Spreadsheet
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-xs gap-2 cursor-pointer rounded-lg"
                  onClick={() => downloadCredentialPDF(credentials, showAll ? "all-credentials" : activeFolder?.name ?? "vault", showAll ? "Credential Vault" : (activeFolder?.name ?? "Credential Vault"))}
                >
                  <FileDown className="size-3.5 text-muted-foreground" /> PDF Document
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Add Credential Button */}
            <Button
              size="sm"
              className="h-10 rounded-xl px-4 font-semibold shadow-sm shadow-emerald-600/20 bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 cursor-pointer"
              onClick={openAdd}
            >
              <Plus className="size-4 mr-1.5" />
              <span>Add Credential</span>
            </Button>
          </div>

          {/* Floating Bulk Actions Bar */}
          {selected.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border border-emerald-500/30 bg-emerald-500/[0.06] backdrop-blur-md rounded-2xl px-4 py-3 shadow-sm animate-fade-in">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center justify-center size-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
                  {selectedRows.length}
                </span>
                <span className="text-xs font-semibold text-foreground">
                  selected of {filtered.length} credentials
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl border-border/60 bg-background/80 hover:bg-muted/60 text-xs"
                  onClick={() => copyCredentialsTable(selectedRows)}
                >
                  <Copy className="size-3.5 mr-1.5 text-muted-foreground" /> Copy table
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl border-border/60 bg-background/80 hover:bg-muted/60 text-xs"
                  onClick={() => downloadCredentialCSV(selectedRows, `selected-${selectedRows.length}-credentials`)}
                >
                  <FileText className="size-3.5 mr-1.5 text-muted-foreground" /> CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl border-border/60 bg-background/80 hover:bg-muted/60 text-xs"
                  onClick={() => downloadCredentialPDF(selectedRows, `selected-${selectedRows.length}-credentials`, `Credential Vault: ${selectedRows.length} selected`)}
                >
                  <FileDown className="size-3.5 mr-1.5 text-muted-foreground" /> PDF
                </Button>

                {allSelectedMine && (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 rounded-xl border-border/60 bg-background/80 hover:bg-muted/60 text-xs">
                          <FolderInput className="size-3.5 mr-1.5 text-muted-foreground" /> Move to
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 font-sans p-1 rounded-xl shadow-lg border-border/60">
                        {folders.length === 0 ? (
                          <span className="block px-2.5 py-1.5 text-xs text-muted-foreground">No folders</span>
                        ) : (
                          folders.map((f) => (
                            <DropdownMenuItem
                              key={f.id}
                              className="text-xs rounded-lg cursor-pointer"
                              onClick={() => bulkMove.mutate({ ids: [...selected], folderId: f.id }, { onSuccess: clearSelection })}
                            >
                              {f.name}
                            </DropdownMenuItem>
                          ))
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-9 rounded-xl px-3.5 text-xs font-semibold"
                      onClick={() => setBulkDeleteOpen(true)}
                    >
                      <Trash2 className="size-3.5 mr-1.5" /> Delete
                    </Button>
                  </>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  onClick={clearSelection}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Desktop List Table View */}
          {viewMode === "list" && (
            <div className="hidden md:block bg-card/60 border border-border/60 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground/80 font-mono border-b border-border/50">
                      <th className="w-10 px-3.5 py-3">
                        <SelectCheckbox
                          ariaLabel="Select all"
                          checked={allVisibleSelected}
                          onChange={toggleSelectAll}
                          disabled={filtered.length === 0}
                          className="align-middle"
                        />
                      </th>
                      <th className="px-3.5 py-3 text-left font-semibold">Service</th>
                      <th className="px-3.5 py-3 text-left font-semibold">Login ID</th>
                      <th className="px-3.5 py-3 text-left font-semibold">Password</th>
                      <th className="px-3.5 py-3 text-left font-semibold hidden xl:table-cell">Notes</th>
                      <th className="px-3.5 py-3 text-center font-semibold w-14" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-t border-border/40">
                          <td colSpan={6} className="px-3.5 py-3">
                            <div className="h-7 bg-muted/40 animate-pulse rounded-lg" />
                          </td>
                        </tr>
                      ))
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3.5 animate-fade-in">
                          <EmptyState
                            className="py-14"
                            icon={KeyRound}
                            title={credentials.length === 0 ? "No Credentials" : "No matches"}
                            hint={credentials.length === 0 ? "Add your first credential to this vault." : "Nothing matches your current search term."}
                          />
                        </td>
                      </tr>
                    ) : (
                      filtered.map((c) => {
                        const show = revealed.has(c.id);
                        return (
                          <tr
                            key={c.id}
                            className={cn(
                              "border-t border-border/40 transition-colors duration-150 hover:bg-muted/30",
                              selected.has(c.id) && "bg-emerald-500/[0.05]",
                            )}
                          >
                            <td className="px-3.5 py-3 w-10">
                              <SelectCheckbox
                                ariaLabel={`Select ${c.service}`}
                                checked={selected.has(c.id)}
                                onChange={() => toggleSelect(c.id)}
                              />
                            </td>
                            <td className="px-3.5 py-3">
                              <div className="flex items-center gap-3 min-w-0 max-w-xs">
                                <div className="size-8 rounded-lg bg-muted/40 border border-border/40 p-1 flex items-center justify-center shrink-0">
                                  <ServiceLogo service={c.service} website={c.website} className="size-6 rounded" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="font-semibold text-foreground truncate block text-xs leading-tight" title={c.service}>
                                    {c.service}
                                  </span>
                                  {c.website && (
                                    <span className="text-[11px] text-muted-foreground/70 truncate block mt-0.5" title={c.website}>
                                      {c.website.replace(/^https?:\/\//, "")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-3.5 py-3">
                              <div className="flex items-center gap-1.5 max-w-xs group/field">
                                <button
                                  type="button"
                                  onClick={() => copyField(`${c.id}:login`, c.login_id, "Login ID")}
                                  title={`${c.login_id}: click to copy`}
                                  className="press-scale text-left font-medium text-foreground/90 hover:text-foreground hover:underline underline-offset-2 truncate flex-1 min-w-0 cursor-pointer text-xs"
                                >
                                  {c.login_id}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyField(`${c.id}:login`, c.login_id, "Login ID")}
                                  title="Copy login ID"
                                  className={cn(
                                    "size-6 rounded flex items-center justify-center shrink-0 press-scale transition-colors cursor-pointer",
                                    copied.has(`${c.id}:login`)
                                      ? "text-emerald-500 bg-emerald-500/10"
                                      : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/60",
                                  )}
                                >
                                  {copied.has(`${c.id}:login`)
                                    ? <Check className="size-3.5 animate-fade-in" />
                                    : <Copy className="size-3.5" />}
                                </button>
                              </div>
                            </td>
                            <td className="px-3.5 py-3">
                              <div className="flex items-center gap-1.5 max-w-xs">
                                <span className="font-mono text-xs text-foreground/90 truncate min-w-24" title={show ? c.password : undefined}>
                                  {show ? c.password : "••••••••••••"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleReveal(c.id)}
                                  title={show ? "Hide password" : "Show password"}
                                  className="size-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer shrink-0"
                                >
                                  {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyField(`${c.id}:pwd`, c.password, "Password")}
                                  title="Copy password"
                                  className={cn(
                                    "size-6 rounded flex items-center justify-center shrink-0 press-scale transition-colors cursor-pointer",
                                    copied.has(`${c.id}:pwd`)
                                      ? "text-emerald-500 bg-emerald-500/10"
                                      : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/60",
                                  )}
                                >
                                  {copied.has(`${c.id}:pwd`)
                                    ? <Check className="size-3.5 animate-fade-in" />
                                    : <Copy className="size-3.5" />}
                                </button>
                              </div>
                            </td>
                            <td className="px-3.5 py-3 text-muted-foreground/80 max-w-[14rem] truncate hidden xl:table-cell" title={c.notes ?? ""}>
                              {c.notes || <span className="text-muted-foreground/40 font-mono">—</span>}
                            </td>
                            <td className="px-3.5 py-3 text-center w-14">
                              <div className="flex items-center justify-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => copyCredential(c)}
                                  title="Copy all fields"
                                  className={cn(
                                    "size-7 rounded-lg flex items-center justify-center press-scale transition-colors cursor-pointer",
                                    copied.has(`${c.id}:copy`)
                                      ? "text-emerald-500 bg-emerald-500/10"
                                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                                  )}
                                >
                                  {copied.has(`${c.id}:copy`)
                                    ? <Check className="size-3.5 animate-fade-in" />
                                    : <Copy className="size-3.5" />}
                                </button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
                                      aria-label={`Actions for ${c.service}`}
                                    >
                                      <MoreVertical className="size-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44 font-sans p-1 rounded-xl shadow-lg border-border/60">
                                    <DropdownMenuItem className="text-xs gap-2 cursor-pointer rounded-lg" onClick={() => copyCredential(c)}>
                                      <Copy className="size-3.5" /> Copy all fields
                                    </DropdownMenuItem>
                                    {c.created_by === me && (
                                      <>
                                        <DropdownMenuSub>
                                          <DropdownMenuSubTrigger className="text-xs gap-2 cursor-pointer rounded-lg">
                                            <FolderInput className="size-3.5" /> Move to
                                          </DropdownMenuSubTrigger>
                                          <DropdownMenuPortal>
                                            <DropdownMenuSubContent className="w-44 font-sans p-1 rounded-xl shadow-lg border-border/60">
                                              {otherFolders.length === 0 ? (
                                                <span className="block px-2.5 py-1.5 text-xs text-muted-foreground">No other folders</span>
                                              ) : (
                                                otherFolders.map((f) => (
                                                  <DropdownMenuItem
                                                    key={f.id}
                                                    className="text-xs gap-2 cursor-pointer rounded-lg"
                                                    onClick={() => moveCredential.mutate({ id: c.id, folderId: f.id })}
                                                  >
                                                    {f.name}
                                                  </DropdownMenuItem>
                                                ))
                                              )}
                                            </DropdownMenuSubContent>
                                          </DropdownMenuPortal>
                                        </DropdownMenuSub>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-xs gap-2 cursor-pointer rounded-lg" onClick={() => openEdit(c)}>
                                          <Pencil className="size-3.5" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="text-xs gap-2 text-destructive cursor-pointer rounded-lg focus:text-destructive focus:bg-destructive/10"
                                          onClick={() => setDeleteTarget(c)}
                                        >
                                          <Trash2 className="size-3.5" /> Delete
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Desktop & Mobile Card Grid View */}
          {(viewMode === "cards" || false) && (
            <div className="hidden md:block">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-border/60 bg-card/60 p-4 space-y-3">
                      <div className="h-6 bg-muted/40 animate-pulse rounded-xl w-1/2" />
                      <div className="h-10 bg-muted/30 animate-pulse rounded-xl w-full" />
                      <div className="h-10 bg-muted/30 animate-pulse rounded-xl w-full" />
                    </div>
                  ))
                ) : filtered.length === 0 ? (
                  <div className="lg:col-span-2 xl:col-span-3">
                    <EmptyState
                      className="py-14"
                      icon={KeyRound}
                      title={credentials.length === 0 ? "No Credentials" : "No matches"}
                      hint={credentials.length === 0 ? "Add your first credential to this vault." : "Nothing matches your current search term."}
                    />
                  </div>
                ) : (
                  filtered.map((c) => (
                    <CredentialCardItem
                      key={c.id}
                      credential={c}
                      selected={selected.has(c.id)}
                      revealed={revealed.has(c.id)}
                      copiedLogin={copied.has(`${c.id}:login`)}
                      copiedPassword={copied.has(`${c.id}:pwd`)}
                      copiedFull={copied.has(`${c.id}:copy`)}
                      otherFolders={otherFolders}
                      canManage={c.created_by === me}
                      onToggleSelect={() => toggleSelect(c.id)}
                      onToggleReveal={() => toggleReveal(c.id)}
                      onCopyLogin={() => copyField(`${c.id}:login`, c.login_id, "Login ID")}
                      onCopyPassword={() => copyField(`${c.id}:pwd`, c.password, "Password")}
                      onCopyFull={() => copyCredential(c)}
                      onMove={(folderId) => moveCredential.mutate({ id: c.id, folderId })}
                      onEdit={() => openEdit(c)}
                      onDelete={() => setDeleteTarget(c)}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* Mobile Card List View (Always active on mobile screens) */}
          <div className="md:hidden space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-border/60 bg-card/60 p-4 space-y-2.5">
                  <div className="h-5 bg-muted/40 animate-pulse rounded-lg w-1/2" />
                  <div className="h-8 bg-muted/30 animate-pulse rounded-lg w-full" />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <EmptyState
                className="py-12"
                icon={KeyRound}
                title={credentials.length === 0 ? "No Credentials" : "No matches"}
                hint={credentials.length === 0 ? "Add your first credential to this vault." : "Nothing matches your current search term."}
              />
            ) : (
              filtered.map((c) => (
                <CredentialCardItem
                  key={c.id}
                  credential={c}
                  selected={selected.has(c.id)}
                  revealed={revealed.has(c.id)}
                  copiedLogin={copied.has(`${c.id}:login`)}
                  copiedPassword={copied.has(`${c.id}:pwd`)}
                  copiedFull={copied.has(`${c.id}:copy`)}
                  otherFolders={otherFolders}
                  canManage={c.created_by === me}
                  onToggleSelect={() => toggleSelect(c.id)}
                  onToggleReveal={() => toggleReveal(c.id)}
                  onCopyLogin={() => copyField(`${c.id}:login`, c.login_id, "Login ID")}
                  onCopyPassword={() => copyField(`${c.id}:pwd`, c.password, "Password")}
                  onCopyFull={() => copyCredential(c)}
                  onMove={(folderId) => moveCredential.mutate({ id: c.id, folderId })}
                  onEdit={() => openEdit(c)}
                  onDelete={() => setDeleteTarget(c)}
                />
              ))
            )}
          </div>
        </div>
      </main>

      <CredentialDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        row={editing}
        folderId={showAll ? undefined : folderId ?? undefined}
        folders={folders}
      />

      <NewFolderDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        onCreated={(f) => setFolderId(f.id)}
      />

      <RenameFolderDialog
        open={!!folderToRename}
        onOpenChange={(o) => !o && setFolderToRename(null)}
        folder={folderToRename}
        onRequestDelete={(f) => { setFolderToRename(null); setFolderToDelete(f); }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-border/60 rounded-2xl shadow-xl p-5 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold text-foreground">
              Delete this credential?
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-xs leading-relaxed text-muted-foreground">
              This permanently removes <span className="font-medium text-foreground">{deleteTarget?.service}</span> from your vault. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
            <AlertDialogCancel className="h-10 rounded-xl border-border/60 hover:bg-muted/60 font-medium">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-10 rounded-xl px-5 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
              onClick={() => {
                if (deleteTarget) deleteCredential.mutate(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Delete Credential
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!folderToDelete} onOpenChange={(o) => !o && setFolderToDelete(null)}>
        <AlertDialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-border/60 rounded-2xl shadow-xl p-5 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold text-foreground">
              Delete folder?
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-xs leading-relaxed text-muted-foreground">
              This deletes the folder <span className="font-medium text-foreground">{folderToDelete?.name}</span>
              {" "}and <span className="font-medium text-destructive">all credentials inside it</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
            <AlertDialogCancel className="h-10 rounded-xl border-border/60 hover:bg-muted/60 font-medium">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-10 rounded-xl px-5 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
              onClick={() => {
                const target = folderToDelete;
                if (!target) return;
                deleteFolder.mutate(target.id, {
                  onSuccess: () => {
                    if (target.id === folderId) {
                      const next = folders.find((f) => f.id !== target.id);
                      setFolderId(next ? next.id : null);
                    }
                  },
                });
                setFolderToDelete(null);
              }}
            >
              Delete Folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={(o) => !o && setBulkDeleteOpen(false)}>
        <AlertDialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-border/60 rounded-2xl shadow-xl p-5 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold text-foreground">
              Delete {selectedRows.length} credentials?
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-xs leading-relaxed text-muted-foreground">
              This permanently removes the {selectedRows.length} selected credentials from the vault. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
            <AlertDialogCancel className="h-10 rounded-xl border-border/60 hover:bg-muted/60 font-medium">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-10 rounded-xl px-5 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
              onClick={() => {
                bulkDelete.mutate([...selected], { onSuccess: clearSelection });
                setBulkDeleteOpen(false);
              }}
            >
              Delete {selectedRows.length} Credentials
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CredentialsPage;
