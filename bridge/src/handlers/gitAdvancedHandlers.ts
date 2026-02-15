// ----------------------------
// handlers/gitAdvancedHandlers.ts
// ----------------------------
//
// P3 RPC handlers: Remote management, push/pull/fetch,
// merge/rebase, history/reversal, stash management,
// clone, conflict resolution, branch protection.

import { Rpc } from "../types";
import { GitService, gitServiceInstance } from "../services/gitService";
import { Logger } from "pino";

/**
 * Handles advanced git operations:
 *
 *  Remote:       git.remoteList, git.remoteAdd, git.remoteRemove, git.remoteGetUrl, git.remoteSetUrl
 *  Push/Pull:    git.push, git.pull, git.fetch
 *  Merge/Rebase: git.merge, git.abortMerge, git.rebase, git.abortRebase, git.continueRebase
 *  History:      git.revert, git.cherryPick, git.blame, git.show
 *  Stash:        git.stashList, git.stashApply, git.stashDrop, git.stashClear
 *  Clone:        git.clone
 *  Conflict:     git.mergeState, git.markResolved
 *  Protection:   git.isProtected, git.protectedBranches
 *  Branch Mgmt:  git.deleteBranch, git.renameBranch
 */
export class GitAdvancedHandlers {
    constructor(
        private rpc: Rpc,
        private logger?: Logger,
        private gitService: GitService = gitServiceInstance
    ) { }

    // ---- Helpers ----

    private requireDir(params: any, id: number | string): string | null {
        const dir = params?.dir || params?.path || params?.cwd;
        if (!dir) {
            this.rpc.sendError(id, {
                code: "BAD_REQUEST",
                message: "Missing 'dir' parameter (project directory path)",
            });
            return null;
        }
        return dir;
    }

    // ==========================================
    // REMOTE MANAGEMENT
    // ==========================================

    async handleRemoteList(params: any, id: number | string) {
        const dir = this.requireDir(params, id);
        if (!dir) return;
        try {
            const remotes = await this.gitService.remoteList(dir);
            this.rpc.sendResponse(id, { ok: true, data: remotes });
        } catch (e: any) {
            this.logger?.error({ e }, "git.remoteList failed");
            this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
        }
    }

    async handleRemoteAdd(params: any, id: number | string) {
        const dir = this.requireDir(params, id);
        if (!dir) return;
        try {
            const name = params?.name;
            const url = params?.url;
            if (!name || !url) {
                return this.rpc.sendError(id, {
                    code: "BAD_REQUEST",
                    message: "Missing 'name' and/or 'url' parameters",
                });
            }
            await this.gitService.remoteAdd(dir, name, url);
            this.rpc.sendResponse(id, { ok: true, data: null });
        } catch (e: any) {
            this.logger?.error({ e }, "git.remoteAdd failed");
            this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
        }
    }

    async handleRemoteRemove(params: any, id: number | string) {
        const dir = this.requireDir(params, id);
        if (!dir) return;
        try {
            const name = params?.name;
            if (!name) {
                return this.rpc.sendError(id, {
                    code: "BAD_REQUEST",
                    message: "Missing 'name' parameter",
                });
            }
            await this.gitService.remoteRemove(dir, name);
            this.rpc.sendResponse(id, { ok: true, data: null });
        } catch (e: any) {
            this.logger?.error({ e }, "git.remoteRemove failed");
            this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
        }
    }

    async handleRemoteGetUrl(params: any, id: number | string) {
        const dir = this.requireDir(params, id);
        if (!dir) return;
        try {
            const url = await this.gitService.remoteGetUrl(dir, params?.name || "origin");
            this.rpc.sendResponse(id, { ok: true, data: { url } });
        } catch (e: any) {
            this.logger?.error({ e }, "git.remoteGetUrl failed");
            this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
        }
    }

    async handleRemoteSetUrl(params: any, id: number | string) {
        const dir = this.requireDir(params, id);
        if (!dir) return;
        try {
            const name = params?.name;
            const url = params?.url;
            if (!name || !url) {
                return this.rpc.sendError(id, {
                    code: "BAD_REQUEST",
                    message: "Missing 'name' and/or 'url' parameters",
                });
            }
            await this.gitService.remoteSetUrl(dir, name, url);
            this.rpc.sendResponse(id, { ok: true, data: null });
        } catch (e: any) {
            this.logger?.error({ e }, "git.remoteSetUrl failed");
            this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
        }
    }

