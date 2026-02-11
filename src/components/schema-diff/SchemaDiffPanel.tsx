import { useState } from "react";
import {
    GitCompareArrows,
    ChevronRight,
    ChevronDown,
    Plus,
    Minus,
    Pencil,
    Table2,
    Columns3,
    Database,
    RefreshCw,
    History,
    AlertCircle,
    FolderGit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useSchemaDiff, useSchemaFileHistory } from "@/hooks/useSchemaDiff";
import type {
    DiffStatus,
    SchemaDiff,
    TableDiff,
    ColumnDiff,
    ColumnChange,
    SchemaDiffResult,
} from "@/types/schemaDiff";

// ─── Helpers ─────────────────────────────────────────────────

const statusColor: Record<DiffStatus, string> = {
    added: "text-emerald-500",
    removed: "text-red-500",
    modified: "text-amber-500",
    unchanged: "text-muted-foreground/60",
};

const statusBg: Record<DiffStatus, string> = {
    added: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    removed: "bg-red-500/10 text-red-500 border-red-500/20",
    modified: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    unchanged: "bg-muted/30 text-muted-foreground border-border/30",
};

const StatusIcon = ({ status }: { status: DiffStatus }) => {
    switch (status) {
        case "added":
            return <Plus className="h-3.5 w-3.5 text-emerald-500" />;
        case "removed":
            return <Minus className="h-3.5 w-3.5 text-red-500" />;
        case "modified":
            return <Pencil className="h-3.5 w-3.5 text-amber-500" />;
        default:
            return null;
    }
};

// ─── Props ───────────────────────────────────────────────────

interface SchemaDiffPanelProps {
    projectId?: string | null;
}

// ─── Component ───────────────────────────────────────────────

