import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  FileDown,
  FileText,
  Folder,
  FolderInput,
  FolderPlus,
  Globe,
  KeyRound,
  Layers,
  LayoutGrid,
  List,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  User,
  X,
} from "@/components/ui/icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { CredentialCardItem } from "@/components/ar/credentials/CredentialCardItem";

const FOLDER_KEY = "credential-folder";
const VIEW_KEY = "basata_vault_view_mode_v2";

// Mirrors the Daily Log CSV export: downloads a real .csv file so the whole
// folder can be opened as a table in Excel/Sheets.
function credentialCSV(rows: Credential[]): string {
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["Service", "Account / Notes", "Login ID", "Password", "Website"].map(escape).join(",");
  const body = rows
    .map((r) => [r.service, r.notes ?? "", r.login_id, r.password, r.website ?? ""].map(escape).join(","))
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
    head: [["Service", "Account / Notes", "Login ID", "Password"]],
    body: rows.map((r) => [r.service, r.notes ?? "", r.login_id, r.password]),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 4,
      textColor: 40,
      lineColor: [220, 220, 225],
      lineWidth: 0.5,
      overflow: "linebreak",
    },
    headStyles: { fillColor: [37, 42, 60], textColor: 255, fontStyle: "bold", halign: "left" },
    columnStyles: {
      0: { cellWidth: 130, fontStyle: "bold" },
      1: { cellWidth: 160 },
      2: { cellWidth: 180 },
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

interface CredentialSection {
  id: string;
  name: string;
  folder: CredentialFolder | null;
  items: Credential[];
}

const CredentialsPage = () => {
  const reduceMotion = useReducedMotion();
  const tabTransition = reduceMotion ? { duration: 0 } : activeSpringTransition;
  const { user } = useAuth();
  const me = user?.id;
  const { data: folders = [], isLoading: foldersLoading } = useCredentialFolders();

  const [searchParams, setSearchParams] = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const updateUrlParams = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, val] of Object.entries(updates)) {
            if (val === null || val === undefined || val === "") {
              next.delete(key);
            } else {
              next.set(key, val);
            }
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const urlView = searchParams.get("view")?.toLowerCase();
  const viewMode: "list" | "cards" = useMemo(() => {
    if (urlView === "list" || urlView === "cards") return urlView;
    const saved = localStorage.getItem(VIEW_KEY) as "list" | "cards" | null;
    if (saved === "list" || saved === "cards") return saved;
    return "cards";
  }, [urlView]);

  const handleViewModeChange = (newView: "list" | "cards") => {
    try {
      localStorage.setItem(VIEW_KEY, newView);
    } catch {}
    updateUrlParams({
      view: newView === "cards" ? null : newView,
    });
  };

  const [folderId, setFolderId] = useState<string | null>(() => localStorage.getItem(FOLDER_KEY));
  const [showAll, setShowAll] = useState(() => {
    const urlFolder = searchParams.get("folder")?.trim();
    if (urlFolder) return urlFolder.toLowerCase() === "all";
    return true;
  });
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<CredentialFolder | null>(null);
  const [folderToRename, setFolderToRename] = useState<CredentialFolder | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (foldersLoading || folders.length === 0) return;

    const urlFolder = searchParams.get("folder")?.trim();

    if (urlFolder) {
      if (urlFolder.toLowerCase() === "all") {
        setShowAll(true);
      } else {
        const match = folders.find(
          (f) => f.name.toLowerCase() === urlFolder.toLowerCase() || f.id === urlFolder,
        );
        if (match) {
          setFolderId(match.id);
          setShowAll(false);
          if (urlFolder !== match.name) {
            updateUrlParams({ folder: match.name });
          }
        } else {
          setShowAll(true);
        }
      }
    } else {
      setShowAll(true);
    }
  }, [folders, foldersLoading, searchParams, updateUrlParams]);

  const handleSelectFolder = (f: CredentialFolder) => {
    setFolderId(f.id);
    setShowAll(false);
    try {
      localStorage.setItem(FOLDER_KEY, f.id);
    } catch {}
    updateUrlParams({ folder: f.name });
  };

  const handleSelectAllVault = () => {
    setShowAll(true);
    updateUrlParams({ folder: null });
  };

  const activeFolder = folders.find((f) => f.id === folderId) ?? null;

  const folderQuery = useCredentials(showAll ? undefined : folderId ?? undefined);
  const allQuery = useAllCredentials(showAll);
  const { data: credentials = [], isLoading } = showAll ? allQuery : folderQuery;

  // Vault-wide credentials cache for folder counts
  const { data: allVaultCredentials = [] } = useAllCredentials(true);

  const deleteCredential = useDeleteCredential();
  const deleteFolder = useDeleteFolder();
  const moveCredential = useMoveCredential();
  const bulkDelete = useBulkDeleteCredentials();
  const bulkMove = useBulkMoveCredentials();

  const urlSearch = searchParams.get("q") ?? "";
  const [search, setSearch] = useState(urlSearch);

  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = search.trim();
      if (trimmed !== (searchParams.get("q") ?? "")) {
        updateUrlParams({ q: trimmed || null });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [search, searchParams, updateUrlParams]);

  // Press `/` to focus search input
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          (e.target as HTMLElement)?.isContentEditable
        )
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogFolderId, setDialogFolderId] = useState<string | undefined>(undefined);
  const [editing, setEditing] = useState<Credential | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Credential | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [exportWarningOpen, setExportWarningOpen] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<Set<string>>(new Set());
  const revealTimers = useRef<Record<string, number>>({});

  useEffect(
    () => () => {
      Object.values(revealTimers.current).forEach((t) => clearTimeout(t));
    },
    [],
  );

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

  const copyField = async (key: string, text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
      flashCopied(key);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
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

  const escHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

  const copyCredentialsTable = (rows: Credential[], flashKey = "bulk:copy", label?: string) => {
    if (rows.length === 0) return;
    const headers = ["Service", "Account / Notes", "ID", "Password"];
    const html = htmlTable(
      headers,
      rows.map((r) => [r.service, r.notes ?? "", r.login_id, r.password]),
    );
    const plain = [
      headers.join("\t"),
      ...rows.map((r) => [r.service, r.notes ?? "", r.login_id, r.password].join("\t")),
    ].join("\n");
    copyTable(html, plain, () => {
      toast.success(
        label
          ? `Copied ${rows.length} ${label} credentials`
          : `Copied ${rows.length} ${rows.length === 1 ? "credential" : "credentials"} to clipboard`,
      );
      flashCopied(flashKey);
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return credentials;
    return credentials.filter(
      (c) =>
        c.service.toLowerCase().includes(q) ||
        c.login_id.toLowerCase().includes(q) ||
        (c.notes ?? "").toLowerCase().includes(q) ||
        (c.website ?? "").toLowerCase().includes(q),
    );
  }, [credentials, search]);

  // Hierarchical folder sections for "All Vault" view
  const folderSections = useMemo<CredentialSection[]>(() => {
    if (!showAll) {
      return [
        {
          id: activeFolder?.id ?? "current",
          name: activeFolder?.name ?? "Vault",
          folder: activeFolder,
          items: filtered,
        },
      ];
    }

    const byFolder = new Map<string, Credential[]>();
    const uncategorized: Credential[] = [];
    const knownIds = new Set(folders.map((f) => f.id));

    for (const c of filtered) {
      if (c.folder_id && knownIds.has(c.folder_id)) {
        const list = byFolder.get(c.folder_id) ?? [];
        list.push(c);
        byFolder.set(c.folder_id, list);
      } else {
        uncategorized.push(c);
      }
    }

    const sections: CredentialSection[] = [];
    for (const f of folders) {
      const items = byFolder.get(f.id) ?? [];
      if (items.length > 0) {
        sections.push({
          id: f.id,
          name: f.name,
          folder: f,
          items,
        });
      }
    }

    if (uncategorized.length > 0) {
      sections.push({
        id: "uncategorized",
        name: "General",
        folder: null,
        items: uncategorized,
      });
    }

    return sections;
  }, [showAll, activeFolder, filtered, folders]);

  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const allSectionsCollapsed =
    showAll &&
    folderSections.length > 1 &&
    folderSections.every((s) => collapsedSections.has(s.id));

  const toggleCollapseAll = () => {
    if (allSectionsCollapsed) {
      setCollapsedSections(new Set());
    } else {
      setCollapsedSections(new Set(folderSections.map((s) => s.id)));
    }
  };

  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelected(new Set());
  }, [showAll, folderId]);

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  const toggleSelectAll = () =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (allVisibleSelected) filtered.forEach((c) => n.delete(c.id));
      else filtered.forEach((c) => n.add(c.id));
      return n;
    });

  const selectedRows = credentials.filter((c) => selected.has(c.id));
  const allSelectedMine =
    selectedRows.length > 0 && selectedRows.every((c) => c.created_by === me);

  const clearSelection = () => {
    setSelected(new Set());
    setSelectionMode(false);
  };

  const toggleSelectionMode = () => {
    if (selectionMode || selected.size > 0) {
      clearSelection();
    } else {
      setSelectionMode(true);
    }
  };

  const showSelectionChrome = selectionMode || selected.size > 0;

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

  const openAdd = (targetFolderId?: string) => {
    setEditing(null);
    setDialogFolderId(targetFolderId ?? (showAll ? undefined : folderId ?? undefined));
    setDialogOpen(true);
  };

  const openEdit = (row: Credential) => {
    setEditing(row);
    setDialogFolderId(row.folder_id);
    setDialogOpen(true);
  };

  const renderTableRows = (items: Credential[]) =>
    items.map((c) => {
      const show = revealed.has(c.id);
      const isSelected = selected.has(c.id);
      const rowOtherFolders = folders.filter((f) => f.id !== c.folder_id);
      const cleanDomain = (c.website ?? "")
        .trim()
        .replace(/^https?:\/\//i, "")
        .replace(/\/+$/, "");

      return (
        <tr
          key={c.id}
          onClick={showSelectionChrome ? () => toggleSelect(c.id) : undefined}
          className={cn(
            "border-t border-border/40 transition-colors duration-150 hover:bg-muted/30",
            showSelectionChrome && "cursor-pointer select-none",
            isSelected && "bg-emerald-500/[0.05]",
          )}
        >
          {showSelectionChrome && (
            <td
              className="px-3.5 py-2.5 w-10"
              onClick={(e) => e.stopPropagation()}
            >
              <SelectCheckbox
                ariaLabel={`Select ${c.service}`}
                checked={isSelected}
                onChange={() => toggleSelect(c.id)}
              />
            </td>
          )}

          {/* Service & Website */}
          <td className="px-3.5 py-2.5">
            <div className="flex items-center gap-2.5 min-w-0 max-w-xs">
              <div className="size-8 rounded-lg bg-muted/40 border border-border/45 p-1 flex items-center justify-center shrink-0">
                <ServiceLogo service={c.service} website={c.website} className="size-5 rounded" />
              </div>
              <div className="min-w-0 flex-1">
                <span
                  className="font-semibold text-foreground truncate block text-xs leading-tight"
                  title={c.service}
                >
                  {c.service}
                </span>
                {cleanDomain && (
                  <a
                    href={c.website!.startsWith("http") ? c.website! : `https://${c.website}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground/65 hover:text-emerald-400 truncate mt-0.5 max-w-full"
                    title={c.website ?? ""}
                  >
                    <Globe className="size-2.5 shrink-0 opacity-70" />
                    <span className="truncate">{cleanDomain}</span>
                  </a>
                )}
              </div>
            </div>
          </td>

          {/* Account Holder / Notes (Promoted to 2nd column for immediate recognition) */}
          <td className="px-3.5 py-2.5 max-w-[15rem]">
            {c.notes ? (
              <div className="flex items-center gap-1.5 min-w-0" title={c.notes}>
                <User className="size-3 text-emerald-500/80 dark:text-emerald-400/80 shrink-0" />
                <span className="text-xs font-medium text-foreground/85 truncate">
                  {c.notes}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground/35 font-mono text-xs">—</span>
            )}
          </td>

          {/* Login ID */}
          <td
            className="px-3.5 py-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1.5 max-w-xs">
              <button
                type="button"
                onClick={() => copyField(`${c.id}:login`, c.login_id, "Login ID")}
                title={`${c.login_id} — click to copy`}
                className="press-scale text-left font-medium text-foreground/90 hover:text-emerald-400 truncate flex-1 min-w-0 cursor-pointer text-xs transition-colors"
              >
                {c.login_id}
              </button>
              <button
                type="button"
                onClick={() => copyField(`${c.id}:login`, c.login_id, "Login ID")}
                title="Copy login ID"
                className={cn(
                  "size-6 rounded-md flex items-center justify-center shrink-0 press-scale transition-colors cursor-pointer",
                  copied.has(`${c.id}:login`)
                    ? "text-emerald-400 bg-emerald-500/15"
                    : "text-muted-foreground/55 hover:text-foreground hover:bg-muted/60",
                )}
              >
                {copied.has(`${c.id}:login`) ? (
                  <Check className="size-3.5 animate-fade-in" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </div>
          </td>

          {/* Password */}
          <td
            className="px-3.5 py-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1.5 max-w-xs">
              <button
                type="button"
                onClick={() => copyField(`${c.id}:pwd`, c.password, "Password")}
                title={show ? `${c.password} — click to copy` : "Click to copy password"}
                className={cn(
                  "font-mono text-xs truncate min-w-24 text-left cursor-pointer transition-colors",
                  show
                    ? "text-emerald-400 font-medium"
                    : "text-muted-foreground/65 tracking-[0.16em] hover:text-foreground",
                )}
              >
                {show ? c.password : "••••••••••••"}
              </button>
              <button
                type="button"
                onClick={() => toggleReveal(c.id)}
                title={show ? "Hide password" : "Show password"}
                className={cn(
                  "size-6 rounded-md flex items-center justify-center transition-colors cursor-pointer shrink-0",
                  show
                    ? "text-emerald-400 bg-emerald-500/10"
                    : "text-muted-foreground/55 hover:text-foreground hover:bg-muted/60",
                )}
              >
                {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => copyField(`${c.id}:pwd`, c.password, "Password")}
                title="Copy password"
                className={cn(
                  "size-6 rounded-md flex items-center justify-center shrink-0 press-scale transition-colors cursor-pointer",
                  copied.has(`${c.id}:pwd`)
                    ? "text-emerald-400 bg-emerald-500/15"
                    : "text-muted-foreground/55 hover:text-foreground hover:bg-muted/60",
                )}
              >
                {copied.has(`${c.id}:pwd`) ? (
                  <Check className="size-3.5 animate-fade-in" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </div>
          </td>

          {/* Actions */}
          <td
            className="px-3.5 py-2.5 text-center w-16"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center gap-0.5">
              <button
                type="button"
                onClick={() => copyCredential(c)}
                title="Copy all fields"
                className={cn(
                  "size-7 rounded-lg flex items-center justify-center press-scale transition-colors cursor-pointer",
                  copied.has(`${c.id}:copy`)
                    ? "text-emerald-400 bg-emerald-500/15"
                    : "text-muted-foreground/65 hover:text-foreground hover:bg-muted/60",
                )}
              >
                {copied.has(`${c.id}:copy`) ? (
                  <Check className="size-3.5 animate-fade-in" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 cursor-pointer"
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
                            {rowOtherFolders.length === 0 ? (
                              <span className="block px-2.5 py-1.5 text-xs text-muted-foreground">No other folders</span>
                            ) : (
                              rowOtherFolders.map((f) => (
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
    });

  return (
    <>
      <main className="flex-1 overflow-y-auto px-3 sm:px-6 pb-8">
        <div className="w-full max-w-7xl mx-auto space-y-5 animate-fade-in">
          {/* Sticky Unified Navigation & Command Header */}
          <div className="sticky top-0 z-20 -mx-3 sm:-mx-6 px-3 sm:px-6 pt-3 pb-3 bg-background/85 backdrop-blur-xl border-b border-border/50 space-y-2.5">
            {/* Row 1: Search & Primary Actions (Matches Facilities Directory Toolbar) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
              {/* Search Input */}
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search by service, person, login ID, or website..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-14 h-9 rounded-xl bg-background/90 dark:bg-black/35 border-border/70 text-xs shadow-2xs focus-visible:ring-1 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500/50"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      updateUrlParams({ q: null });
                    }}
                    title="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 size-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : (
                  <kbd className="pointer-events-none hidden sm:inline-flex items-center justify-center h-5 px-1.5 rounded-md border border-border/60 bg-muted/50 font-mono text-[10px] text-muted-foreground/70 absolute right-2.5 top-1/2 -translate-y-1/2">
                    /
                  </kbd>
                )}
              </div>

              {/* Right Action Cluster */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between md:justify-end">
                {/* View Mode Switcher (Tactile Surface Thumb) */}
                <div
                  role="group"
                  aria-label="View mode"
                  className="inline-flex h-9 items-center gap-0.5 rounded-xl bg-background/90 dark:bg-black/35 p-1 border border-border/70 shadow-2xs text-xs shrink-0"
                >
                  {(
                    [
                      { mode: "cards" as const, label: "Cards", Icon: LayoutGrid },
                      { mode: "list" as const, label: "List", Icon: List },
                    ]
                  ).map(({ mode, label, Icon }) => {
                    const isActive = viewMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => handleViewModeChange(mode)}
                        aria-pressed={isActive}
                        title={`${label} view`}
                        className={cn(
                          "relative z-0 h-full px-2.5 rounded-lg font-medium transition-colors duration-150 cursor-pointer inline-flex items-center gap-1.5 select-none",
                          isActive
                            ? "text-foreground font-semibold"
                            : "text-muted-foreground hover:text-foreground/90",
                        )}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="vault-active-view-pill"
                            transition={tabTransition}
                            className="absolute inset-0 rounded-lg bg-card dark:bg-white/[0.09] border border-border/80 dark:border-white/12 shadow-xs -z-10"
                          />
                        )}
                        <Icon
                          className={cn(
                            "size-3.5 transition-colors",
                            isActive ? "text-emerald-500 dark:text-emerald-400" : "text-muted-foreground",
                          )}
                        />
                        <span className="hidden sm:inline">{label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Select Mode Toggle */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectionMode}
                  disabled={filtered.length === 0 && !showSelectionChrome}
                  className={cn(
                    "h-9 rounded-xl px-3 border text-xs font-medium shrink-0 cursor-pointer shadow-2xs transition-colors",
                    showSelectionChrome
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 font-semibold"
                      : "border-border/70 bg-background/90 dark:bg-black/35 hover:bg-muted/60 text-foreground",
                  )}
                >
                  <CheckCheck className="size-3.5 mr-1.5 text-muted-foreground" />
                  <span>
                    {showSelectionChrome
                      ? selected.size > 0
                        ? `${selected.size} Selected`
                        : "Done"
                      : "Select"}
                  </span>
                </Button>

                {showSelectionChrome && filtered.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="h-9 rounded-xl px-3 border-border/70 bg-background/90 dark:bg-black/35 hover:bg-muted/60 text-xs font-medium shrink-0 cursor-pointer shadow-2xs"
                  >
                    {allVisibleSelected ? "Deselect All" : `Select All (${filtered.length})`}
                  </Button>
                )}

                {/* Unified Copy & Export Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-xl px-3 border-border/70 bg-background/90 dark:bg-black/35 hover:bg-muted/60 text-xs font-medium shrink-0 cursor-pointer shadow-2xs"
                      disabled={credentials.length === 0}
                      title={credentials.length === 0 ? "Nothing to export" : undefined}
                    >
                      <FileDown className="size-3.5 mr-1.5 text-muted-foreground" />
                      <span>Export</span>
                      <ChevronDown className="size-3 ml-1 text-muted-foreground/70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 font-sans p-1 rounded-xl shadow-lg border-border/60">
                    <DropdownMenuItem
                      className="text-xs gap-2 cursor-pointer rounded-lg"
                      onClick={() =>
                        copyCredentialsTable(
                          selectedRows.length > 0 ? selectedRows : filtered,
                          "toolbar:copy",
                        )
                      }
                    >
                      <Copy className="size-3.5 text-muted-foreground" /> Copy Table to Clipboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-xs gap-2 cursor-pointer rounded-lg"
                      onClick={() => setExportWarningOpen(true)}
                    >
                      <FileText className="size-3.5 text-muted-foreground" /> Export CSV Spreadsheet
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-xs gap-2 cursor-pointer rounded-lg"
                      onClick={() =>
                        downloadCredentialPDF(
                          credentials,
                          showAll ? "all-credentials" : activeFolder?.name ?? "vault",
                          showAll ? "Credential Vault" : activeFolder?.name ?? "Credential Vault",
                        )
                      }
                    >
                      <FileDown className="size-3.5 text-muted-foreground" /> Export PDF Document
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Primary CTA: Add Credential */}
                <Button
                  size="sm"
                  className="h-9 rounded-xl px-3.5 text-xs font-semibold shadow-xs shadow-emerald-600/20 bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 cursor-pointer"
                  onClick={() => openAdd()}
                >
                  <Plus className="size-3.5 mr-1.5" />
                  <span>Add Credential</span>
                </Button>
              </div>
            </div>

            {/* Row 2: Folder Filter Rail (Symmetrical Tabs + Inline New Folder) */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  role="tablist"
                  aria-label="Vault folders"
                  className="inline-flex h-9 items-center gap-0.5 rounded-xl bg-background/90 dark:bg-black/35 p-1 border border-border/70 shadow-2xs text-xs shrink-0"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={showAll}
                    onClick={handleSelectAllVault}
                    className={cn(
                      "relative z-0 h-full px-3 rounded-lg text-xs transition-colors duration-150 cursor-pointer select-none inline-flex items-center gap-1.5 shrink-0",
                      showAll
                        ? "text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground/90 font-medium",
                    )}
                  >
                    {showAll && (
                      <motion.span
                        layoutId="vault-active-folder-pill"
                        className="absolute inset-0 rounded-lg bg-card dark:bg-white/[0.09] border border-border/80 dark:border-white/12 shadow-xs -z-10"
                        transition={tabTransition}
                      />
                    )}
                    <Layers
                      className={cn(
                        "size-3.5 shrink-0 transition-colors",
                        showAll ? "text-emerald-500 dark:text-emerald-400" : "text-muted-foreground",
                      )}
                    />
                    <span>All Vault</span>
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums leading-none transition-colors",
                        showAll
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-semibold"
                          : "bg-muted/70 dark:bg-white/[0.05] text-muted-foreground/80",
                      )}
                    >
                      {allVaultCredentials.length}
                    </span>
                  </button>

                  {folders.map((f) => {
                    const active = !showAll && f.id === folderId;
                    const count = allVaultCredentials.filter((c) => c.folder_id === f.id).length;
                    return (
                      <div
                        key={f.id}
                        className={cn(
                          "relative z-0 h-full rounded-lg text-xs transition-colors duration-150 inline-flex items-center shrink-0",
                          active
                            ? "text-foreground font-semibold"
                            : "text-muted-foreground hover:text-foreground/90 font-medium",
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="vault-active-folder-pill"
                            className="absolute inset-0 rounded-lg bg-card dark:bg-white/[0.09] border border-border/80 dark:border-white/12 shadow-xs -z-10"
                            transition={tabTransition}
                          />
                        )}
                        <button
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => handleSelectFolder(f)}
                          title={f.name}
                          className={cn(
                            "flex items-center gap-1.5 h-full cursor-pointer min-w-0 max-w-[11rem]",
                            active && f.created_by === me ? "pl-3 pr-1.5" : "px-3",
                          )}
                        >
                          <Folder
                            className={cn(
                              "size-3.5 shrink-0 transition-colors",
                              active ? "text-emerald-500 dark:text-emerald-400" : "text-muted-foreground/80",
                            )}
                          />
                          <span className="truncate">{f.name}</span>
                          {count > 0 && (
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums leading-none transition-colors",
                                active
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-semibold"
                                  : "bg-muted/70 dark:bg-white/[0.05] text-muted-foreground/80",
                              )}
                            >
                              {count}
                            </span>
                          )}
                        </button>
                        {active && f.created_by === me && (
                          <button
                            type="button"
                            title={`Rename ${f.name}`}
                            onClick={() => setFolderToRename(f)}
                            className="mr-1.5 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
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
                  className="h-9 px-3 rounded-xl border-dashed border-border/70 hover:border-emerald-500/50 text-xs font-medium text-muted-foreground hover:text-foreground shrink-0 gap-1.5 bg-background/60 dark:bg-black/25 hover:bg-muted/50 cursor-pointer"
                >
                  <FolderPlus className="size-3.5 text-emerald-500 dark:text-emerald-400" />
                  <span>New folder</span>
                </Button>
              </div>

              {showAll && folderSections.length > 1 && (
                <button
                  type="button"
                  onClick={toggleCollapseAll}
                  className="h-8 px-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors hidden sm:inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform duration-200",
                      allSectionsCollapsed && "-rotate-90",
                    )}
                  />
                  <span>{allSectionsCollapsed ? "Expand all" : "Collapse all"}</span>
                </button>
              )}
            </div>

            {/* Bulk Selection Action Bar */}
            {selected.size > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2.5 border border-emerald-500/30 bg-emerald-500/[0.06] rounded-xl px-3.5 py-2 animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center size-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold font-mono">
                    {selectedRows.length}
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    selected of {filtered.length}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg border-border/60 bg-background/80 hover:bg-muted/60 text-xs cursor-pointer"
                    onClick={() => copyCredentialsTable(selectedRows)}
                  >
                    <Copy className="size-3.5 mr-1.5 text-muted-foreground" /> Copy table
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg border-border/60 bg-background/80 hover:bg-muted/60 text-xs cursor-pointer"
                    onClick={() =>
                      downloadCredentialCSV(selectedRows, `selected-${selectedRows.length}-credentials`)
                    }
                  >
                    <FileText className="size-3.5 mr-1.5 text-muted-foreground" /> CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg border-border/60 bg-background/80 hover:bg-muted/60 text-xs cursor-pointer"
                    onClick={() =>
                      downloadCredentialPDF(
                        selectedRows,
                        `selected-${selectedRows.length}-credentials`,
                        `Credential Vault: ${selectedRows.length} selected`,
                      )
                    }
                  >
                    <FileDown className="size-3.5 mr-1.5 text-muted-foreground" /> PDF
                  </Button>

                  {allSelectedMine && (
                    <>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg border-border/60 bg-background/80 hover:bg-muted/60 text-xs cursor-pointer"
                          >
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
                                onClick={() =>
                                  bulkMove.mutate(
                                    { ids: [...selected], folderId: f.id },
                                    { onSuccess: clearSelection },
                                  )
                                }
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
                        className="h-8 rounded-lg px-3 text-xs font-semibold cursor-pointer"
                        onClick={() => setBulkDeleteOpen(true)}
                      >
                        <Trash2 className="size-3.5 mr-1.5" /> Delete
                      </Button>
                    </>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
                    onClick={clearSelection}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Content Area: Hierarchical Folder Sections or Focused Folder */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${showAll ? "all" : (folderId ?? "none")}-${viewMode}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-border/55 bg-card/60 p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-muted/40 animate-pulse" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-4 bg-muted/40 animate-pulse rounded w-1/2" />
                          <div className="h-3 bg-muted/30 animate-pulse rounded w-2/3" />
                        </div>
                      </div>
                      <div className="h-[72px] bg-muted/25 animate-pulse rounded-xl w-full" />
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-border/55 bg-card/50">
                  <EmptyState
                    className="py-16"
                    icon={KeyRound}
                    title={credentials.length === 0 ? "No Credentials Yet" : "No Matching Credentials"}
                    hint={
                      credentials.length === 0
                        ? "Add your first credential to start organizing this vault."
                        : "Try clearing or adjusting your search query."
                    }
                  />
                </div>
              ) : (
                <div className="space-y-7">
                  {folderSections.map((section) => {
                    const isCollapsed = showAll && collapsedSections.has(section.id);
                    const sampleItem = section.items[0];
                    const sectionCopyKey = `sec:${section.id}:copy`;

                    return (
                      <section key={section.id} className="space-y-3">
                        {/* Hierarchical Section Header */}
                        <div className="flex items-center justify-between gap-3 px-1 pb-2 border-b border-border/45">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {showAll ? (
                              <button
                                type="button"
                                onClick={() => toggleSectionCollapse(section.id)}
                                className="flex items-center gap-2.5 min-w-0 group/sec cursor-pointer text-left"
                              >
                                <span className="size-6 rounded-lg bg-muted/40 border border-border/45 flex items-center justify-center text-muted-foreground group-hover/sec:text-foreground group-hover/sec:bg-muted/70 transition-colors shrink-0">
                                  <ChevronDown
                                    className={cn(
                                      "size-3.5 transition-transform duration-200",
                                      isCollapsed && "-rotate-90",
                                    )}
                                  />
                                </span>
                                <div className="size-7 rounded-lg bg-muted/35 border border-border/45 p-1 flex items-center justify-center shrink-0">
                                  {sampleItem ? (
                                    <ServiceLogo
                                      service={sampleItem.service}
                                      website={sampleItem.website}
                                      className="size-5 rounded-sm"
                                    />
                                  ) : (
                                    <Folder className="size-3.5 text-emerald-400" />
                                  )}
                                </div>
                                <h2 className="text-sm font-semibold text-foreground tracking-tight truncate">
                                  {section.name}
                                </h2>
                                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/40 shrink-0">
                                  {section.items.length}
                                </span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="size-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-1.5 flex items-center justify-center shrink-0">
                                  {sampleItem ? (
                                    <ServiceLogo
                                      service={sampleItem.service}
                                      website={sampleItem.website}
                                      className="size-5 rounded-sm"
                                    />
                                  ) : (
                                    <Folder className="size-4 text-emerald-400" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-semibold text-foreground tracking-tight">
                                      {section.name}
                                    </h2>
                                    <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      {section.items.length} {section.items.length === 1 ? "credential" : "credentials"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Section Quick Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                copyCredentialsTable(section.items, sectionCopyKey, section.name)
                              }
                              title={`Copy ${section.name} credentials as table`}
                              className={cn(
                                "h-7 px-2.5 rounded-lg text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer",
                                copied.has(sectionCopyKey)
                                  ? "text-emerald-400 bg-emerald-500/15"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                              )}
                            >
                              {copied.has(sectionCopyKey) ? (
                                <Check className="size-3 text-emerald-400" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                              <span className="hidden sm:inline">Copy group</span>
                            </button>

                            {section.folder && (
                              <button
                                type="button"
                                onClick={() => openAdd(section.folder!.id)}
                                title={`Add credential to ${section.name}`}
                                className="h-7 px-2.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 inline-flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Plus className="size-3 text-emerald-500" />
                                <span className="hidden sm:inline">Add</span>
                              </button>
                            )}

                            {showAll && section.folder && (
                              <button
                                type="button"
                                onClick={() => handleSelectFolder(section.folder!)}
                                title={`Open ${section.name} folder`}
                                className="h-7 px-2 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 inline-flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <span className="hidden md:inline">Focus</span>
                                <ArrowRight className="size-3" />
                              </button>
                            )}

                            {!showAll && section.folder && section.folder.created_by === me && (
                              <button
                                type="button"
                                onClick={() => setFolderToRename(section.folder!)}
                                title={`Rename ${section.name}`}
                                className="h-7 px-2.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Pencil className="size-3" />
                                <span className="hidden sm:inline">Rename</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Section Body */}
                        {!isCollapsed && (
                          <>
                            {/* Desktop List View */}
                            {viewMode === "list" && (
                              <div className="hidden md:block bg-card/65 border border-border/55 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xs">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-muted/35 text-[10px] uppercase tracking-wider text-muted-foreground/75 font-mono border-b border-border/45">
                                        {showSelectionChrome && (
                                          <th className="w-10 px-3.5 py-2.5 text-left">
                                            <SelectCheckbox
                                              ariaLabel={`Select all in ${section.name}`}
                                              checked={
                                                section.items.length > 0 &&
                                                section.items.every((c) => selected.has(c.id))
                                              }
                                              onChange={() => {
                                                const allSecSelected = section.items.every((c) =>
                                                  selected.has(c.id),
                                                );
                                                setSelected((prev) => {
                                                  const n = new Set(prev);
                                                  if (allSecSelected) {
                                                    section.items.forEach((c) => n.delete(c.id));
                                                  } else {
                                                    section.items.forEach((c) => n.add(c.id));
                                                  }
                                                  return n;
                                                });
                                              }}
                                            />
                                          </th>
                                        )}
                                        <th className="px-3.5 py-2.5 text-left font-semibold">Service</th>
                                        <th className="px-3.5 py-2.5 text-left font-semibold">Account / Label</th>
                                        <th className="px-3.5 py-2.5 text-left font-semibold">Login ID</th>
                                        <th className="px-3.5 py-2.5 text-left font-semibold">Password</th>
                                        <th className="px-3.5 py-2.5 text-center font-semibold w-16" aria-label="Actions" />
                                      </tr>
                                    </thead>
                                    <tbody>{renderTableRows(section.items)}</tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* Desktop Card Grid View */}
                            {viewMode === "cards" && (
                              <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3.5">
                                {section.items.map((c) => (
                                  <CredentialCardItem
                                    key={c.id}
                                    credential={c}
                                    selectionMode={showSelectionChrome}
                                    selected={selected.has(c.id)}
                                    revealed={revealed.has(c.id)}
                                    copiedLogin={copied.has(`${c.id}:login`)}
                                    copiedPassword={copied.has(`${c.id}:pwd`)}
                                    copiedFull={copied.has(`${c.id}:copy`)}
                                    otherFolders={folders.filter((f) => f.id !== c.folder_id)}
                                    canManage={c.created_by === me}
                                    onToggleSelect={() => toggleSelect(c.id)}
                                    onToggleReveal={() => toggleReveal(c.id)}
                                    onCopyLogin={() => copyField(`${c.id}:login`, c.login_id, "Login ID")}
                                    onCopyPassword={() => copyField(`${c.id}:pwd`, c.password, "Password")}
                                    onCopyFull={() => copyCredential(c)}
                                    onMove={(targetFolderId) =>
                                      moveCredential.mutate({ id: c.id, folderId: targetFolderId })
                                    }
                                    onEdit={() => openEdit(c)}
                                    onDelete={() => setDeleteTarget(c)}
                                  />
                                ))}
                              </div>
                            )}

                            {/* Mobile Card Stack (Always active on mobile screens) */}
                            <div className="md:hidden space-y-2.5">
                              {section.items.map((c) => (
                                <CredentialCardItem
                                  key={c.id}
                                  credential={c}
                                  selectionMode={showSelectionChrome}
                                  selected={selected.has(c.id)}
                                  revealed={revealed.has(c.id)}
                                  copiedLogin={copied.has(`${c.id}:login`)}
                                  copiedPassword={copied.has(`${c.id}:pwd`)}
                                  copiedFull={copied.has(`${c.id}:copy`)}
                                  otherFolders={folders.filter((f) => f.id !== c.folder_id)}
                                  canManage={c.created_by === me}
                                  onToggleSelect={() => toggleSelect(c.id)}
                                  onToggleReveal={() => toggleReveal(c.id)}
                                  onCopyLogin={() => copyField(`${c.id}:login`, c.login_id, "Login ID")}
                                  onCopyPassword={() => copyField(`${c.id}:pwd`, c.password, "Password")}
                                  onCopyFull={() => copyCredential(c)}
                                  onMove={(targetFolderId) =>
                                    moveCredential.mutate({ id: c.id, folderId: targetFolderId })
                                  }
                                  onEdit={() => openEdit(c)}
                                  onDelete={() => setDeleteTarget(c)}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </section>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <CredentialDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        row={editing}
        folderId={dialogFolderId}
        folders={folders}
      />

      <NewFolderDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        onCreated={(f) => handleSelectFolder(f)}
      />

      <RenameFolderDialog
        open={!!folderToRename}
        onOpenChange={(o) => !o && setFolderToRename(null)}
        folder={folderToRename}
        onRequestDelete={(f) => {
          setFolderToRename(null);
          setFolderToDelete(f);
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-border/60 rounded-2xl shadow-xl p-5 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold text-foreground">
              Delete this credential?
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-xs leading-relaxed text-muted-foreground">
              This permanently removes{" "}
              <span className="font-medium text-foreground">{deleteTarget?.service}</span>
              {deleteTarget?.notes ? ` (${deleteTarget.notes})` : ""} from your vault. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
            <AlertDialogCancel className="h-10 rounded-xl border-border/60 hover:bg-muted/60 font-medium text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-10 rounded-xl px-5 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold text-xs"
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
              This deletes the folder{" "}
              <span className="font-medium text-foreground">{folderToDelete?.name}</span> and{" "}
              <span className="font-medium text-destructive">all credentials inside it</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
            <AlertDialogCancel className="h-10 rounded-xl border-border/60 hover:bg-muted/60 font-medium text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-10 rounded-xl px-5 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold text-xs"
              onClick={() => {
                const target = folderToDelete;
                if (!target) return;
                deleteFolder.mutate(target.id, {
                  onSuccess: () => {
                    if (target.id === folderId) {
                      handleSelectAllVault();
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
            <AlertDialogCancel className="h-10 rounded-xl border-border/60 hover:bg-muted/60 font-medium text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-10 rounded-xl px-5 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold text-xs"
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

      <AlertDialog open={exportWarningOpen} onOpenChange={setExportWarningOpen}>
        <AlertDialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-border/60 rounded-2xl shadow-xl p-5 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Export Unencrypted Passwords?
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Exporting to CSV saves account names, logins, and{" "}
              <strong className="text-amber-500">passwords in plaintext</strong> to your local device. Ensure you store this file securely and delete it after use to maintain HIPAA / security compliance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
            <AlertDialogCancel className="h-10 rounded-xl border-border/60 hover:bg-muted/60 font-medium text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-10 rounded-xl px-5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs"
              onClick={() => {
                downloadCredentialCSV(
                  credentials,
                  showAll ? "all-credentials" : activeFolder?.name ?? "vault",
                );
                setExportWarningOpen(false);
                toast.success("Credentials exported to CSV");
              }}
            >
              Confirm Plaintext Export
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CredentialsPage;
