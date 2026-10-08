import { StepEntryDialog } from "@/components/ar/tracker/StepEntryDialog";
import { useUpsertIndexable, type IndexableRow } from "@/hooks/useIndexableTracker";

interface IndexableEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this row; otherwise it creates a new one. */
  row?: IndexableRow | null;
  /** Account the new row is added to (ignored when editing). */
  accountId?: string;
}

export function IndexableEntryDialog({ open, onOpenChange, row, accountId }: IndexableEntryDialogProps) {
  const upsert = useUpsertIndexable();
  return (
    <StepEntryDialog
      open={open}
      onOpenChange={onOpenChange}
      row={row}
      accountId={accountId}
      upsert={upsert}
      step3Label="Step 3: Reupload Indexable"
      idPrefix="indexable"
    />
  );
}
