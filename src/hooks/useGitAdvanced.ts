// ==========================================
// hooks/useGitAdvanced.ts — P3 React Query hooks
// ==========================================
// Remote management, push/pull/fetch, merge/rebase,
// history/reversal, stash, clone, conflict resolution,
// branch protection.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bridgeApi } from "@/services/bridgeApi";
import { isBridgeReady } from "@/services/bridgeClient";
import { gitKeys } from "@/hooks/useGitQueries";
import type {
    GitRemoteInfo,
    GitStashEntry,
    GitBlameEntry,
    GitMergeState,
    GitPushPullResult,
} from "@/types/git";

// ─── Query keys ──────────────────────────────────────────────

export const gitAdvancedKeys = {
    remotes: (dir: string) => ["git", "remotes", dir] as const,
    stashList: (dir: string) => ["git", "stashList", dir] as const,
    mergeState: (dir: string) => ["git", "mergeState", dir] as const,
    blame: (dir: string, file: string) => ["git", "blame", dir, file] as const,
    isProtected: (dir: string, branch: string) => ["git", "isProtected", dir, branch] as const,
    protectedBranches: (dir: string) => ["git", "protectedBranches", dir] as const,
};

const STALE = {
    remotes: 120_000,     // 2 min — rarely changes
    stashList: 30_000,    // 30s
    mergeState: 5_000,    // 5s — need to know fast
    blame: 300_000,       // 5 min — file doesn't change often while viewing
    protection: 300_000,  // 5 min
};

// ─── Helpers ─────────────────────────────────────────────────

function useBridgeEnabled() {
    const qc = useQueryClient();
    return qc.getQueryData<boolean>(["bridge-ready"]) ?? isBridgeReady();
}

function useInvalidateAll(dir: string | null | undefined) {
    const queryClient = useQueryClient();
    return () => {
        if (!dir) return;
        queryClient.invalidateQueries({ queryKey: gitKeys.all });
        queryClient.invalidateQueries({ queryKey: gitAdvancedKeys.remotes(dir) });
        queryClient.invalidateQueries({ queryKey: gitAdvancedKeys.stashList(dir) });
        queryClient.invalidateQueries({ queryKey: gitAdvancedKeys.mergeState(dir) });
    };
}

// ==========================================
// REMOTE QUERIES & MUTATIONS
// ==========================================

export function useGitRemotes(dir: string | null | undefined) {
    const ready = useBridgeEnabled();
    return useQuery<GitRemoteInfo[]>({
        queryKey: gitAdvancedKeys.remotes(dir ?? ""),
        queryFn: () => bridgeApi.gitRemoteList(dir!),
        enabled: !!dir && ready,
        staleTime: STALE.remotes,
    });
}

export function useGitRemoteAdd(dir: string | null | undefined) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ name, url }: { name: string; url: string }) =>
            bridgeApi.gitRemoteAdd(dir!, name, url),
        onSuccess: () => {
            if (dir) qc.invalidateQueries({ queryKey: gitAdvancedKeys.remotes(dir) });
        },
    });
}

export function useGitRemoteRemove(dir: string | null | undefined) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (name: string) => bridgeApi.gitRemoteRemove(dir!, name),
        onSuccess: () => {
            if (dir) qc.invalidateQueries({ queryKey: gitAdvancedKeys.remotes(dir) });
        },
    });
}

export function useGitRemoteSetUrl(dir: string | null | undefined) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ name, url }: { name: string; url: string }) =>
            bridgeApi.gitRemoteSetUrl(dir!, name, url),
        onSuccess: () => {
            if (dir) qc.invalidateQueries({ queryKey: gitAdvancedKeys.remotes(dir) });
        },
    });
}

// ==========================================
// PUSH / PULL / FETCH
// ==========================================

export function useGitPush(dir: string | null | undefined) {
    const invalidate = useInvalidateAll(dir);
    return useMutation<GitPushPullResult, Error, {
        remote?: string;
        branch?: string;
        force?: boolean;
        setUpstream?: boolean;
    } | void>({
        mutationFn: (opts) =>
            bridgeApi.gitPush(
                dir!,
                opts?.remote,
                opts?.branch,
                { force: opts?.force, setUpstream: opts?.setUpstream }
            ),
        onSuccess: invalidate,
    });
}

export function useGitPull(dir: string | null | undefined) {
    const invalidate = useInvalidateAll(dir);
    return useMutation<GitPushPullResult, Error, {
        remote?: string;
        branch?: string;
        rebase?: boolean;
    } | void>({
        mutationFn: (opts) =>
            bridgeApi.gitPull(
                dir!,
                opts?.remote,
                opts?.branch,
                { rebase: opts?.rebase }
            ),
        onSuccess: invalidate,
    });
}

export function useGitFetch(dir: string | null | undefined) {
    const invalidate = useInvalidateAll(dir);
    return useMutation<GitPushPullResult, Error, {
        remote?: string;
        prune?: boolean;
        all?: boolean;
    } | void>({
        mutationFn: (opts) =>
            bridgeApi.gitFetch(dir!, opts?.remote, { prune: opts?.prune, all: opts?.all }),
        onSuccess: invalidate,
    });
}

// ==========================================
// MERGE & REBASE
// ==========================================

export function useGitMerge(dir: string | null | undefined) {
    const invalidate = useInvalidateAll(dir);
    return useMutation<GitPushPullResult, Error, {
        branch: string;
        noFF?: boolean;
        squash?: boolean;
        message?: string;
    }>({
        mutationFn: (opts) =>
            bridgeApi.gitMerge(dir!, opts.branch, {
                noFF: opts.noFF,
                squash: opts.squash,
                message: opts.message,
            }),
        onSuccess: invalidate,
    });
}