export default function SchemaDiffPanel({ projectId }: SchemaDiffPanelProps) {
    const [fromRef, setFromRef] = useState("HEAD");
    const [hideUnchanged, setHideUnchanged] = useState(true);

    const {
        data: diffResponse,
        isLoading,
        isFetching,
        refetch,
    } = useSchemaDiff(projectId ?? undefined, fromRef);

    const { data: historyResponse } = useSchemaFileHistory(
        projectId ?? undefined,
    );

    // ── Not a git repo ──────────────────────────────────────────
    if (!isLoading && diffResponse && !diffResponse.isGitRepo) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground p-8">
                <FolderGit2 className="h-12 w-12 opacity-40" />
                <p className="text-sm text-center max-w-xs">
                    This project is not inside a Git repository. Initialize Git from the
                    status bar to start tracking schema changes.
                </p>
            </div>
        );
    }

    // ── Loading ─────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Spinner className="h-6 w-6" />
            </div>
        );
    }

    // ── Error / null diff (no commits yet) ──────────────────────
    if (!diffResponse?.diff) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground p-8">
                <AlertCircle className="h-10 w-10 opacity-40" />
                <p className="text-sm text-center max-w-xs">
                    {diffResponse?.message ??
                        "No schema snapshots found yet. Save a schema to start tracking changes."}
                </p>
            </div>
        );
    }

    const diff = diffResponse.diff;
    const history = historyResponse?.entries ?? [];

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <header className="shrink-0 border-b border-border/20 bg-background/95 backdrop-blur-sm">
                <div className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <GitCompareArrows className="h-4 w-4 text-primary" />
                        <h2 className="text-sm font-semibold">Schema Diff</h2>
                        {isFetching && <Spinner className="h-3.5 w-3.5 ml-1" />}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setHideUnchanged(!hideUnchanged)}
                        >
                            {hideUnchanged ? "Show All" : "Hide Unchanged"}
                        </Button>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => refetch()}
                                >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Refresh diff</TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                {/* Ref selector row */}
                <div className="px-6 pb-3 flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Compare</span>
                    <Select value={fromRef} onValueChange={setFromRef}>
                        <SelectTrigger className="h-6 w-auto min-w-[100px] text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="HEAD">HEAD (last commit)</SelectItem>
                            {history.map((entry) => (
                                <SelectItem key={entry.hash} value={entry.fullHash}>
                                    <span className="font-mono">{entry.hash}</span>{" "}
                                    <span className="text-muted-foreground">{entry.subject}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <span className="text-muted-foreground">→ working tree</span>
                </div>
            </header>

            {/* Summary bar */}
            <SummaryBar diff={diff} />

            {/* Diff tree */}
            <ScrollArea className="flex-1">
                <div className="px-4 py-3 space-y-1">
                    {diff.schemas
                        .filter((s) => !hideUnchanged || s.status !== "unchanged")
                        .map((schema) => (
                            <SchemaNode
                                key={schema.name}
                                schema={schema}
                                hideUnchanged={hideUnchanged}
                            />
                        ))}
                    {diff.schemas.filter(
                        (s) => !hideUnchanged || s.status !== "unchanged",
                    ).length === 0 && (
                            <div className="py-8 text-center text-xs text-muted-foreground/60">
                                No schema changes detected.
                            </div>
                        )}
                </div>
            </ScrollArea>
        </div>
    );
}

// ─── Summary Bar ─────────────────────────────────────────────

function SummaryBar({ diff }: { diff: SchemaDiffResult }) {
    const s = diff.summary;
    if (!s.hasChanges) {
        return (
            <div className="px-6 py-2 border-b border-border/20 text-xs text-muted-foreground/60">
                Schema is up to date — no changes from the committed version.
            </div>
        );
    }
    return (
        <div className="px-6 py-2 border-b border-border/20 flex flex-wrap gap-2">
            {s.tablesAdded > 0 && (
                <Badge
                    variant="outline"
                    className={cn("text-[10px] h-5", statusBg.added)}
                >
                    +{s.tablesAdded} table{s.tablesAdded > 1 ? "s" : ""}
                </Badge>
            )}
            {s.tablesRemoved > 0 && (
                <Badge
                    variant="outline"
                    className={cn("text-[10px] h-5", statusBg.removed)}
                >
                    -{s.tablesRemoved} table{s.tablesRemoved > 1 ? "s" : ""}
                </Badge>
            )}
            {s.tablesModified > 0 && (
                <Badge
                    variant="outline"
                    className={cn("text-[10px] h-5", statusBg.modified)}
                >
                    ~{s.tablesModified} table{s.tablesModified > 1 ? "s" : ""} modified
                </Badge>
            )}
            {s.columnsAdded > 0 && (
                <Badge variant="outline" className={cn("text-[10px] h-5", statusBg.added)}>
                    +{s.columnsAdded} column{s.columnsAdded > 1 ? "s" : ""}
                </Badge>
            )}
            {s.columnsRemoved > 0 && (
                <Badge variant="outline" className={cn("text-[10px] h-5", statusBg.removed)}>
                    -{s.columnsRemoved} column{s.columnsRemoved > 1 ? "s" : ""}
                </Badge>
            )}
            {s.columnsModified > 0 && (
                <Badge variant="outline" className={cn("text-[10px] h-5", statusBg.modified)}>
                    ~{s.columnsModified} column{s.columnsModified > 1 ? "s" : ""} modified
                </Badge>
            )}
        </div>
    );
}

// ─── Schema Node ─────────────────────────────────────────────

function SchemaNode({
    schema,
    hideUnchanged,
}: {
    schema: SchemaDiff;
    hideUnchanged: boolean;
}) {
    const [open, setOpen] = useState(schema.status !== "unchanged");
    const visibleTables = schema.tables.filter(
        (t) => !hideUnchanged || t.status !== "unchanged",
    );

    return (
        <div>
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted/50 text-xs transition-colors"
            >
                {open ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <Database className={cn("h-3.5 w-3.5 shrink-0", statusColor[schema.status])} />
                <span className={cn("font-medium", statusColor[schema.status])}>
                    {schema.name}
                </span>
                <StatusIcon status={schema.status} />
                <span className="text-[10px] text-muted-foreground/50 ml-auto">
                    {visibleTables.length} table{visibleTables.length !== 1 ? "s" : ""}
                </span>
            </button>
            {open && (
                <div className="ml-5 border-l border-border/20 pl-2 space-y-0.5 mt-0.5">
                    {visibleTables.map((table) => (
                        <TableNode
                            key={`${table.schema}.${table.name}`}
                            table={table}
                            hideUnchanged={hideUnchanged}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Table Node ──────────────────────────────────────────────

function TableNode({
    table,
    hideUnchanged,
}: {
    table: TableDiff;
    hideUnchanged: boolean;
}) {
    const [open, setOpen] = useState(table.status !== "unchanged");
    const visibleCols = table.columns.filter(
        (c) => !hideUnchanged || c.status !== "unchanged",
    );

    return (
        <div>
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-muted/50 text-xs transition-colors"
            >
                {visibleCols.length > 0 ? (
                    open ? (
                        <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )
                ) : (
                    <span className="w-3" />
                )}
                <Table2 className={cn("h-3.5 w-3.5 shrink-0", statusColor[table.status])} />
                <span className={cn("font-mono", statusColor[table.status])}>
                    {table.name}
                </span>
                <StatusIcon status={table.status} />
                {table.status !== "unchanged" && (
                    <span className="text-[10px] text-muted-foreground/50 ml-auto">
                        {table.columns.filter((c) => c.status === "added").length > 0 &&
                            `+${table.columns.filter((c) => c.status === "added").length}`}
                        {table.columns.filter((c) => c.status === "removed").length > 0 &&
                            ` -${table.columns.filter((c) => c.status === "removed").length}`}
                        {table.columns.filter((c) => c.status === "modified").length > 0 &&
                            ` ~${table.columns.filter((c) => c.status === "modified").length}`}
                    </span>
                )}
            </button>
            {open && visibleCols.length > 0 && (
                <div className="ml-6 border-l border-border/20 pl-2 space-y-0.5 mt-0.5">
                    {visibleCols.map((col) => (
                        <ColumnNode key={col.name} column={col} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Column Node ─────────────────────────────────────────────

function ColumnNode({ column }: { column: ColumnDiff }) {
    const [open, setOpen] = useState(false);
    const hasDetails = column.changes && column.changes.length > 0;

    return (
        <div>
            <button
                onClick={() => hasDetails && setOpen(!open)}
                className={cn(
                    "w-full flex items-center gap-1.5 px-2 py-0.5 rounded text-xs transition-colors",
                    hasDetails ? "hover:bg-muted/50 cursor-pointer" : "cursor-default",
                )}
            >
                {hasDetails ? (
                    open ? (
                        <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )
                ) : (
                    <span className="w-3" />
                )}
                <Columns3 className={cn("h-3 w-3 shrink-0", statusColor[column.status])} />
                <span className={cn("font-mono", statusColor[column.status])}>
                    {column.name}
                </span>
                <StatusIcon status={column.status} />
                {/* Inline type annotation for quick glance */}
                {column.after?.type && column.status !== "removed" && (
                    <span className="text-[10px] text-muted-foreground/50 font-mono ml-1">
                        {column.after.type}
                    </span>
                )}
                {column.status === "removed" && column.before?.type && (
                    <span className="text-[10px] text-muted-foreground/50 font-mono ml-1 line-through">
                        {column.before.type}
                    </span>
                )}
            </button>
            {open && hasDetails && (
                <div className="ml-7 mt-0.5 mb-1 rounded bg-muted/20 border border-border/20 overflow-hidden">
                    {column.changes!.map((change) => (
                        <ChangeRow key={change.field} change={change} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Change Row ──────────────────────────────────────────────

function ChangeRow({ change }: { change: ColumnChange }) {
    return (
        <div className="flex items-center text-[11px] px-2 py-0.5 border-b border-border/10 last:border-b-0">
            <span className="w-20 shrink-0 text-muted-foreground font-medium">
                {change.field}
            </span>
            <span className="font-mono text-red-400 line-through mr-2">
                {change.before}
            </span>
            <span className="text-muted-foreground mr-2">→</span>
            <span className="font-mono text-emerald-400">{change.after}</span>
        </div>
    );
}
