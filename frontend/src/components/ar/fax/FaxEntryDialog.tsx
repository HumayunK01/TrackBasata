import { StepEntryDialog } from "@/components/ar/tracker/StepEntryDialog";
import { useUpsertFax, type FaxRow } from "@/hooks/useFaxTracker";

interface FaxEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this row; otherwise it creates a new one. */
  row?: FaxRow | null;
  /** Account the new row is added to (ignored when editing). */
  accountId?: string;
}

export function FaxEntryDialog({ open, onOpenChange, row, accountId }: FaxEntryDialogProps) {
  const upsert = useUpsertFax();
  return (
    <StepEntryDialog
      open={open}
      onOpenChange={onOpenChange}
      row={row}
      accountId={accountId}
      upsert={upsert}
      step3Label="Step 3: Reupload ROI"
      idPrefix="fax"
    />
  );
}