export function useGitAbortMerge(dir: string | null | undefined) {
    const invalidate = useInvalidateAll(dir);
    return useMutation({
        mutationFn: () => bridgeApi.gitAbortMerge(dir!),
        onSuccess: invalidate,
    });
}

export function useGitRebase(dir: string | null | undefined) {
    const invalidate = useInvalidateAll(dir);
    return useMutation<GitPushPullResult, Error, string>({
        mutationFn: (onto: string) => bridgeApi.gitRebase(dir!, onto),
        onSuccess: invalidate,
    });
}

export function useGitAbortRebase(dir: string | null | undefined) {
    const invalidate = useInvalidateAll(dir);
    return useMutation({
        mutationFn: () => bridgeApi.gitAbortRebase(dir!),
        onSuccess: invalidate,
    });
}

export function useGitContinueRebase(dir: string | null | undefined) {
    const invalidate = useInvalidateAll(dir);
    return useMutation({
        mutationFn: () => bridgeApi.gitContinueRebase(dir!),
        onSuccess: invalidate,
    });
}

export function useGitMergeState(dir: string | null | undefined) {
    const ready = useBridgeEnabled();
    return useQuery<GitMergeState>({
        queryKey: gitAdvancedKeys.mergeState(dir ?? ""),
        queryFn: () => bridgeApi.gitMergeState(dir!),
        enabled: !!dir && ready,
        staleTime: STALE.mergeState,
        refetchInterval: 10_000,
        refetchIntervalInBackground: false,
    });
}

export function useGitMarkResolved(dir: string | null | undefined) {
    const invalidate = useInvalidateAll(dir);
    return useMutation({
        mutationFn: (files: string[]) => bridgeApi.gitMarkResolved(dir!, files),
        onSuccess: invalidate,
    });
}

// ==========================================
// HISTORY & REVERSAL
// ==========================================

export function useGitRevert(dir: string | null | undefined) {
    const invalidate = useInvalidateAll(dir);
    return useMutation<GitPushPullResult, Error, { hash: string; noCommit?: boolean }>({
        mutationFn: (opts) => bridgeApi.gitRevert(dir!, opts.hash, opts.noCommit),
        onSuccess: invalidate,
    });
}

export function useGitCherryPick(dir: string | null | undefined) {
    const invalidate = useInvalidateAll(dir);
    return useMutation<GitPushPullResult, Error, { hash: string; noCommit?: boolean }>({
        mutationFn: (opts) => bridgeApi.gitCherryPick(dir!, opts.hash, opts.noCommit),
        onSuccess: invalidate,
    });
}

export function useGitBlame(dir: string | null | undefined, file: string | null | undefined) {
    const ready = useBridgeEnabled();
    return useQuery<GitBlameEntry[]>({
        queryKey: gitAdvancedKeys.blame(dir ?? "", file ?? ""),
        queryFn: () => bridgeApi.gitBlame(dir!, file!),
        enabled: !!dir && !!file && ready,
        staleTime: STALE.blame,
    });
}

// ==========================================
// STASH MANAGEMENT
// ==========================================

export function useGitStashList(dir: string | null | undefined) {
    const ready = useBridgeEnabled();
    return useQuery<GitStashEntry[]>({
        queryKey: gitAdvancedKeys.stashList(dir ?? ""),
        queryFn: () => bridgeApi.gitStashList(dir!),
        enabled: !!dir && ready,
        staleTime: STALE.stashList,
    });
}

export function useGitStashApply(dir: string | null | undefined) {
    const invalidate = useInvalidateAll(dir);
    return useMutation({
        mutationFn: (index: number) => bridgeApi.gitStashApply(dir!, index),
        onSuccess: invalidate,
    });
}

export function useGitStashDrop(dir: string | null | undefined) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (index: number) => bridgeApi.gitStashDrop(dir!, index),
        onSuccess: () => {
            if (dir) qc.invalidateQueries({ queryKey: gitAdvancedKeys.stashList(dir) });
        },
    });
}

export function useGitStashClear(dir: string | null | undefined) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => bridgeApi.gitStashClear(dir!),
        onSuccess: () => {
            if (dir) qc.invalidateQueries({ queryKey: gitAdvancedKeys.stashList(dir) });
        },
    });
}

// ==========================================
// BRANCH PROTECTION
// ==========================================

export function useGitIsProtected(dir: string | null | undefined, branch: string | null | undefined) {
    const ready = useBridgeEnabled();
    return useQuery<{ isProtected: boolean; patterns: string[] }>({
        queryKey: gitAdvancedKeys.isProtected(dir ?? "", branch ?? ""),
        queryFn: () => bridgeApi.gitIsProtected(dir!, branch!),
        enabled: !!dir && !!branch && ready,
        staleTime: STALE.protection,
    });
}

export function useGitDeleteBranch(dir: string | null | undefined) {
    const invalidate = useInvalidateAll(dir);
    return useMutation({
        mutationFn: ({ name, force }: { name: string; force?: boolean }) =>
            bridgeApi.gitDeleteBranch(dir!, name, force),
        onSuccess: invalidate,
    });
}

export function useGitRenameBranch(dir: string | null | undefined) {
    const invalidate = useInvalidateAll(dir);
    return useMutation({
        mutationFn: (newName: string) => bridgeApi.gitRenameBranch(dir!, newName),
        onSuccess: invalidate,
    });
}
