// ----------------------------
// services/schemaDiffService.ts
// ----------------------------
//
// Computes a structured diff between two schema snapshots.
// Used for diffing working tree vs HEAD, or any two refs.

import {
    SchemaFile,
    SchemaSnapshot,
    TableSnapshot,
    ColumnSnapshot,
} from "./projectStore";

// ==========================================
// Diff Result Types
// ==========================================

export type SchemaDiffResult = {
    /** Overall summary */
    summary: DiffSummary;

    /** Per-schema diffs */
    schemas: SchemaDiff[];
};

export type DiffSummary = {
    schemasAdded: number;
    schemasRemoved: number;
    schemasModified: number;
    tablesAdded: number;
    tablesRemoved: number;
    tablesModified: number;
    columnsAdded: number;
    columnsRemoved: number;
    columnsModified: number;
    hasChanges: boolean;
};

export type SchemaDiff = {
    name: string;
    status: "added" | "removed" | "modified" | "unchanged";
    tables: TableDiff[];
};

export type TableDiff = {
    name: string;
    schema: string;
    status: "added" | "removed" | "modified" | "unchanged";
    columns: ColumnDiff[];
};

export type ColumnDiff = {
    name: string;
    status: "added" | "removed" | "modified" | "unchanged";
    /** Only for "modified" — what changed */
    changes?: ColumnChange[];
    /** Before state (for removed/modified) */
    before?: ColumnSnapshot;
    /** After state (for added/modified) */
    after?: ColumnSnapshot;
};

export type ColumnChange = {
    field: string;
    before: string;
    after: string;
};

// ==========================================
// Diff Engine
// ==========================================

export class SchemaDiffService {
    /**
     * Compare two SchemaFile objects and return a structured diff.
     * Either can be null (e.g., initial commit has no HEAD version).
     */
    diff(
        before: SchemaFile | null,
        after: SchemaFile | null
    ): SchemaDiffResult {
        const beforeSchemas = before?.schemas ?? [];
        const afterSchemas = after?.schemas ?? [];

        const beforeMap = new Map(beforeSchemas.map((s) => [s.name, s]));
        const afterMap = new Map(afterSchemas.map((s) => [s.name, s]));

        const allSchemaNames = new Set([
            ...beforeMap.keys(),
            ...afterMap.keys(),
        ]);

        const schemas: SchemaDiff[] = [];
        const summary: DiffSummary = {
            schemasAdded: 0,
            schemasRemoved: 0,
            schemasModified: 0,
            tablesAdded: 0,
            tablesRemoved: 0,
            tablesModified: 0,
            columnsAdded: 0,
            columnsRemoved: 0,
            columnsModified: 0,
            hasChanges: false,
        };

        for (const name of allSchemaNames) {
            const bSchema = beforeMap.get(name);
            const aSchema = afterMap.get(name);

            if (!bSchema && aSchema) {
                // Schema added
                summary.schemasAdded++;
                const tables = aSchema.tables.map((t) =>
                    this.tableAsAdded(name, t)
                );
                summary.tablesAdded += tables.length;
                for (const t of tables) summary.columnsAdded += t.columns.length;

                schemas.push({ name, status: "added", tables });
            } else if (bSchema && !aSchema) {
                // Schema removed
                summary.schemasRemoved++;
                const tables = bSchema.tables.map((t) =>
                    this.tableAsRemoved(name, t)
                );
                summary.tablesRemoved += tables.length;
                for (const t of tables) summary.columnsRemoved += t.columns.length;

                schemas.push({ name, status: "removed", tables });
            } else if (bSchema && aSchema) {
                // Schema exists in both — diff tables
                const tableDiffs = this.diffTables(name, bSchema, aSchema, summary);
                const hasTableChanges = tableDiffs.some(
                    (t) => t.status !== "unchanged"
                );

                if (hasTableChanges) summary.schemasModified++;

                schemas.push({
                    name,
                    status: hasTableChanges ? "modified" : "unchanged",
                    tables: tableDiffs,
                });
            }
        }

        summary.hasChanges =
            summary.schemasAdded > 0 ||
            summary.schemasRemoved > 0 ||
            summary.schemasModified > 0;

        // Sort: changed items first
        schemas.sort((a, b) => {
            const order = { removed: 0, added: 1, modified: 2, unchanged: 3 };
            return order[a.status] - order[b.status];
        });

        return { summary, schemas };
    }

    // ---- Table diffing ----

