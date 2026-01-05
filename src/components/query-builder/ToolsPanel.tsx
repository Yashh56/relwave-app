import { useState } from 'react';
import { Plus, Trash2, Play, History, X, Filter, SortAsc, Columns3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface QueryHistoryItem {
    sql: string;
    timestamp: number;
}

interface FilterItem {
    column: string;
    operator: string;
    value: string;
}

interface AvailableColumn {
    value: string;
    label: string;
    table: string;
}

interface ToolsPanelProps {
    tables: string[];
    selectedTable: string;
    onSelectTable: (table: string) => void;
    onAddTable: () => void;
    onClearCanvas: () => void;
    onExecuteQuery: () => void;
    limit: number;
    onLimitChange: (limit: number) => void;
    queryHistory?: QueryHistoryItem[];
    onLoadQuery?: (sql: string) => void;
    onExport?: () => void;
    isExecuting?: boolean;
    // New props for full functionality
    availableColumns?: AvailableColumn[];
    selectedColumns?: string[];
    onSelectedColumnsChange?: (columns: string[]) => void;
    filters?: FilterItem[];
    onFiltersChange?: (filters: FilterItem[]) => void;
    sortBy?: string;
    onSortByChange?: (column: string) => void;
    groupBy?: string;
    onGroupByChange?: (column: string) => void;
}

export default function ToolsPanel({
    tables,
    selectedTable,
    onSelectTable,
    onAddTable,
    onClearCanvas,
    onExecuteQuery,
    limit,
    onLimitChange,
    queryHistory = [],
    onLoadQuery,
    isExecuting = false,
    availableColumns = [],
    selectedColumns = [],
    onSelectedColumnsChange,
    filters = [],
    onFiltersChange,
    sortBy = '',
    onSortByChange,
    groupBy = '',
    onGroupByChange,
}: ToolsPanelProps) {
    const [columnsOpen, setColumnsOpen] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [sortOpen, setSortOpen] = useState(false);

    const addFilter = () => {
        if (onFiltersChange) {
            onFiltersChange([...filters, { column: '', operator: '=', value: '' }]);
        }
    };

    const removeFilter = (index: number) => {
        if (onFiltersChange) {
            onFiltersChange(filters.filter((_, i) => i !== index));
        }
    };

    const updateFilter = (index: number, field: keyof FilterItem, value: string) => {
        if (onFiltersChange) {
            const newFilters = [...filters];
            newFilters[index][field] = value;
            onFiltersChange(newFilters);
        }
    };

    return (
        <div className="w-[280px] shrink-0 border-r border-border/30 flex flex-col bg-background">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border/30">
                <h2 className="text-sm font-semibold text-foreground">Query Builder</h2>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-3 space-y-3">
                    {/* Add Table */}
                    <section className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Add Table</Label>
                        <div className="flex gap-2">
                            <Select value={selectedTable} onValueChange={onSelectTable}>
                                <SelectTrigger className="flex-1 h-8 text-xs">
                                    <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {tables.map((table) => (
                                        <SelectItem key={table} value={table} className="text-xs">
                                            {table}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                onClick={onAddTable}
                                disabled={!selectedTable}
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 shrink-0"
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </section>

                    {/* Columns Selection */}
                    {onSelectedColumnsChange && (
                        <Collapsible open={columnsOpen} onOpenChange={setColumnsOpen}>
                            <CollapsibleTrigger asChild>
                                <button className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-muted/50 border border-border/30">
                                    <div className="flex items-center gap-1.5">
                                        <Columns3 className="h-3 w-3 text-muted-foreground" />
                                        <span>Columns</span>
                                        {selectedColumns.length > 0 && (
                                            <span className="text-[10px] bg-primary/20 text-primary px-1 rounded">
                                                {selectedColumns.length}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-muted-foreground text-[10px]">
                                        {selectedColumns.length === 0 ? 'All (*)' : ''}
                                    </span>
                                </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pt-2 space-y-2">
                                <Select
                                    value=""
                                    onValueChange={(val) => {
                                        if (!selectedColumns.includes(val)) {
                                            onSelectedColumnsChange([...selectedColumns, val]);
                                        }
                                    }}
                                >
                                    <SelectTrigger className="h-7 text-xs">
                                        <SelectValue placeholder="Add column..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableColumns.map((col) => (
                                            <SelectItem key={col.value} value={col.value} className="text-xs">
                                                {col.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedColumns.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {selectedColumns.map((col) => (
                                            <div key={col} className="inline-flex items-center gap-0.5 bg-muted px-1.5 py-0.5 rounded text-[10px]">
                                                <span>{col}</span>
                                                <button onClick={() => onSelectedColumnsChange(selectedColumns.filter(c => c !== col))}>
                                                    <X className="h-2.5 w-2.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CollapsibleContent>
                        </Collapsible>
                    )}

                    {/* Filters */}
                    {onFiltersChange && (
                        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
                            <CollapsibleTrigger asChild>
                                <button className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-muted/50 border border-border/30">
                                    <div className="flex items-center gap-1.5">
                                        <Filter className="h-3 w-3 text-muted-foreground" />
                                        <span>Filters</span>
                                        {filters.length > 0 && (
                                            <span className="text-[10px] bg-orange-500/20 text-orange-500 px-1 rounded">
                                                {filters.length}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pt-2 space-y-2">
                                {filters.map((filter, index) => (
                                    <div key={index} className="flex gap-1 items-center">
                                        <Select value={filter.column} onValueChange={(v) => updateFilter(index, 'column', v)}>
                                            <SelectTrigger className="flex-1 h-7 text-[10px]">
                                                <SelectValue placeholder="Col" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableColumns.map((col) => (
                                                    <SelectItem key={col.value} value={col.value} className="text-xs">{col.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select value={filter.operator} onValueChange={(v) => updateFilter(index, 'operator', v)}>
                                            <SelectTrigger className="w-12 h-7 text-[10px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {['=', '!=', '>', '<', 'LIKE'].map(op => (
                                                    <SelectItem key={op} value={op} className="text-xs">{op}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            value={filter.value}
                                            onChange={(e) => updateFilter(index, 'value', e.target.value)}
                                            className="flex-1 h-7 text-[10px]"
                                            placeholder="Value"
                                        />
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeFilter(index)}>
                                            <Trash2 className="h-3 w-3 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={addFilter}>
                                    <Plus className="h-3 w-3 mr-1" /> Add Filter
                                </Button>
                            </CollapsibleContent>
                        </Collapsible>
                    )}

                    {/* Sort & Group */}
                    {(onSortByChange || onGroupByChange) && (
                        <Collapsible open={sortOpen} onOpenChange={setSortOpen}>
                            <CollapsibleTrigger asChild>
                                <button className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-muted/50 border border-border/30">
                                    <div className="flex items-center gap-1.5">
                                        <SortAsc className="h-3 w-3 text-muted-foreground" />
                                        <span>Sort & Group</span>
                                    </div>
                                </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pt-2 space-y-2">
                                {onSortByChange && (
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground mb-1 block">Sort By</Label>
                                        <Select value={sortBy} onValueChange={onSortByChange}>
                                            <SelectTrigger className="h-7 text-xs">
                                                <SelectValue placeholder="None" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableColumns.map((col) => (
                                                    <SelectItem key={col.value} value={col.value} className="text-xs">{col.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                {onGroupByChange && (
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground mb-1 block">Group By</Label>
                                        <Select value={groupBy} onValueChange={onGroupByChange}>
                                            <SelectTrigger className="h-7 text-xs">
                                                <SelectValue placeholder="None" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableColumns.map((col) => (
                                                    <SelectItem key={col.value} value={col.value} className="text-xs">{col.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </CollapsibleContent>
                        </Collapsible>
                    )}

                    {/* Limit */}
                    <section className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Limit</Label>
                        <div className="flex gap-1 flex-wrap">
                            {[10, 50, 100, 500, 1000].map((val) => (
                                <Button
                                    key={val}
                                    size="sm"
                                    variant={limit === val ? "default" : "outline"}
                                    onClick={() => onLimitChange(val)}
                                    className="h-6 px-2 text-[10px]"
                                >
                                    {val}
                                </Button>
                            ))}
                        </div>
                    </section>

                    {/* Actions */}
                    <section className="space-y-2 pt-2 border-t border-border/30">
                        <Button
                            onClick={onExecuteQuery}
                            disabled={isExecuting}
                            className="w-full h-9 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <Play className="h-4 w-4 mr-2" />
                            {isExecuting ? 'Running...' : 'Run Query'}
                        </Button>
                        <Button
                            onClick={onClearCanvas}
                            variant="outline"
                            className="w-full h-8 text-xs"
                        >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Clear Canvas
                        </Button>
                    </section>

                    {/* History */}
                    {queryHistory.length > 0 && onLoadQuery && (
                        <section className="pt-2 border-t border-border/30">
                            <div className="flex items-center gap-1.5 mb-2">
                                <History className="h-3 w-3 text-muted-foreground" />
                                <Label className="text-xs font-medium text-muted-foreground">History</Label>
                            </div>
                            <div className="space-y-1">
                                {queryHistory.slice(0, 3).map((item, index) => (
                                    <button
                                        key={index}
                                        onClick={() => onLoadQuery(item.sql)}
                                        className="w-full text-left px-2 py-1 rounded text-[10px] hover:bg-muted/50 border border-border/20 truncate font-mono"
                                    >
                                        {item.sql.substring(0, 35)}...
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
