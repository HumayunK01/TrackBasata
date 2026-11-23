import { Check, Copy, Eye, EyeOff, FolderInput, MoreVertical, Pencil, Trash2, User } from "@/components/ui/icons";
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
  const note = c.notes?.trim() ?? "";
  const isLongNote = note.length > 56 || note.includes("\n");
  const showCheckbox = selectionMode || selected;

  return (
    <div
      onClick={selectionMode ? onToggleSelect : undefined}
      className={cn(
        "group/card relative rounded-2xl border bg-card/90 backdrop-blur-md p-4 transition-all duration-150 flex flex-col justify-between gap-3.5",
        selectionMode && "cursor-pointer select-none",
        selected
          ? "border-emerald-500/60 bg-emerald-500/[0.05] ring-1 ring-emerald-500/25 shadow-sm"
          : "border-border/70 hover:border-border hover:bg-card shadow-2xs",
      )}
    >
      {/* Top Identity Header: Clear Hierarchy using full card width */}
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          {showCheckbox && (
            <div
              className="shrink-0 pt-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <SelectCheckbox
                ariaLabel={`Select ${c.service}`}
                checked={selected}
                onChange={onToggleSelect}
              />
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-1">
            <h3
              className="font-bold text-foreground text-[15px] truncate leading-tight tracking-tight"
              title={c.service}
            >
              {c.service}
            </h3>

            {note ? (
              <div className="flex items-center gap-1.5 min-w-0" title={note}>
                <User className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-[12.5px] font-medium text-foreground/80 dark:text-foreground/75 truncate leading-snug">
                  {note}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 min-w-0">
                <User className="size-3.5 text-muted-foreground/60 shrink-0" />
                <span className="text-xs text-muted-foreground/70 truncate leading-snug">
                  {c.login_id}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Top-Right Quick Actions */}
        <div
          className="flex items-center gap-1 shrink-0 -mr-1 -mt-0.5"
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
                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/15"
                : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/60",
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
                className="size-7 rounded-lg text-muted-foreground/75 hover:text-foreground hover:bg-muted/60 shrink-0 cursor-pointer"
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

      {/* Unified 2-Row Credential Surface with structured label column */}
      <div
        className="rounded-xl bg-muted/35 dark:bg-black/25 border border-border/60 divide-y divide-border/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Row 1: Login ID */}
        <div className="flex items-center gap-2.5 h-10 px-3.5 hover:bg-muted/50 transition-colors group/row">
          <span className="w-11 shrink-0 pr-2 border-r border-border/50 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80 select-none">
            User
          </span>
          <button
            type="button"
            onClick={onCopyLogin}
            title={`${c.login_id} — click to copy`}
            className="flex-1 min-w-0 text-left text-[13px] font-medium text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 truncate cursor-pointer transition-colors"
          >
            {c.login_id}
          </button>
          <button
            type="button"
            onClick={onCopyLogin}
            title="Copy Login ID"
            aria-label="Copy Login ID"
            className={cn(
              "size-7 rounded-lg flex items-center justify-center press-scale transition-colors cursor-pointer shrink-0",
              copiedLogin
                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/15"
                : "text-muted-foreground/70 hover:text-foreground hover:bg-background/80",
            )}
          >
            {copiedLogin ? <Check className="size-3.5 animate-fade-in" /> : <Copy className="size-3.5" />}
          </button>
        </div>

        {/* Row 2: Password */}
        <div className="flex items-center gap-2.5 h-10 px-3.5 hover:bg-muted/50 transition-colors group/row">
          <span className="w-11 shrink-0 pr-2 border-r border-border/50 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80 select-none">
            Pass
          </span>
          <button
            type="button"
            onClick={onCopyPassword}
            title={revealed ? `${c.password} — click to copy` : "Click to copy password"}
            className={cn(
              "flex-1 min-w-0 text-left text-[13px] font-mono truncate cursor-pointer transition-colors",
              revealed
                ? "text-emerald-600 dark:text-emerald-400 font-semibold select-all"
                : "text-muted-foreground/75 tracking-[0.18em] hover:text-foreground",
            )}
          >
            {revealed ? c.password : "••••••••••••"}
          </button>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onToggleReveal}
              title={revealed ? "Hide password" : "Show password"}
              aria-label={revealed ? "Hide password" : "Show password"}
              className={cn(
                "size-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
                revealed
                  ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/15"
                  : "text-muted-foreground/70 hover:text-foreground hover:bg-background/80",
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
                "size-7 rounded-lg flex items-center justify-center press-scale transition-colors cursor-pointer",
                copiedPassword
                  ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/15"
                  : "text-muted-foreground/70 hover:text-foreground hover:bg-background/80",
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
