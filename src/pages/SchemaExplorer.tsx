import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight, ChevronDown, Database, Layers, Table, Eye, FileCode, Copy, Download, Key, Link2, AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";

import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { bridgeApi, DatabaseSchemaDetails, ColumnDetails, TableSchemaDetails, SchemaGroup } from "@/services/bridgeApi"; // Import API and types
import Loader from "@/components/Loader";

interface Column extends ColumnDetails {
    foreignKeyRef?: string; // Add if foreignKeyRef detail is manually available
}

interface TableSchema extends TableSchemaDetails {
    columns: Column[];
}

interface Schema extends SchemaGroup {
    tables: TableSchema[];
}

interface DatabaseSchema extends DatabaseSchemaDetails {
    schemas: Schema[];
}

export default function SchemaExplorer() {
    const { id: dbId } = useParams<{ id: string }>();

    const [schemaData, setSchemaData] = useState<DatabaseSchema | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());
    const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
    const [selectedItem, setSelectedItem] = useState<string | null>(null);



    const fetchSchema = useCallback(async () => {
        if (!dbId) return;

        try {
            setLoading(true);
            setError(null);

            const result = await bridgeApi.getSchema(dbId);

            if (result) {
                setSchemaData(result as DatabaseSchema);
                setSelectedItem(result.name);
                // Expand the first schema found by default
                if (result.schemas.length > 0) {
                    setExpandedSchemas(new Set([result.schemas[0].name]));
                }
            } else {
                setError(`Database ID ${dbId} found no schema data.`);
            }

        } catch (err: any) {
            console.error("Failed to fetch schema:", err);
            setError(err.message || "Failed to connect and load schema metadata.");
            toast.error("Schema Load Failed", {
                description: err.message
            });
        } finally {
            setLoading(false);
        }
    }, [dbId]);

    useEffect(() => {
        fetchSchema();
    }, [fetchSchema]);



    const toggleSchema = (schemaName: string) => {
        const newExpanded = new Set(expandedSchemas);
        if (newExpanded.has(schemaName)) {
            newExpanded.delete(schemaName);
        } else {
            newExpanded.add(schemaName);
        }
        setExpandedSchemas(newExpanded);
    };

    const toggleTable = (tableName: string) => {
        const newExpanded = new Set(expandedTables);
        if (newExpanded.has(tableName)) {
            newExpanded.delete(tableName);
        } else {
            newExpanded.add(tableName);
        }
        setExpandedTables(newExpanded);
    };


    const handlePreviewRows = (tableName: string) => {
        toast.success(`Showing preview for ${tableName}`);
    };

    const handleShowDDL = (tableName: string) => {
        toast.success(`Generated DDL for ${tableName}`);
    };

    const handleCopy = (text: string, type: string) => {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);

        toast.success(`${type} copied to clipboard`);
    };

    const handleExport = (tableName: string) => {
        toast.success(`Exported ${tableName} successfully`);
    };


    if (loading) {
        return (
            // Use theme colors for background
            <div className="min-h-screen flex items-center justify-center bg-background dark:bg-[#050505] text-foreground">
                <Loader />
            </div>
        );
    }

    if (error || !schemaData) {
        return (
            // Use clean error styling with theme colors
            <div className="min-h-screen flex items-center justify-center bg-background dark:bg-[#050505] text-foreground">
                <div className="text-center p-8 border border-destructive/30 rounded-xl bg-destructive/10 text-destructive">
                    <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Error</h2>
                    <p className="text-sm text-muted-foreground">{error || "No schema data could be loaded."}</p>
                    <Button
                        onClick={fetchSchema}
                        // Use solid primary color (cyan) for retry
                        className="mt-4 bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/30"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" /> Retry Load
                    </Button>
                </div>
            </div>
        );
    }

    // Get the current database object
    const database = schemaData;


    // --- Main Renderer ---

    return (
        // Use theme colors for container
        <div className="min-h-screen bg-background flex flex-col text-foreground dark:bg-[#050505]">
            {/* Header */}
            <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl px-6 py-4 shrink-0 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to={`/${dbId}`}>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-accent transition-colors">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Schema Explorer</h1>
                            <p className="text-sm text-muted-foreground">
                                {database.name} | Browse structure and metadata
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Tree View Panel */}
                <div className="w-96 border-r border-border bg-card shrink-0">
                    <ScrollArea className="h-full">
                        <div className="p-4">
                            {/* Database Level (Root) */}
                            <div key={database.name} className="mb-2">
                                <div
                                    className={`flex items-center gap-2 p-2 rounded-md font-semibold text-sm text-primary`}
                                    onClick={() => setSelectedItem(database.name)} // Select the DB itself
                                >
                                    <Database className="h-4 w-4" />
                                    <span>{database.name}</span>
                                </div>

                                {/* Schema Level */}
                                <div className="ml-4 mt-1">
                                    {database.schemas.map((schema) => (
                                        <div key={schema.name} className="mb-1">
                                            <div
                                                className={`flex items-center gap-2 p-2 rounded-md cursor-pointer 
                                                    hover:bg-accent transition-colors 
                                                    ${selectedItem === `${database.name}.${schema.name}` ? "bg-accent/60" : ""
                                                    }`}
                                                onClick={() => {
                                                    toggleSchema(schema.name);
                                                    setSelectedItem(`${database.name}.${schema.name}`);
                                                }}
                                            >
                                                {expandedSchemas.has(schema.name) ? (
                                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                )}
                                                <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                                <span className="font-medium text-sm text-foreground">{schema.name}</span>
                                            </div>

                                            {/* Table Level */}
                                            {expandedSchemas.has(schema.name) && (
                                                <div className="ml-6 mt-1">
                                                    {schema.tables.map((table) => (
                                                        <ContextMenu key={table.name}>
                                                            <ContextMenuTrigger>
                                                                <div className="mb-1">
                                                                    <div
                                                                        className={`flex items-center gap-2 p-2 rounded-md cursor-pointer 
                                                                            hover:bg-accent transition-colors 
                                                                            ${selectedItem === `${database.name}.${schema.name}.${table.name}` ? "bg-accent/60" : ""
                                                                            }`}
                                                                        onClick={() => {
                                                                            toggleTable(table.name);
                                                                            setSelectedItem(`${database.name}.${schema.name}.${table.name}`);
                                                                        }}
                                                                    >
                                                                        {expandedTables.has(table.name) ? (
                                                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                                        ) : (
                                                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                                        )}
                                                                        <Table className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                                                                        <span className="text-sm text-foreground">{table.name}</span>
                                                                        {table.type !== "BASE TABLE" && (
                                                                            <Badge variant="outline" className="ml-auto text-xs text-primary border-primary/50">
                                                                                {table.type.toUpperCase()}
                                                                            </Badge>
                                                                        )}
                                                                    </div>

                                                                    {/* Column Level */}
                                                                    {expandedTables.has(table.name) && (
                                                                        <div className="ml-6 mt-1">
                                                                            {table.columns.map((column) => (
                                                                                <ContextMenu key={column.name}>
                                                                                    <ContextMenuTrigger>
                                                                                        <div className="mb-0.5">
                                                                                            <div
                                                                                                className={`flex items-center justify-between gap-2 p-1.5 rounded-md cursor-pointer text-xs 
                                                                                                    hover:bg-accent transition-colors
                                                                                                    ${selectedItem === `${database.name}.${schema.name}.${table.name}.${column.name}` ? "bg-accent/60" : ""
                                                                                                    }`}
                                                                                                onClick={() =>
                                                                                                    setSelectedItem(`${database.name}.${schema.name}.${table.name}.${column.name}`)
                                                                                                }
                                                                                            >
                                                                                                <div className="flex items-center gap-1 flex-1 min-w-0">
                                                                                                    {column.isPrimaryKey && <Key className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />}
                                                                                                    {column.isForeignKey && <Link2 className="h-3 w-3 text-primary shrink-0" />}
                                                                                                    <span className="truncate text-foreground">{column.name}</span>
                                                                                                </div>
                                                                                                <span className="text-muted-foreground text-xs shrink-0">{column.type}</span>
                                                                                            </div>
                                                                                        </div>
                                                                                    </ContextMenuTrigger>
                                                                                    {/* Context Menu: Use theme colors */}
                                                                                    <ContextMenuContent className="bg-popover border-border">
                                                                                        <ContextMenuItem onClick={() => handleCopy(column.name, "Column name")} className="hover:bg-accent"><Copy className="h-4 w-4 mr-2" />Copy Column Name</ContextMenuItem>
                                                                                    </ContextMenuContent>
                                                                                </ContextMenu>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </ContextMenuTrigger>
                                                            {/* Context Menu: Use theme colors */}
                                                            <ContextMenuContent className="bg-popover border-border">
                                                                <ContextMenuItem onClick={() => handlePreviewRows(table.name)} className="hover:bg-accent"><Eye className="h-4 w-4 mr-2" />Preview Rows</ContextMenuItem>
                                                                <ContextMenuItem onClick={() => handleShowDDL(table.name)} className="hover:bg-accent"><FileCode className="h-4 w-4 mr-2" />Show DDL</ContextMenuItem>
                                                                <ContextMenuItem onClick={() => handleCopy(table.name, "Table name")} className="hover:bg-accent"><Copy className="h-4 w-4 mr-2" />Copy Table Name</ContextMenuItem>
                                                                <ContextMenuItem onClick={() => handleExport(table.name)} className="hover:bg-accent"><Download className="h-4 w-4 mr-2" />Export Table</ContextMenuItem>
                                                            </ContextMenuContent>
                                                        </ContextMenu>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                </div>

                {/* Metadata Panel */}
                <div className="flex-1 overflow-auto bg-background">
                    <ScrollArea className="h-full">
                        <div className="p-6">
                            {selectedItem ? (
                                (() => {
                                    const parts = selectedItem.split(".");

                                    // Helper function to find the objects
                                    const db = database;
                                    const schema = parts.length >= 2 ? db?.schemas.find((s) => s.name === parts[1]) : undefined;
                                    const table = parts.length >= 3 ? schema?.tables.find((t) => t.name === parts[2]) : undefined;
                                    const column = parts.length === 4 ? table?.columns.find((c) => c.name === parts[3]) : undefined;

                                    if (parts.length === 4 && column) {
                                        // Column selected
                                        const [dbName, schemaName, tableName, columnName] = parts;
                                        return (
                                            <div className="space-y-6">
                                                <div>
                                                    <h2 className="text-2xl font-bold text-foreground mb-2">{columnName}</h2>
                                                    <p className="text-sm text-muted-foreground">
                                                        {dbName}.{schemaName}.{tableName}.{columnName}
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    {/* Data Card 1: Data Type */}
                                                    <div className="p-4 border border-border rounded-lg bg-card shadow-sm">
                                                        <div className="text-sm font-semibold text-muted-foreground mb-1">Data Type</div>
                                                        <div className="text-lg font-mono text-foreground">{column.type}</div>
                                                    </div>
                                                    {/* Data Card 2: Nullable */}
                                                    <div className="p-4 border border-border rounded-lg bg-card shadow-sm">
                                                        <div className="text-sm font-semibold text-muted-foreground mb-1">Nullable</div>
                                                        <div className="text-lg text-foreground">{column.nullable ? "Yes" : "No"}</div>
                                                    </div>
                                                    {column.defaultValue && (
                                                        <div className="p-4 border border-border rounded-lg bg-card shadow-sm col-span-2">
                                                            <div className="text-sm font-semibold text-muted-foreground mb-1">Default Value</div>
                                                            <div className="text-lg font-mono text-foreground">{column.defaultValue}</div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <h3 className="text-lg font-semibold text-foreground mb-3">Constraints</h3>
                                                    <div className="space-y-2">
                                                        {column.isPrimaryKey && (
                                                            <div className="flex items-center gap-2 p-3 border border-border rounded-lg bg-card shadow-sm">
                                                                <Key className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                                                <div>
                                                                    <div className="font-semibold text-foreground">Primary Key</div>
                                                                    <div className="text-sm text-muted-foreground">This column is a primary key</div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {column.isForeignKey && (
                                                            <div className="flex items-center gap-2 p-3 border border-border rounded-lg bg-card shadow-sm">
                                                                <Link2 className="h-5 w-5 text-primary" />
                                                                <div>
                                                                    <div className="font-semibold text-foreground">Foreign Key</div>
                                                                    <div className="text-sm text-muted-foreground">
                                                                        References: {column.foreignKeyRef || 'N/A'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {column.isUnique && (
                                                            <div className="flex items-center gap-2 p-3 border border-border rounded-lg bg-card shadow-sm">
                                                                <AlertCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                                                <div>
                                                                    <div className="font-semibold text-foreground">Unique</div>
                                                                    <div className="text-sm text-muted-foreground">Values must be unique</div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {!column.isPrimaryKey && !column.isForeignKey && !column.isUnique && (
                                                            <div className="text-sm text-muted-foreground p-2 border border-dashed border-border rounded-lg">
                                                                No complex constraints applied.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    } else if (parts.length === 3 && table) {
                                        // Table selected
                                        const [dbName, schemaName, tableName] = parts;
                                        return (
                                            <div className="space-y-6">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <h2 className="text-2xl font-bold text-foreground">{tableName}</h2>
                                                        {table.type !== "BASE TABLE" && (
                                                            <Badge variant="outline" className="text-primary border-primary/50">{table.type.toUpperCase()}</Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {dbName}.{schemaName}.{tableName}
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-3 gap-4">
                                                    {/* Stat Card 1: Columns */}
                                                    <div className="p-4 border border-border rounded-lg bg-card shadow-sm">
                                                        <div className="text-sm font-semibold text-muted-foreground mb-1">Columns</div>
                                                        <div className="text-2xl font-bold text-foreground">{table.columns.length}</div>
                                                    </div>
                                                    {/* Stat Card 2: Primary Keys */}
                                                    <div className="p-4 border border-border rounded-lg bg-card shadow-sm">
                                                        <div className="text-sm font-semibold text-muted-foreground mb-1">Primary Keys</div>
                                                        <div className="text-2xl font-bold text-foreground">
                                                            {table.columns.filter((c) => c.isPrimaryKey).length}
                                                        </div>
                                                    </div>
                                                    {/* Stat Card 3: Foreign Keys */}
                                                    <div className="p-4 border border-border rounded-lg bg-card shadow-sm">
                                                        <div className="text-sm font-semibold text-muted-foreground mb-1">Foreign Keys</div>
                                                        <div className="text-2xl font-bold text-foreground">
                                                            {table.columns.filter((c) => c.isForeignKey).length}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <h3 className="text-lg font-semibold text-foreground mb-3">Columns</h3>
                                                    {/* Table of Columns: Use theme colors for borders, backgrounds, and text */}
                                                    <div className="border border-border rounded-lg overflow-hidden">
                                                        <table className="w-full">
                                                            <thead className="bg-muted text-muted-foreground">
                                                                <tr>
                                                                    <th className="text-left p-3 text-sm font-semibold">Name</th>
                                                                    <th className="text-left p-3 text-sm font-semibold">Type</th>
                                                                    <th className="text-left p-3 text-sm font-semibold">Nullable</th>
                                                                    <th className="text-left p-3 text-sm font-semibold">Constraints</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {table.columns.map((column) => (
                                                                    <tr key={column.name} className="border-t border-border hover:bg-muted/50">
                                                                        <td className="p-3 font-mono text-sm text-foreground">{column.name}</td>
                                                                        <td className="p-3 font-mono text-sm text-muted-foreground">{column.type}</td>
                                                                        <td className="p-3 text-sm text-foreground">{column.nullable ? "Yes" : "No"}</td>
                                                                        <td className="p-3 text-sm">
                                                                            <div className="flex gap-1">
                                                                                {column.isPrimaryKey && (<Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400 border-amber-600/50">PK</Badge>)}
                                                                                {column.isForeignKey && (<Badge variant="outline" className="text-xs text-primary border-primary/50">FK</Badge>)}
                                                                                {column.isUnique && (<Badge variant="outline" className="text-xs text-purple-600 dark:text-purple-400 border-purple-600/50">UNIQUE</Badge>)}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="text-center text-muted-foreground py-12">
                                            Select a table or column to view detailed metadata.
                                        </div>
                                    );
                                })()
                            ) : (
                                <div className="text-center text-muted-foreground py-12">
                                    Select an item from the tree to view details
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div >
        </div >
    );
}