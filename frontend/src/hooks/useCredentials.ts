import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase, getUserId } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useMutationRateLimit } from "@/hooks/useMutationRateLimit";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { encryptPassword, decryptCredentialRows } from "@/lib/credential-crypto";

export type CredentialFolder = Tables<"credential_folders">;
export type Credential = Tables<"credentials">;

const NameSchema = z.string().trim().min(1, "Name is required").max(100, "Name too long");
const CredentialSchema = z.object({
  service: z.string().trim().min(1, "Service is required").max(200, "Too long"),
  login_id: z.string().trim().min(1, "Login ID is required").max(500, "Too long"),
  password: z.string().min(1, "Password is required").max(2000, "Too long"),
  notes: z.string().max(5000, "Too long").optional().nullable(),
  website: z.string().max(2000, "Too long").optional().nullable(),
});

export function useCredentialFolders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["credential_folders", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<CredentialFolder[]> => {
      const { data, error } = await supabase
        .from("credential_folders")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 10, windowMs: 60_000 });
  return useMutation({
    mutationFn: async (name: string): Promise<CredentialFolder> => {
      if (!checkLimit()) throw new Error("Too many requests. Please wait a moment.");
      const validated = NameSchema.parse(name);
      const created_by = await getUserId();
      const { data, error } = await supabase
        .from("credential_folders")
        .insert({ name: validated, created_by })
        .select()
        .single();
      if (error) {
        if (error.code === "23505") throw new Error("You already have a folder with that name.");
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credential_folders"] });
      toast.success("Folder added");
    },
    onError: (e: Error) =>
      toast.error(e instanceof z.ZodError ? e.issues[0]?.message : e.message),
  });
}

export function useRenameFolder() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 10, windowMs: 60_000 });
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      if (!checkLimit()) throw new Error("Too many requests. Please wait a moment.");
      const validated = NameSchema.parse(name);
      const created_by = await getUserId();
      const { error } = await supabase
        .from("credential_folders")
        .update({ name: validated })
        .eq("id", id)
        .eq("created_by", created_by);
      if (error) {
        if (error.code === "23505") throw new Error("You already have a folder with that name.");
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credential_folders"] });
      toast.success("Folder renamed");
    },
    onError: (e: Error) =>
      toast.error(e instanceof z.ZodError ? e.issues[0]?.message : e.message),
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 5, windowMs: 60_000 });
  return useMutation({
    mutationFn: async (id: string) => {
      if (!checkLimit()) throw new Error("Too many requests. Please wait a moment.");
      const created_by = await getUserId();
      // ON DELETE CASCADE removes the folder's credentials too.
      const { error } = await supabase
        .from("credential_folders")
        .delete()
        .eq("id", id)
        .eq("created_by", created_by);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credential_folders"] });
      qc.invalidateQueries({ queryKey: ["credentials"] });
      toast.success("Folder deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCredentials(folderId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["credentials", user?.id, folderId],
    enabled: !!user && !!folderId,
    staleTime: 60_000,
    queryFn: async (): Promise<Credential[]> => {
      const { data, error } = await supabase
        .from("credentials")
        .select("*")
        .eq("folder_id", folderId)
        .order("service", { ascending: true });
      if (error) throw error;
      return decryptCredentialRows(data ?? []);
    },
  });
}

export function useAllCredentials(enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["credentials", user?.id, "all"],
    enabled: enabled && !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<Credential[]> => {
      const { data, error } = await supabase
        .from("credentials")
        .select("*")
        .order("service", { ascending: true });
      if (error) throw error;
      return decryptCredentialRows(data ?? []);
    },
  });
}

export function useUpsertCredential() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 20, windowMs: 60_000 });
  return useMutation({
    mutationFn: async (input: { row: Credential | null; folderId: string; values: { service: string; login_id: string; password: string; notes: string | null; website: string | null } }) => {
      if (!checkLimit()) throw new Error("Too many requests. Please wait a moment.");
      const validated = CredentialSchema.parse(input.values);
      const encryptedPassword = await encryptPassword(validated.password);
      const payload = {
        ...validated,
        password: encryptedPassword,
      };
      const created_by = await getUserId();
      if (input.row) {
        const { error } = await supabase
          .from("credentials")
          .update(payload)
          .eq("id", input.row.id)
          .eq("created_by", created_by);
        if (error) throw error;
      } else {
        const insert: TablesInsert<"credentials"> = {
          ...payload,
          folder_id: input.folderId,
          created_by,
        };
        const { error } = await supabase.from("credentials").insert(insert);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["credentials"] });
      toast.success(vars.row ? "Credential updated" : "Credential added");
    },
    onError: (e: Error) =>
      toast.error(e instanceof z.ZodError ? e.issues[0]?.message : e.message),
  });
}

export function useDeleteCredential() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 10, windowMs: 60_000 });
  return useMutation({
    mutationFn: async (row: Credential) => {
      if (!checkLimit()) throw new Error("Too many requests. Please wait a moment.");
      const created_by = await getUserId();
      const { error } = await supabase
        .from("credentials")
        .delete()
        .eq("id", row.id)
        .eq("created_by", created_by);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credentials"] });
      toast.success("Credential deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useMoveCredential() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 10, windowMs: 60_000 });
  return useMutation({
    mutationFn: async ({ id, folderId }: { id: string; folderId: string }) => {
      if (!checkLimit()) throw new Error("Too many requests. Please wait a moment.");
      const created_by = await getUserId();
      const { error } = await supabase
        .from("credentials")
        .update({ folder_id: folderId })
        .eq("id", id)
        .eq("created_by", created_by);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credentials"] });
      toast.success("Credential moved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useBulkDeleteCredentials() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 10, windowMs: 60_000 });
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      if (!checkLimit()) throw new Error("Too many requests. Please wait a moment.");
      const created_by = await getUserId();
      const { error } = await supabase
        .from("credentials")
        .delete()
        .in("id", ids)
        .eq("created_by", created_by);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credentials"] });
      toast.success("Credentials deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useBulkMoveCredentials() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 10, windowMs: 60_000 });
  return useMutation({
    mutationFn: async ({ ids, folderId }: { ids: string[]; folderId: string }) => {
      if (ids.length === 0) return;
      if (!checkLimit()) throw new Error("Too many requests. Please wait a moment.");
      const created_by = await getUserId();
      const { error } = await supabase
        .from("credentials")
        .update({ folder_id: folderId })
        .in("id", ids)
        .eq("created_by", created_by);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credentials"] });
      toast.success("Credentials moved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