    private diffTables(
        schemaName: string,
        before: SchemaSnapshot,
        after: SchemaSnapshot,
        summary: DiffSummary
    ): TableDiff[] {
        const bMap = new Map(before.tables.map((t) => [t.name, t]));
        const aMap = new Map(after.tables.map((t) => [t.name, t]));

        const allTableNames = new Set([...bMap.keys(), ...aMap.keys()]);
        const results: TableDiff[] = [];

        for (const name of allTableNames) {
            const bTable = bMap.get(name);
            const aTable = aMap.get(name);

            if (!bTable && aTable) {
                summary.tablesAdded++;
                const diff = this.tableAsAdded(schemaName, aTable);
                summary.columnsAdded += diff.columns.length;
                results.push(diff);
            } else if (bTable && !aTable) {
                summary.tablesRemoved++;
                const diff = this.tableAsRemoved(schemaName, bTable);
                summary.columnsRemoved += diff.columns.length;
                results.push(diff);
            } else if (bTable && aTable) {
                const columns = this.diffColumns(bTable, aTable);
                const hasColChanges = columns.some(
                    (c) => c.status !== "unchanged"
                );

                if (hasColChanges) summary.tablesModified++;
                for (const c of columns) {
                    if (c.status === "added") summary.columnsAdded++;
                    if (c.status === "removed") summary.columnsRemoved++;
                    if (c.status === "modified") summary.columnsModified++;
                }

                results.push({
                    name,
                    schema: schemaName,
                    status: hasColChanges ? "modified" : "unchanged",
                    columns,
                });
            }
        }

        // Sort: changed items first
        results.sort((a, b) => {
            const order = { removed: 0, added: 1, modified: 2, unchanged: 3 };
            return order[a.status] - order[b.status];
        });

        return results;
    }

    // ---- Column diffing ----

    private diffColumns(
        before: TableSnapshot,
        after: TableSnapshot
    ): ColumnDiff[] {
        const bMap = new Map(before.columns.map((c) => [c.name, c]));
        const aMap = new Map(after.columns.map((c) => [c.name, c]));

        const allColumnNames = new Set([...bMap.keys(), ...aMap.keys()]);
        const results: ColumnDiff[] = [];

        for (const name of allColumnNames) {
            const bCol = bMap.get(name);
            const aCol = aMap.get(name);

            if (!bCol && aCol) {
                results.push({ name, status: "added", after: aCol });
            } else if (bCol && !aCol) {
                results.push({ name, status: "removed", before: bCol });
            } else if (bCol && aCol) {
                const changes = this.diffColumnProps(bCol, aCol);
                if (changes.length > 0) {
                    results.push({
                        name,
                        status: "modified",
                        changes,
                        before: bCol,
                        after: aCol,
                    });
                } else {
                    results.push({ name, status: "unchanged" });
                }
            }
        }

        // Sort: changed items first
        results.sort((a, b) => {
            const order = { removed: 0, added: 1, modified: 2, unchanged: 3 };
            return order[a.status] - order[b.status];
        });

        return results;
    }

    private diffColumnProps(
        before: ColumnSnapshot,
        after: ColumnSnapshot
    ): ColumnChange[] {
        const changes: ColumnChange[] = [];

        if (before.type !== after.type) {
            changes.push({
                field: "type",
                before: before.type,
                after: after.type,
            });
        }
        if (before.nullable !== after.nullable) {
            changes.push({
                field: "nullable",
                before: String(before.nullable),
                after: String(after.nullable),
            });
        }
        if (before.isPrimaryKey !== after.isPrimaryKey) {
            changes.push({
                field: "primaryKey",
                before: String(before.isPrimaryKey),
                after: String(after.isPrimaryKey),
            });
        }
        if (before.isForeignKey !== after.isForeignKey) {
            changes.push({
                field: "foreignKey",
                before: String(before.isForeignKey),
                after: String(after.isForeignKey),
            });
        }
        if (before.isUnique !== after.isUnique) {
            changes.push({
                field: "unique",
                before: String(before.isUnique),
                after: String(after.isUnique),
            });
        }
        if (before.defaultValue !== after.defaultValue) {
            changes.push({
                field: "default",
                before: before.defaultValue ?? "null",
                after: after.defaultValue ?? "null",
            });
        }

        return changes;
    }

    // ---- Helpers ----

    private tableAsAdded(schemaName: string, table: TableSnapshot): TableDiff {
        return {
            name: table.name,
            schema: schemaName,
            status: "added",
            columns: table.columns.map((c) => ({
                name: c.name,
                status: "added" as const,
                after: c,
            })),
        };
    }

    private tableAsRemoved(schemaName: string, table: TableSnapshot): TableDiff {
        return {
            name: table.name,
            schema: schemaName,
            status: "removed",
            columns: table.columns.map((c) => ({
                name: c.name,
                status: "removed" as const,
                before: c,
            })),
        };
    }
}

export const schemaDiffServiceInstance = new SchemaDiffService();
