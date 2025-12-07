import { QueryProgress, SelectedTable } from "@/pages/DatabaseDetails";
import { TableRow } from "@/services/bridgeApi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Loader2, Play, RefreshCw, X, Table2, Code, BarChart } from "lucide-react";
import { DataTable } from "../DataTable";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { ChartVisualization } from "../ChartVisualization";

interface QueryContentTabsProps {
    selectedTable: SelectedTable | null;
    isExecuting: boolean;
    tableData: TableRow[];
    rowCount: number;
    query: string;
    queryProgress: QueryProgress | null;
    setQuery: (q: string) => void;
    onExecuteQuery: () => void;
    onCancelQuery: () => void;
}

const QueryContentTabs: React.FC<QueryContentTabsProps> = ({
    selectedTable,
    isExecuting,
    tableData,
    rowCount,
    query,
    queryProgress,
    setQuery,
    onExecuteQuery,
    onCancelQuery,
}) => {
    // Determine the current table name for the titles
    const tableName = selectedTable
        ? `${selectedTable.schema}.${selectedTable.name}`
        : "No table selected";

    // Use primary theme classes for consistency
    const accentClass = "text-primary dark:text-primary"; 
    const accentBorderClass = "border-primary dark:border-primary";
    const accentButtonClass = "bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/30";


    return (
        <Tabs defaultValue="data" className="w-full">
            {/* 1. SaaS-style Tabs Header (Clean, minimal accent) */}
            <div className="flex items-center justify-between mb-4">
                {/* TabsList: border-b is used for the clean underline effect */}
                <TabsList className="bg-transparent dark:bg-transparent border-b border-border rounded-none p-0 h-auto space-x-4">
                    {/* Tab Triggers: Using primary color for active state and hover */}
                    <TabsTrigger value="data" className={`p-3 data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:${accentClass} text-muted-foreground hover:${accentClass} transition-colors border-b-2 border-transparent data-[state=active]:${accentBorderClass} rounded-none font-semibold`}>
                        <Table2 className="h-4 w-4 mr-2" /> Current Table Data
                    </TabsTrigger>
                    <TabsTrigger value="editor" className={`p-3 data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:${accentClass} text-muted-foreground hover:${accentClass} transition-colors border-b-2 border-transparent data-[state=active]:${accentBorderClass} rounded-none font-semibold`}>
                        <Code className="h-4 w-4 mr-2" /> Query Editor
                    </TabsTrigger>
                    <TabsTrigger value="charts" className={`p-3 data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:${accentClass} text-muted-foreground hover:${accentClass} transition-colors border-b-2 border-transparent data-[state=active]:${accentBorderClass} rounded-none font-semibold`}>
                        <BarChart className="h-4 w-4 mr-2" /> Charts
                    </TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="data" className="space-y-4">
                {/* Data View Tab - Card background updated to bg-card, border and shadow updated */}
                <Card className="bg-card border border-border rounded-xl shadow-elevated">
                    <CardHeader className="border-b border-border pb-4">
                        <CardTitle className="font-mono text-xl text-foreground">
                            {tableName} Data
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                            {isExecuting ? "Loading data..." : `Showing ${rowCount.toLocaleString()} rows`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {isExecuting && rowCount === 0 ? (
                            <div className="text-center py-20 text-muted-foreground">
                                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                                Fetching initial data from **{selectedTable?.name || 'table'}**...
                            </div>
                        ) : (
                            <DataTable data={tableData} />
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Combined Query Editor and Results Tab */}
            <TabsContent value="editor" className="space-y-6">
                {/* Query Editor Section - Card background updated */}
                <Card className="bg-card border border-border rounded-xl shadow-elevated">
                    <CardHeader className="border-b border-border pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xl text-foreground">SQL Query Editor</CardTitle>
                            <div className="flex items-center space-x-3">
                                {isExecuting && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={onCancelQuery}
                                        className="bg-destructive hover:bg-destructive/90"
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        Cancel
                                    </Button>
                                )}
                                <Button
                                    onClick={onExecuteQuery}
                                    disabled={isExecuting || !query.trim()}
                                    // Primary button color
                                    className={`${accentButtonClass} transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {isExecuting ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            Executing...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="h-4 w-4 mr-2" />
                                            Execute Query
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <Textarea
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            disabled={isExecuting}
                            className="font-mono text-sm min-h-[250px] resize-y 
                                         bg-muted border-input text-foreground dark:bg-background/50
                                         focus:border-primary transition-colors placeholder:text-muted-foreground/80 p-4
                                         disabled:opacity-80 disabled:cursor-text"
                            placeholder="Enter your SQL query (e.g., SELECT * FROM users WHERE role = 'Admin');"
                        />
                    </CardContent>
                </Card>

                {/* Query Results Section - Card background updated */}
                <Card className="bg-card border border-border rounded-xl shadow-elevated">
                    <CardHeader className="border-b border-border pb-4">
                        <CardTitle className="font-mono text-xl text-foreground">Query Results</CardTitle>
                        <CardDescription className="text-muted-foreground">
                            {isExecuting
                                ? `Fetching results... (${rowCount.toLocaleString()} rows so far)`
                                : `Displaying ${rowCount.toLocaleString()} rows`
                            }
                            {queryProgress && (
                                <span className={`ml-2 text-xs font-semibold ${accentClass}`}>
                                    | Elapsed: {queryProgress.elapsed}s
                                </span>
                            )}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {isExecuting && rowCount === 0 ? (
                            <div className="text-center py-20 text-muted-foreground">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                                Awaiting first results batch...
                            </div>
                        ) : (
                            <DataTable data={tableData} />
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Charts Tab - Card background updated */}
            <TabsContent value="charts" className="space-y-4">
                <Card className="bg-card border border-border rounded-xl shadow-elevated p-6">
                    <CardTitle className="text-xl text-foreground mb-4">Data Visualizations</CardTitle>
                    <CardDescription className="text-muted-foreground mb-6">Explore your data with interactive charts.</CardDescription>
                    <ChartVisualization data={tableData} />
                </Card>
            </TabsContent>
        </Tabs >
    );
};

export default QueryContentTabs;