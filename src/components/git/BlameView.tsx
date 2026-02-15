import { useState } from "react";
import {
    FileText,
    User,
    Clock,
    Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";
import { useGitBlame } from "@/hooks/useGitAdvanced";
import type { GitBlameEntry } from "@/types/git";
import { cn } from "@/lib/utils";

interface BlameViewProps {
    projectDir: string | null | undefined;
    /** Relative file path within the repo (e.g. "schema/schema.json") */
    filePath: string | null | undefined;
}

/**
 * Displays line-by-line git blame for a file.
 * Shows author, commit hash, and date for each line.
 */
export default function BlameView({ projectDir, filePath }: BlameViewProps) {
    const { data: blameEntries, isLoading, error } = useGitBlame(projectDir, filePath);
    const [hoveredHash, setHoveredHash] = useState<string | null>(null);

    if (!filePath) {
        return (
            <div className="text-center py-8 text-muted-foreground text-xs">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>Select a file to view blame</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Spinner className="h-5 w-5" />
            </div>
        );
    }

    if (error || !blameEntries || blameEntries.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground text-xs">
                <p>No blame data available</p>
                {error && <p className="text-destructive mt-1">{String(error)}</p>}
            </div>
        );
    }

    // Group consecutive lines by commit hash to reduce visual noise
    const colorMap = new Map<string, string>();
    const colors = [
        "bg-muted/30",
        "bg-muted/10",
    ];
    let colorIndex = 0;
    let lastHash = "";

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
                <FileText className="h-4 w-4 text-primary" />
                <span className="font-mono text-xs truncate">{filePath}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                    {blameEntries.length} lines
                </span>
            </div>

            <div className="border rounded-md overflow-hidden">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full text-xs font-mono">
                        <tbody>
                            {blameEntries.map((entry: GitBlameEntry, i: number) => {
                                // Alternate background by commit block
                                if (entry.hash !== lastHash) {
                                    colorIndex = (colorIndex + 1) % colors.length;
                                    lastHash = entry.hash;
                                }
                                const bgClass = colors[colorIndex];
                                const isFirstInBlock = i === 0 || blameEntries[i - 1].hash !== entry.hash;

                                return (
                                    <tr
                                        key={`${entry.lineNumber}`}
                                        className={cn(
                                            bgClass,
                                            hoveredHash === entry.hash && "!bg-primary/10",
                                            "transition-colors"
                                        )}
                                        onMouseEnter={() => setHoveredHash(entry.hash)}
                                        onMouseLeave={() => setHoveredHash(null)}
                                    >
                                        {/* Blame info (only show for first line in block) */}
                                        <td className="px-2 py-0.5 text-muted-foreground whitespace-nowrap border-r w-[200px] align-top">
                                            {isFirstInBlock ? (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex items-center gap-1.5 cursor-default">
                                                            <span className="text-primary/60">{entry.hash}</span>
                                                            <span className="truncate max-w-[100px]">
                                                                {entry.author}
                                                            </span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right">
                                                        <div className="text-xs space-y-0.5">
                                                            <div className="flex items-center gap-1">
                                                                <Hash className="h-3 w-3" />
                                                                {entry.hash}
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <User className="h-3 w-3" />
                                                                {entry.author}
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {new Date(entry.date).toLocaleString()}
                                                            </div>
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            ) : null}
                                        </td>

                                        {/* Line number */}
                                        <td className="px-2 py-0.5 text-right text-muted-foreground/50 select-none border-r w-[40px]">
                                            {entry.lineNumber}
                                        </td>

                                        {/* Content */}
                                        <td className="px-2 py-0.5 whitespace-pre">
                                            {entry.content}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