    // ==========================================
    // PUSH / PULL / FETCH
    // ==========================================

    async handlePush(params: any, id: number | string) {
        const dir = this.requireDir(params, id);
        if (!dir) return;
        try {
            // Production branch protection check
            const status = await this.gitService.getStatus(dir);
            if (status.branch && params?.force && this.gitService.isProtectedBranch(dir, status.branch)) {
                return this.rpc.sendError(id, {
                    code: "PROTECTED_BRANCH",
                    message: `Force-push to protected branch '${status.branch}' is not allowed`,
                });
            }
            const output = await this.gitService.push(
                dir,
                params?.remote || "origin",
                params?.branch,
                {
                    force: params?.force === true,
                    setUpstream: params?.setUpstream === true,
                }
            );
            this.rpc.sendResponse(id, { ok: true, data: { output } });
        } catch (e: any) {
            this.logger?.error({ e }, "git.push failed");
            this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
        }
    }

    async handlePull(params: any, id: number | string) {
        const dir = this.requireDir(params, id);
        if (!dir) return;
        try {
            const output = await this.gitService.pull(
                dir,
                params?.remote || "origin",
                params?.branch,
                { rebase: params?.rebase === true }
            );
            this.rpc.sendResponse(id, { ok: true, data: { output } });
        } catch (e: any) {
            this.logger?.error({ e }, "git.pull failed");
            this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
        }
    }

    async handleFetch(params: any, id: number | string) {
        const dir = this.requireDir(params, id);
        if (!dir) return;
        try {
            const output = await this.gitService.fetch(
                dir,
                params?.remote,
                {
                    prune: params?.prune === true,
                    all: params?.all === true,
                }
            );
            this.rpc.sendResponse(id, { ok: true, data: { output } });
        } catch (e: any) {
            this.logger?.error({ e }, "git.fetch failed");
            this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
        }
    }

    // ==========================================
    // MERGE & REBASE
    // ==========================================

    async handleMerge(params: any, id: number | string) {
        const dir = this.requireDir(params, id);
        if (!dir) return;
        try {
            const branch = params?.branch;
            if (!branch) {
                return this.rpc.sendError(id, {
                    code: "BAD_REQUEST",
                    message: "Missing 'branch' parameter",
                });
            }
            const output = await this.gitService.merge(dir, branch, {
                noFF: params?.noFF === true,
                squash: params?.squash === true,
                message: params?.message,
            });
            this.rpc.sendResponse(id, { ok: true, data: { output } });
        } catch (e: any) {
            // Check if this is a merge conflict
            const mergeState = await this.gitService.getMergeState(dir);
            if (mergeState.mergeInProgress) {
                this.rpc.sendError(id, {
                    code: "MERGE_CONFLICT",
                    message: String(e.message || e),
                    details: { conflictedFiles: mergeState.conflictedFiles },
                });
            } else {
                this.logger?.error({ e }, "git.merge failed");
                this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
            }
        }
    }

    async handleAbortMerge(params: any, id: number | string) {
        const dir = this.requireDir(params, id);
        if (!dir) return;
        try {
            await this.gitService.abortMerge(dir);
            this.rpc.sendResponse(id, { ok: true, data: null });
        } catch (e: any) {
            this.logger?.error({ e }, "git.abortMerge failed");
            this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
        }
    }

    async handleRebase(params: any, id: number | string) {
        const dir = this.requireDir(params, id);
        if (!dir) return;
        try {
            const onto = params?.onto;
            if (!onto) {
                return this.rpc.sendError(id, {
                    code: "BAD_REQUEST",
                    message: "Missing 'onto' parameter",
                });
            }
            const output = await this.gitService.rebase(dir, onto);
            this.rpc.sendResponse(id, { ok: true, data: { output } });
        } catch (e: any) {
            const mergeState = await this.gitService.getMergeState(dir);
            if (mergeState.rebaseInProgress) {
                this.rpc.sendError(id, {
                    code: "REBASE_CONFLICT",
                    message: String(e.message || e),
                    details: { conflictedFiles: mergeState.conflictedFiles },
                });
            } else {
                this.logger?.error({ e }, "git.rebase failed");
                this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
            }
        }
    }

    async handleAbortRebase(params: any, id: number | string) {
        const dir = this.requireDir(params, id);
        if (!dir) return;
        try {
            await this.gitService.abortRebase(dir);
            this.rpc.sendResponse(id, { ok: true, data: null });
        } catch (e: any) {
            this.logger?.error({ e }, "git.abortRebase failed");
            this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
        }
    }

