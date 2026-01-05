import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table2, BarChart } from "lucide-react";
import { ChartVisualization } from "@/components/chart/ChartVisualization";
import { TableRow } from "@/types/database";

interface QueryResultsPanelProps {
    dbId: string;
    tableData: TableRow[];
    rowCount: number;
    isExecuting: boolean;
    generatedSQL: string;
}

export default function QueryResultsPanel({
    dbId,
    tableData,
    rowCount,
    isExecuting,
    generatedSQL,
}: QueryResultsPanelProps) {
    // Extract table info from SQL for chart visualization
    const getTableFromSQL = () => {
        // Simple regex to extract table name from SELECT ... FROM table_name
        const match = generatedSQL.match(/FROM\s+(?:"?(\w+)"?\."?(\w+)"?|"?(\w+)"?)/i);
        if (match) {
            const schema = match[1] || 'public';
            const tableName = match[2] || match[3];
            return { schema, name: tableName };
        }
        return null;
    };

    const selectedTable = getTableFromSQL();

    return (
        <div className="h-full flex flex-col bg-background">
            <Tabs defaultValue="data" className="flex-1 flex flex-col">
                <div className="border-b border-border/20 px-6 py-3">
                    <TabsList className="h-9">
                        <TabsTrigger value="data" className="gap-1.5 text-xs h-7">
                            <Table2 className="h-3.5 w-3.5" />
                            Results ({rowCount})
                        </TabsTrigger>
                        <TabsTrigger value="charts" className="gap-1.5 text-xs h-7" disabled={!selectedTable}>
                            <BarChart className="h-3.5 w-3.5" />
                            Visualize
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="data" className="flex-1 p-6 mt-0">
                    {isExecuting ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                                <p className="text-sm text-muted-foreground">Executing query...</p>
                            </div>
                        </div>
                    ) : tableData.length > 0 ? (
                        <div className="border border-border/20 rounded-lg overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 sticky top-0">
                                    <tr>
                                        {Object.keys(tableData[0] || {}).map((key) => (
                                            <th key={key} className="px-4 py-2 text-left font-medium text-xs">
                                                {key}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableData.map((row, i) => (
                                        <tr key={i} className="border-t border-border/20 hover:bg-muted/30">
                                            {Object.values(row).map((value, j) => (
                                                <td key={j} className="px-4 py-2 text-xs">
                                                    {String(value)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <Table2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">No results yet</p>
                                <p className="text-xs text-muted-foreground/60 mt-1">
                                    Build a query and execute to see results
                                </p>
                            </div>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="charts" className="flex-1 p-6 mt-0">
                    {selectedTable ? (
                        <ChartVisualization selectedTable={selectedTable} dbId={dbId} />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <BarChart className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    Execute a query to enable visualization
                                </p>
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
