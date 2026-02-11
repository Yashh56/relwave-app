import { Rpc } from "../types";
import { Logger } from "pino";
import { gitServiceInstance, GitService } from "../services/gitService";
import {
    schemaDiffServiceInstance,
    SchemaDiffService,
} from "../services/schemaDiffService";
import {
    projectStoreInstance,
    ProjectStore,
    SchemaFile,
} from "../services/projectStore";
import { getProjectDir } from "../utils/config";
import path from "path";

/**
 * RPC handlers for schema diffing.
 *
 * Methods:
 *   schema.diff         — diff working tree vs HEAD (or any two refs)
 *   schema.fileHistory  — commit history for schema.json
 */
export class SchemaDiffHandlers {
    constructor(
        private rpc: Rpc,
        private logger: Logger,
        private git: GitService = gitServiceInstance,
        private differ: SchemaDiffService = schemaDiffServiceInstance,
        private store: ProjectStore = projectStoreInstance
    ) { }

    /**
     * schema.diff
     *
     * params:
     *   projectId  — required
     *   fromRef    — git ref for "before" (default: "HEAD")
     *   toRef      — git ref for "after" (default: null = working tree)
     */
    async handleDiff(params: any, id: number | string) {
        try {
            const { projectId, fromRef = "HEAD", toRef } = params || {};
            if (!projectId) {
                return this.rpc.sendError(id, {
                    code: "BAD_REQUEST",
                    message: "Missing projectId",
                });
            }

            const dir = getProjectDir(projectId);

            // Check if this project is in a git repo
            const isRepo = await this.git.isRepo(dir);
            if (!isRepo) {
                return this.rpc.sendResponse(id, {
                    ok: true,
                    data: {
                        isGitRepo: false,
                        diff: null,
                        message: "Project directory is not a git repository",
                    },
                });
            }

            // Get repo root so we can compute the relative path
            const repoRoot = await this.git.getRepoRoot(dir);
            const relSchemaPath = path
                .relative(repoRoot, path.join(dir, "schema", "schema.json"))
                .replace(/\\/g, "/");

            // Read "before" schema from git ref
            let beforeSchema: SchemaFile | null = null;
            try {
                const beforeRaw = await this.git.getFileAtRef(
                    repoRoot,
                    relSchemaPath,
                    fromRef
                );
                if (beforeRaw) {
                    beforeSchema = JSON.parse(beforeRaw) as SchemaFile;
                }
            } catch {
                // File may not exist at this ref — that's OK, treat as empty
            }

            // Read "after" schema
            let afterSchema: SchemaFile | null = null;
            if (toRef) {
                // Comparing two refs
                try {
                    const afterRaw = await this.git.getFileAtRef(
                        repoRoot,
                        relSchemaPath,
                        toRef
                    );
                    if (afterRaw) {
                        afterSchema = JSON.parse(afterRaw) as SchemaFile;
                    }
                } catch {
                    // ok
                }
            } else {
                // Compare against working tree (current file on disk)
                afterSchema = await this.store.getSchema(projectId);
            }

            // Compute diff
            const diff = this.differ.diff(beforeSchema, afterSchema);

            this.rpc.sendResponse(id, {
                ok: true,
                data: {
                    isGitRepo: true,
                    diff,
                    fromRef,
                    toRef: toRef || "working tree",
                },
            });
        } catch (e: any) {
            this.logger?.error({ e }, "schema.diff failed");
            this.rpc.sendError(id, {
                code: "DIFF_ERROR",
                message: String(e.message || e),
            });
        }
    }

    /**
     * schema.fileHistory
     *
     * params:
     *   projectId — required
     *   count     — max entries (default 20)
     */
    async handleFileHistory(params: any, id: number | string) {
        try {
            const { projectId, count = 20 } = params || {};
            if (!projectId) {
                return this.rpc.sendError(id, {
                    code: "BAD_REQUEST",
                    message: "Missing projectId",
                });
            }

            const dir = getProjectDir(projectId);
            const isRepo = await this.git.isRepo(dir);
            if (!isRepo) {
                return this.rpc.sendResponse(id, {
                    ok: true,
                    data: { isGitRepo: false, entries: [] },
                });
            }

            const repoRoot = await this.git.getRepoRoot(dir);
            const relSchemaPath = path
                .relative(repoRoot, path.join(dir, "schema", "schema.json"))
                .replace(/\\/g, "/");

            const entries = await this.git.fileLog(repoRoot, relSchemaPath, count);

            this.rpc.sendResponse(id, {
                ok: true,
                data: { isGitRepo: true, entries },
            });
        } catch (e: any) {
            this.logger?.error({ e }, "schema.fileHistory failed");
            this.rpc.sendError(id, {
                code: "DIFF_ERROR",
                message: String(e.message || e),
            });
        }
    }
}
