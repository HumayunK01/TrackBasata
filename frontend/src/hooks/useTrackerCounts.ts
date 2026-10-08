import { useQuery } from "@tanstack/react-query";
import { fetchAllFaxRows } from "@/hooks/useFaxTracker";
import { fetchAllIndexableRows } from "@/hooks/useIndexableTracker";
import { isResolved } from "@/hooks/useTracker";

export interface UnresolvedCounts {
  fax: number;
  indexable: number;
  total: number;
}

// RLS scopes both queries to the current user; the 5000-row cap is a safety net.
export function useUnresolvedCounts() {
  return useQuery<UnresolvedCounts>({
    queryKey: ["unresolved_counts"],
    staleTime: 60_000,
    queryFn: async () => {
      const [fax, indexable] = await Promise.all([fetchAllFaxRows(), fetchAllIndexableRows()]);
      const faxUn = fax.filter((r) => !isResolved(r)).length;
      const idxUn = indexable.filter((r) => !isResolved(r)).length;
      return { fax: faxUn, indexable: idxUn, total: faxUn + idxUn };
    },
  });
}
