// ==========================================
// Schema Diff Types — Frontend
// ==========================================

import type { ColumnSnapshot } from "@/types/project";

export interface SchemaDiffResult {
    summary: DiffSummary;
    schemas: SchemaDiff[];
}

export interface DiffSummary {
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
}

export type DiffStatus = "added" | "removed" | "modified" | "unchanged";

export interface SchemaDiff {
    name: string;
    status: DiffStatus;
    tables: TableDiff[];
}

export interface TableDiff {
    name: string;
    schema: string;
    status: DiffStatus;
    columns: ColumnDiff[];
}

export interface ColumnDiff {
    name: string;
    status: DiffStatus;
    changes?: ColumnChange[];
    before?: ColumnSnapshot;
    after?: ColumnSnapshot;
}

export interface ColumnChange {
    field: string;
    before: string;
    after: string;
}

export interface SchemaDiffResponse {
    isGitRepo: boolean;
    diff: SchemaDiffResult | null;
    fromRef?: string;
    toRef?: string;
    message?: string;
}

export interface SchemaFileHistoryResponse {
    isGitRepo: boolean;
    entries: SchemaFileHistoryEntry[];
}

export interface SchemaFileHistoryEntry {
    hash: string;
    fullHash: string;
    author: string;
    date: string;
    subject: string;
}
