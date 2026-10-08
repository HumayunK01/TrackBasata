import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import type { QueryClient, DehydrateOptions } from "@tanstack/react-query";

export const PERSIST_CACHE_KEY = "BASATA_REACT_QUERY_OFFLINE_CACHE";

// ponytail: dehydrateOptions explicitly excludes "credentials" so decrypted vault
// passwords never hit localStorage, even temporarily.
export const dehydrateOptions: DehydrateOptions = {
  shouldDehydrateQuery: (query) => {
    if (query.state.status !== "success") return false;
    const firstKey = Array.isArray(query.queryKey) ? query.queryKey[0] : "";
    if (firstKey === "credentials") return false;
    return true;
  },
};

export function initQueryPersistence(queryClient: QueryClient) {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    const localStoragePersister = createSyncStoragePersister({
      storage: window.localStorage,
      key: PERSIST_CACHE_KEY,
      throttleTime: 1000,
    });

    persistQueryClient({
      queryClient,
      persister: localStoragePersister,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      buster: "v2.0",
      dehydrateOptions,
    });
  } catch (err) {
    // Non-fatal: if localStorage quota is exceeded or storage is disabled
    console.warn("Offline query cache persistence disabled:", err);
  }
}
