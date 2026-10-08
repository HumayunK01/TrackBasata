import { Check, Copy, Eye, EyeOff, FolderInput, MoreVertical, Pencil, Trash2 } from "@/components/ui/icons";
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
  selected,
  revealed,
  copiedLogin,
  copiedPassword,
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

  return (
    <div
      className={cn(
        "group relative rounded-2xl border bg-card/60 backdrop-blur-md p-4 shadow-2xs transition-all duration-200 hover:shadow-md hover:border-border/80 flex flex-col justify-between gap-3",
        selected
          ? "border-emerald-500/50 bg-emerald-500/[0.05] ring-1 ring-emerald-500/25"
          : "border-border/60",
      )}
    >
      {/* Header with Checkbox, Logo, Name, and Actions */}
      <div className="flex items-start gap-3">
        <div className="pt-0.5 shrink-0">
          <SelectCheckbox
            ariaLabel={`Select ${c.service}`}
            checked={selected}
            onChange={onToggleSelect}
          />
        </div>

        <div className="size-10 rounded-xl bg-muted/40 border border-border/50 p-1 flex items-center justify-center shrink-0 shadow-2xs">
          <ServiceLogo service={c.service} website={c.website} className="size-7 rounded-lg" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground text-sm truncate leading-tight" title={c.service}>
            {c.service}
          </h3>
          {website ? (
            <a
              href={website.startsWith("http") ? website : `https://${website}`}
              target="_blank"
              rel="noreferrer noopener"
              className="text-xs text-muted-foreground hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors truncate block mt-0.5"
              title={website}
            >
              {website.replace(/^https?:\/\//, "")}
            </a>
          ) : (
            <p className="text-2xs font-mono uppercase tracking-wider text-muted-foreground/60 mt-0.5">
              Secret
            </p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 shrink-0"
            >
              <MoreVertical className="size-4" />
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

      {/* Secret Wells */}
      <div className="space-y-2">
        <Field
          label="Login ID"
          value={c.login_id}
          copied={copiedLogin}
          onCopy={onCopyLogin}
        />

        <Field
          label="Password"
          value={revealed ? c.password : "••••••••••••"}
          mono
          reveal={revealed}
          onReveal={onToggleReveal}
          copied={copiedPassword}
          onCopy={onCopyPassword}
        />
      </div>

      {/* Notes block */}
      {c.notes && (
        <div className="px-3 py-2 rounded-xl bg-muted/20 border border-border/30 text-xs text-muted-foreground/80 leading-relaxed break-words">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/50 block mb-0.5">
            Notes
          </span>
          {c.notes}
        </div>
      )}
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  mono?: boolean;
  reveal?: boolean;
  copied: boolean;
  onCopy: () => void;
  onReveal?: () => void;
}

function Field({ label, value, mono, reveal, copied, onCopy, onReveal }: FieldProps) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground/60 leading-none mb-1">
          {label}
        </p>
        <p
          className={cn(
            "text-xs truncate select-all leading-tight",
            mono ? "font-mono text-foreground/90 font-medium" : "text-foreground/90 font-medium",
          )}
          title={value}
        >
          {value}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {reveal !== undefined && (
          <button
            type="button"
            onClick={onReveal}
            title={reveal ? "Hide password" : "Show password"}
            aria-label={reveal ? "Hide password" : "Show password"}
            className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
          >
            {reveal ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
        )}
        <button
          type="button"
          onClick={onCopy}
          title={`Copy ${label}`}
          aria-label={`Copy ${label}`}
          className={cn(
            "size-7 rounded-lg flex items-center justify-center press-scale transition-colors cursor-pointer",
            copied
              ? "text-emerald-500 bg-emerald-500/10"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
          )}
        >
          {copied ? <Check className="size-3.5 animate-fade-in" /> : <Copy className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}