    async handleContinueRebase(params: any, id: number | string) {
        const dir = this.requireDir(params, id);
        if (!dir) return;
        try {
            const output = await this.gitService.continueRebase(dir);
            this.rpc.sendResponse(id, { ok: true, data: { output } });
        } catch (e: any) {
            this.logger?.error({ e }, "git.continueRebase failed");
            this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
        }
    }

    // ==========================================
    // HISTORY & REVERSAL
    // ==========================================

    async handleRevert(params: any, id: number | string) {
        const dir = this.requireDir(params, id);
        if (!dir) return;
        try {
            const hash = params?.hash || params?.commitHash;
            if (!hash) {
                return this.rpc.sendError(id, {
                    code: "BAD_REQUEST",
                    message: "Missing 'hash' parameter",
                });
            }
            const output = await this.gitService.revert(dir, hash, {
                noCommit: params?.noCommit === true,
            });
            this.rpc.sendResponse(id, { ok: true, data: { output } });
        } catch (e: any) {
            this.logger?.error({ e }, "git.revert failed");
            this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
        }
    }

    async handleCherryPick(params: any, id: number | string) {
        const dir = this.requireDir(params, id);
        if (!dir) return;
        try {
            const hash = params?.hash || params?.commitHash;
            if (!hash) {
                return this.rpc.sendError(id, {
                    code: "BAD_REQUEST",
                    message: "Missing 'hash' parameter",
                });
            }
            const output = await this.gitService.cherryPick(dir, hash, {
                noCommit: params?.noCommit === true,
            });
            this.rpc.sendResponse(id, { ok: true, data: { output } });
        } catch (e: any) {
            this.logger?.error({ e }, "git.cherryPick failed");
            this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
        }
    }

    async handleBlame(params: any, id: number | string) {
        const dir = this.requireDir(params, id);
        if (!dir) return;
        try {
            const file = params?.file || params?.filePath;
            if (!file) {
                return this.rpc.sendError(id, {
                    code: "BAD_REQUEST",
                    message: "Missing 'file' parameter",
                });
            }
            const entries = await this.gitService.blame(dir, file);
            this.rpc.sendResponse(id, { ok: true, data: entries });
        } catch (e: any) {
            this.logger?.error({ e }, "git.blame failed");
            this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
        }
    }

    async handleShow(params: any, id: number | string) {
        const dir = this.requireDir(params, id);
        if (!dir) return;
        try {
            const ref = params?.ref || "HEAD";
            const file = params?.file || params?.filePath;
            if (!file) {
                return this.rpc.sendError(id, {
                    code: "BAD_REQUEST",
                    message: "Missing 'file' parameter",
                });
            }
            const content = await this.gitService.show(dir, ref, file);
            this.rpc.sendResponse(id, { ok: true, data: { content } });
        } catch (e: any) {
            this.logger?.error({ e }, "git.show failed");
            this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
        }
    }

    // ==========================================
    // STASH MANAGEMENT
    // ==========================================

    async handleStashList(params: any, id: number | string) {
        const dir = this.requireDir(params, id);
        if (!dir) return;
        try {
            const stashes = await this.gitService.stashList(dir);
            this.rpc.sendResponse(id, { ok: true, data: stashes });
        } catch (e: any) {
            this.logger?.error({ e }, "git.stashList failed");
            this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
        }
    }

    async handleStashApply(params: any, id: number | string) {
        const dir = this.requireDir(params, id);
        if (!dir) return;
        try {
            await this.gitService.stashApply(dir, params?.index ?? 0);
            this.rpc.sendResponse(id, { ok: true, data: null });
        } catch (e: any) {
            this.logger?.error({ e }, "git.stashApply failed");
            this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
        }
    }

    async handleStashDrop(params: any, id: number | string) {
        const dir = this.requireDir(params, id);
        if (!dir) return;
        try {
            await this.gitService.stashDrop(dir, params?.index ?? 0);
            this.rpc.sendResponse(id, { ok: true, data: null });
        } catch (e: any) {
            this.logger?.error({ e }, "git.stashDrop failed");
            this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
        }
    }

    async handleStashClear(params: any, id: number | string) {
        const dir = this.requireDir(params, id);
        if (!dir) return;
        try {
            await this.gitService.stashClear(dir);
            this.rpc.sendResponse(id, { ok: true, data: null });
        } catch (e: any) {
            this.logger?.error({ e }, "git.stashClear failed");
            this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
        }
    }

