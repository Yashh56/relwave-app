import { useQuery } from "@tanstack/react-query";
import { bridgeApi } from "@/services/bridgeApi";
import type { SchemaDiffResponse, SchemaFileHistoryResponse } from "@/types/schemaDiff";

// ─── Query Keys ──────────────────────────────────────────────
export const schemaDiffKeys = {
    all: ["schemaDiff"] as const,
    diff: (projectId: string, fromRef?: string, toRef?: string) =>
        [...schemaDiffKeys.all, "diff", projectId, fromRef ?? "HEAD", toRef ?? "working"] as const,
    history: (projectId: string) =>
        [...schemaDiffKeys.all, "history", projectId] as const,
};

// ─── Hooks ───────────────────────────────────────────────────

/**
 * Fetch a structural schema diff between two git refs.
 * Defaults to HEAD → working tree.
 */
export function useSchemaDiff(
    projectId: string | undefined,
    fromRef = "HEAD",
    toRef?: string,
    enabled = true,
) {
    return useQuery<SchemaDiffResponse>({
        queryKey: schemaDiffKeys.diff(projectId ?? "", fromRef, toRef),
        queryFn: () => bridgeApi.schemaDiff(projectId!, fromRef, toRef),
        enabled: !!projectId && enabled,
        staleTime: 30_000,      // re-fetch after 30 s
        refetchInterval: 60_000, // auto-poll every 60 s
    });
}

/**
 * Fetch the commit history for the project's schema.json file.
 */
export function useSchemaFileHistory(
    projectId: string | undefined,
    count = 20,
    enabled = true,
) {
    return useQuery<SchemaFileHistoryResponse>({
        queryKey: schemaDiffKeys.history(projectId ?? ""),
        queryFn: () => bridgeApi.schemaFileHistory(projectId!, count),
        enabled: !!projectId && enabled,
        staleTime: 60_000,
    });
}
