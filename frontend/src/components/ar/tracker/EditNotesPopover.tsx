import React, { useEffect, useRef, useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Loader2 } from "@/components/ui/icons";
import type { TrackerRow } from "@/hooks/useTracker";

interface EditNotesPopoverProps {
  row: TrackerRow;
  onSave: (id: string, notes: string | null) => void;
  isPending?: boolean;
  children: React.ReactNode;
}

export function EditNotesPopover({
  row,
  onSave,
  isPending = false,
  children,
}: EditNotesPopoverProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(row.notes ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setText(row.notes ?? "");
    }
  }, [open, row.notes]);

  const handleOpenAutoFocus = (e: Event) => {
    e.preventDefault();
    if (textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setText(row.notes ?? "");
    }
    setOpen(nextOpen);
  };

  const handleSave = () => {
    const trimmed = text.trim();
    onSave(row.id, trimmed === "" ? null : trimmed);
    setOpen(false);
  };

  const handleCancel = () => {
    setText(row.notes ?? "");
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={true}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      {open && (
        <PopoverPrimitive.Portal>
          <div
            className="fixed inset-0 bg-black/50 z-40 pointer-events-auto"
            aria-hidden="true"
            onClick={handleCancel}
          />
        </PopoverPrimitive.Portal>
      )}
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        onOpenAutoFocus={handleOpenAutoFocus}
        onClick={(e) => e.stopPropagation()}
        className="w-[320px] sm:w-[340px] p-2.5 bg-popover border border-border/80 dark:border-white/10 shadow-2xl rounded-xl z-50 text-popover-foreground popover-spring-in"
      >
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            maxLength={1000}
            placeholder="Add transmission notes..."
            className="w-full min-h-[75px] max-h-[220px] rounded-lg bg-background border border-primary focus:border-primary focus:ring-1 focus:ring-primary/50 text-xs sm:text-[13px] text-foreground p-2.5 outline-none resize-y font-normal transition-colors placeholder:text-muted-foreground/40 leading-relaxed"
          />
          <div className="flex items-center justify-end gap-2 pt-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-7 px-3 text-xs font-medium rounded-md bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors cursor-pointer border border-border/50 shadow-none"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={handleSave}
              className="h-7 px-3.5 text-xs font-semibold rounded-md bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs shadow-primary/20 transition-colors cursor-pointer border-0"
            >
              {isPending && <Loader2 className="size-3 mr-1 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