    // ==========================================
    // CLONE
    // ==========================================

    async handleClone(params: any, id: number | string) {
        try {
            const url = params?.url;
            const dest = params?.dest;
            if (!url || !dest) {
                return this.rpc.sendError(id, {
                    code: "BAD_REQUEST",
                    message: "Missing 'url' and/or 'dest' parameters",
                });
            }
            const result = await this.gitService.clone(url, dest, params?.branch);
            this.rpc.sendResponse(id, { ok: true, data: { path: result } });
        } catch (e: any) {
            this.logger?.error({ e }, "git.clone failed");
            this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
        }
    }

    // ==========================================
    // CONFLICT RESOLUTION
    // ==========================================

    async handleMergeState(params: any, id: number | string) {
        const dir = this.requireDir(params, id);
        if (!dir) return;
        try {
            const state = await this.gitService.getMergeState(dir);
            this.rpc.sendResponse(id, { ok: true, data: state });
        } catch (e: any) {
            this.logger?.error({ e }, "git.mergeState failed");
            this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
        }
    }

    async handleMarkResolved(params: any, id: number | string) {
        const dir = this.requireDir(params, id);
        if (!dir) return;
        try {
            const files: string[] = params?.files;
            if (!files?.length) {
                return this.rpc.sendError(id, {
                    code: "BAD_REQUEST",
                    message: "Missing 'files' array",
                });
            }
            await this.gitService.markResolved(dir, files);
            this.rpc.sendResponse(id, { ok: true, data: null });
        } catch (e: any) {
            this.logger?.error({ e }, "git.markResolved failed");
            this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
        }
    }

    // ==========================================
    // PROTECTION & BRANCH MANAGEMENT
    // ==========================================

    async handleIsProtected(params: any, id: number | string) {
        const dir = this.requireDir(params, id);
        if (!dir) return;
        try {
            const branch = params?.branch;
            if (!branch) {
                return this.rpc.sendError(id, {
                    code: "BAD_REQUEST",
                    message: "Missing 'branch' parameter",
                });
            }
            const isProtected = this.gitService.isProtectedBranch(dir, branch);
            const patterns = this.gitService.getProtectedBranches(dir);
            this.rpc.sendResponse(id, { ok: true, data: { isProtected, patterns } });
        } catch (e: any) {
            this.logger?.error({ e }, "git.isProtected failed");
            this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
        }
    }

    async handleProtectedBranches(params: any, id: number | string) {
        const dir = this.requireDir(params, id);
        if (!dir) return;
        try {
            const patterns = this.gitService.getProtectedBranches(dir);
            this.rpc.sendResponse(id, { ok: true, data: { patterns } });
        } catch (e: any) {
            this.logger?.error({ e }, "git.protectedBranches failed");
            this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
        }
    }

    async handleDeleteBranch(params: any, id: number | string) {
        const dir = this.requireDir(params, id);
        if (!dir) return;
        try {
            const name = params?.name;
            if (!name) {
                return this.rpc.sendError(id, {
                    code: "BAD_REQUEST",
                    message: "Missing 'name' parameter",
                });
            }
            // Protect production branches
            if (this.gitService.isProtectedBranch(dir, name) && !params?.force) {
                return this.rpc.sendError(id, {
                    code: "PROTECTED_BRANCH",
                    message: `Branch '${name}' is protected. Use force=true to override.`,
                });
            }
            await this.gitService.deleteBranch(dir, name, params?.force === true);
            this.rpc.sendResponse(id, { ok: true, data: null });
        } catch (e: any) {
            this.logger?.error({ e }, "git.deleteBranch failed");
            this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
        }
    }

    async handleRenameBranch(params: any, id: number | string) {
        const dir = this.requireDir(params, id);
        if (!dir) return;
        try {
            const newName = params?.newName;
            if (!newName) {
                return this.rpc.sendError(id, {
                    code: "BAD_REQUEST",
                    message: "Missing 'newName' parameter",
                });
            }
            await this.gitService.renameBranch(dir, newName);
            this.rpc.sendResponse(id, { ok: true, data: { branch: newName } });
        } catch (e: any) {
            this.logger?.error({ e }, "git.renameBranch failed");
            this.rpc.sendError(id, { code: "GIT_ERROR", message: String(e.message || e) });
        }
    }
}
