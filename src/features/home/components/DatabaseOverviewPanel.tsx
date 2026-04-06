import { Card, CardAction, CardContent, CardHeader } from "@/components/ui/card";
import { Clock, Database, HardDrive, Table2 } from "lucide-react";
import { formatRelativeTime } from "../utils";
import { DatabaseConnection } from "@/features/database/types";


interface DatabaseOverviewPanelProps {
    database: DatabaseConnection;
    tables: number | string | undefined;
    size: string | number | undefined;
}


export function DatabaseOverviewPanel({
    database,
    size,
    tables
}: DatabaseOverviewPanelProps) {
    return (

        <div className="flex-1 p-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="@container/card">
                    <CardHeader className="flex flex-row items-center justify-between text-xs">
                        <span>Engine</span>
                        <CardAction className="flex items-center gap-2 text-muted-foreground">
                            <Database className="h-4 w-4" />
                        </CardAction>
                    </CardHeader>

                    <CardContent className="text-lg font-semibold capitalize font-mono">
                        {database.type}
                    </CardContent>
                </Card>
                <Card className="@container/card">
                    <CardHeader className="flex flex-row items-center justify-between text-xs">
                        <span>Last Accessed</span>
                        <CardAction className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                        </CardAction>
                    </CardHeader>
                    <CardContent className="text-lg font-semibold">
                        {formatRelativeTime(database.lastAccessedAt)}
                    </CardContent>
                </Card>
                <Card className="@container/card">
                    <CardHeader className="flex flex-row items-center justify-between text-xs">
                        <span className="text-xs">Tables</span>
                        <CardAction className="flex items-center gap-2 text-muted-foreground">
                            <Table2 className="h-4 w-4" />
                        </CardAction>
                    </CardHeader>
                    <CardContent className="text-lg font-semibold">
                        {tables}
                    </CardContent>
                </Card>
                <Card className="@container/card">
                    <CardHeader className="flex flex-row items-center justify-between text-xs">
                        <span className="text-xs">Size</span>
                        <CardAction className="flex items-center gap-2 text-muted-foreground">
                            <HardDrive className="h-4 w-4" />
                        </CardAction>
                    </CardHeader>
                    <CardContent className="text-lg font-semibold">
                        {size}
                    </CardContent>
                </Card>
            </div>

            {/* Connection Details */}
            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
                    <h3 className="text-sm font-medium">Connection Details</h3>
                </div>
                <div className="p-4 space-y-3">
                    {database.type !== "sqlite" && (
                        <>
                            <div className="flex items-center justify-between py-2 border-b border-border/30">
                                <span className="text-sm text-muted-foreground">Host</span>
                                <span className="text-sm font-mono">{database.host}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-border/30">
                                <span className="text-sm text-muted-foreground">Port</span>
                                <span className="text-sm font-mono">{database.port}</span>
                            </div>
                        </>
                    )}
                    <div className="flex items-center justify-between py-2 border-b border-border/30">
                        <span className="text-sm text-muted-foreground">{database.type === "sqlite" ? "File" : "Database"}</span>
                        <span className="text-sm font-mono">{database.database}</span>
                    </div>
                    {database.type !== "sqlite" && (
                        <div className="flex items-center justify-between py-2 border-b border-border/30">
                            <span className="text-sm text-muted-foreground">User</span>
                            <span className="text-sm font-mono">{database.user}</span>
                        </div>
                    )}
                    <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-muted-foreground">Created</span>
                        <span className="text-sm">
                            {new Date(database.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </div>
        </div>

    );
}