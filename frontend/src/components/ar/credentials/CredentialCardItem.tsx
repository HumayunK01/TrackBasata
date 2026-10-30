import { Check, Copy, Eye, EyeOff, FolderInput, Globe, MoreVertical, Pencil, Trash2, User } from "@/components/ui/icons";
import { ServiceLogo } from "./ServiceLogo";
import { SelectCheckbox } from "./SelectCheckbox";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import type { Credential, CredentialFolder } from "@/hooks/useCredentials";

interface CredentialCardItemProps {
  credential: Credential;
  selectionMode?: boolean;
  selected: boolean;
  revealed: boolean;
  copiedLogin: boolean;
  copiedPassword: boolean;
  copiedFull: boolean;
  otherFolders: CredentialFolder[];
  canManage: boolean;
  onToggleSelect: () => void;
  onToggleReveal: () => void;
  onCopyLogin: () => void;
  onCopyPassword: () => void;
  onCopyFull: () => void;
  onMove: (folderId: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}

function formatDomain(website: string | null | undefined): string | null {
  const raw = (website ?? "").trim();
  if (!raw) return null;
  return raw.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

export function CredentialCardItem({
  credential: c,
  selectionMode = false,
  selected,
  revealed,
  copiedLogin,
  copiedPassword,
  copiedFull,
  otherFolders,
  canManage,
  onToggleSelect,
  onToggleReveal,
  onCopyLogin,
  onCopyPassword,
  onCopyFull,
  onMove,
  onEdit,
  onDelete,
}: CredentialCardItemProps) {
  const website = c.website?.trim();
  const cleanDomain = formatDomain(website);
  const note = c.notes?.trim() ?? "";
  const isLongNote = note.length > 56 || note.includes("\n");
  const showCheckbox = selectionMode || selected;

  return (
    <div
      onClick={selectionMode ? onToggleSelect : undefined}
      className={cn(
        "group/card relative rounded-2xl border bg-card/70 backdrop-blur-md p-3.5 sm:p-4 transition-all duration-150 flex flex-col justify-between gap-3",
        selectionMode && "cursor-pointer select-none",
        selected
          ? "border-emerald-500/60 bg-emerald-500/[0.05] ring-1 ring-emerald-500/25 shadow-sm"
          : "border-border/55 hover:border-border/85 hover:bg-card/90 shadow-2xs",
      )}
    >
      {/* Top Identity Header */}
      <div className="flex items-center gap-3 min-w-0">
        {showCheckbox && (
          <div
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <SelectCheckbox
              ariaLabel={`Select ${c.service}`}
              checked={selected}
              onChange={onToggleSelect}
            />
          </div>
        )}

        <div className="size-9 rounded-xl bg-muted/40 border border-border/50 p-1.5 flex items-center justify-center shrink-0">
          <ServiceLogo service={c.service} website={c.website} className="size-6 rounded-md" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <h3
              className="font-semibold text-foreground text-[13.5px] truncate leading-snug tracking-tight"
              title={c.service}
            >
              {c.service}
            </h3>
            {cleanDomain && note && (
              <a
                href={website!.startsWith("http") ? website! : `https://${website}`}
                target="_blank"
                rel="noreferrer noopener"
                onClick={(e) => e.stopPropagation()}
                title={`Open ${cleanDomain}`}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground/65 hover:text-emerald-400 transition-colors truncate max-w-[9.5rem] shrink-0"
              >
                <Globe className="size-2.5 shrink-0 opacity-70" />
                <span className="truncate">{cleanDomain}</span>
              </a>
            )}
          </div>

          {/* Primary Differentiator Subtitle: Account Owner / Note or Website */}
          {note ? (
            <div className="flex items-center gap-1.5 mt-0.5 min-w-0" title={note}>
              <User className="size-3 text-emerald-500/80 dark:text-emerald-400/80 shrink-0" />
              <span className="text-xs font-medium text-foreground/85 truncate leading-tight">
                {note}
              </span>
            </div>
          ) : cleanDomain ? (
            <a
              href={website!.startsWith("http") ? website! : `https://${website}`}
              target="_blank"
              rel="noreferrer noopener"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground/75 hover:text-emerald-400 transition-colors truncate mt-0.5 max-w-full"
              title={website}
            >
              <Globe className="size-3 shrink-0 opacity-70" />
              <span className="truncate">{cleanDomain}</span>
            </a>
          ) : (
            <p className="text-[11px] text-muted-foreground/55 truncate mt-0.5">
              {c.login_id}
            </p>
          )}
        </div>

        {/* Top-Right Quick Actions */}
        <div
          className="flex items-center gap-0.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onCopyFull}
            title="Copy all credential fields"
            aria-label="Copy all credential fields"
            className={cn(
              "size-7 rounded-lg flex items-center justify-center press-scale transition-colors cursor-pointer",
              copiedFull
                ? "text-emerald-400 bg-emerald-500/15"
                : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100 max-md:opacity-100",
            )}
          >
            {copiedFull ? <Check className="size-3.5 animate-fade-in" /> : <Copy className="size-3.5" />}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Actions for ${c.service}`}
                className="size-7 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 shrink-0 cursor-pointer"
              >
                <MoreVertical className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 font-sans p-1 rounded-xl shadow-lg border-border/60">
              <DropdownMenuItem className="text-xs gap-2 cursor-pointer rounded-lg" onClick={onCopyFull}>
                <Copy className="size-3.5" /> Copy all fields
              </DropdownMenuItem>
              {canManage && (
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
                              className="text-xs cursor-pointer rounded-lg"
                              onClick={() => onMove(f.id)}
                            >
                              {f.name}
                            </DropdownMenuItem>
                          ))
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-xs gap-2 cursor-pointer rounded-lg" onClick={onEdit}>
                    <Pencil className="size-3.5" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-xs gap-2 text-destructive cursor-pointer rounded-lg focus:text-destructive focus:bg-destructive/10"
                    onClick={onDelete}
                  >
                    <Trash2 className="size-3.5" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Unified 2-Row Credential Surface (Eliminates 3 nested boxes per card) */}
      <div
        className="rounded-xl bg-muted/25 dark:bg-black/20 border border-border/45 divide-y divide-border/35 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Row 1: Login ID */}
        <div className="flex items-center gap-2.5 h-9 px-3 hover:bg-muted/35 transition-colors group/row">
          <span className="w-9 shrink-0 text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground/55 select-none">
            User
          </span>
          <button
            type="button"
            onClick={onCopyLogin}
            title={`${c.login_id} — click to copy`}
            className="flex-1 min-w-0 text-left text-xs font-medium text-foreground/90 hover:text-foreground truncate cursor-pointer transition-colors"
          >
            {c.login_id}
          </button>
          <button
            type="button"
            onClick={onCopyLogin}
            title="Copy Login ID"
            aria-label="Copy Login ID"
            className={cn(
              "size-6 rounded-md flex items-center justify-center press-scale transition-colors cursor-pointer shrink-0",
              copiedLogin
                ? "text-emerald-400 bg-emerald-500/15"
                : "text-muted-foreground/55 hover:text-foreground hover:bg-muted/60",
            )}
          >
            {copiedLogin ? <Check className="size-3.5 animate-fade-in" /> : <Copy className="size-3.5" />}
          </button>
        </div>

        {/* Row 2: Password */}
        <div className="flex items-center gap-2.5 h-9 px-3 hover:bg-muted/35 transition-colors group/row">
          <span className="w-9 shrink-0 text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground/55 select-none">
            Pass
          </span>
          <button
            type="button"
            onClick={onCopyPassword}
            title={revealed ? `${c.password} — click to copy` : "Click to copy password"}
            className={cn(
              "flex-1 min-w-0 text-left text-xs font-mono truncate cursor-pointer transition-colors",
              revealed
                ? "text-emerald-400 font-medium select-all"
                : "text-muted-foreground/65 tracking-[0.16em] hover:text-foreground/90",
            )}
          >
            {revealed ? c.password : "••••••••••••"}
          </button>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={onToggleReveal}
              title={revealed ? "Hide password" : "Show password"}
              aria-label={revealed ? "Hide password" : "Show password"}
              className={cn(
                "size-6 rounded-md flex items-center justify-center transition-colors cursor-pointer",
                revealed
                  ? "text-emerald-400 bg-emerald-500/10"
                  : "text-muted-foreground/55 hover:text-foreground hover:bg-muted/60",
              )}
            >
              {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
            <button
              type="button"
              onClick={onCopyPassword}
              title="Copy Password"
              aria-label="Copy Password"
              className={cn(
                "size-6 rounded-md flex items-center justify-center press-scale transition-colors cursor-pointer",
                copiedPassword
                  ? "text-emerald-400 bg-emerald-500/15"
                  : "text-muted-foreground/55 hover:text-foreground hover:bg-muted/60",
              )}
            >
              {copiedPassword ? <Check className="size-3.5 animate-fade-in" /> : <Copy className="size-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Extended Notes Footer (only rendered when note is multi-line or long) */}
      {isLongNote && (
        <p
          className="text-[11px] text-muted-foreground/75 leading-relaxed px-1 line-clamp-2 break-words"
          title={note}
        >
          {note}
        </p>
      )}
    </div>
  );
}
