import { useState } from "react";
import {
    RotateCcw,
    ChevronDown,
    History,
    Check,
    Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { useGitLog } from "@/hooks/useGitQueries";
import { useGitRevert, useGitCherryPick } from "@/hooks/useGitAdvanced";
import { toast } from "sonner";
import type { GitLogEntry } from "@/types/git";

interface SchemaRestoreDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectDir: string | null | undefined;
}

export default function SchemaRestoreDialog({
    open,
    onOpenChange,
    projectDir,
}: SchemaRestoreDialogProps) {
    const { data: log, isLoading } = useGitLog(open ? projectDir : undefined, 50);
    const revertMutation = useGitRevert(projectDir);
    const cherryPickMutation = useGitCherryPick(projectDir);

    const [selectedCommit, setSelectedCommit] = useState<GitLogEntry | null>(null);
    const [action, setAction] = useState<"revert" | "cherry-pick">("revert");

    const handleExecute = async () => {
        if (!selectedCommit) return;
        try {
            if (action === "revert") {
                await revertMutation.mutateAsync({ hash: selectedCommit.fullHash });
                toast.success(`Reverted commit ${selectedCommit.hash}`);
            } else {
                await cherryPickMutation.mutateAsync({ hash: selectedCommit.fullHash });
                toast.success(`Cherry-picked commit ${selectedCommit.hash}`);
            }
            setSelectedCommit(null);
            onOpenChange(false);
        } catch (e: any) {
            toast.error(`${action === "revert" ? "Revert" : "Cherry-pick"} failed: ${e.message}`);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Restore / Cherry-Pick
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                    {/* Action selector */}
                    <div className="flex gap-2">
                        <Button
                            variant={action === "revert" ? "default" : "outline"}
                            size="sm"
                            className="h-7 text-xs flex-1"
                            onClick={() => setAction("revert")}
                        >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Revert
                        </Button>
                        <Button
                            variant={action === "cherry-pick" ? "default" : "outline"}
                            size="sm"
                            className="h-7 text-xs flex-1"
                            onClick={() => setAction("cherry-pick")}
                        >
                            <Check className="h-3 w-3 mr-1" />
                            Cherry-Pick
                        </Button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        {action === "revert"
                            ? "Create a new commit that undoes the changes from a previous commit."
                            : "Apply the changes from a specific commit onto the current branch."}
                    </p>

                    {/* Commit picker */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-6">
                            <Spinner className="h-5 w-5" />
                        </div>
                    ) : (
                        <div className="max-h-[280px] overflow-y-auto space-y-1 border rounded-md p-1">
                            {log?.map((entry: GitLogEntry) => (
                                <button
                                    key={entry.fullHash}
                                    onClick={() => setSelectedCommit(entry)}
                                    className={`w-full text-left p-2 rounded text-xs hover:bg-muted/50 transition-colors ${
                                        selectedCommit?.fullHash === entry.fullHash
                                            ? "bg-primary/10 border border-primary/20"
                                            : ""
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-primary shrink-0">
                                            {entry.hash}
                                        </span>
                                        <span className="truncate flex-1">
                                            {entry.subject}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5 text-muted-foreground text-[10px]">
                                        <span>{entry.author}</span>
                                        <span>{new Date(entry.date).toLocaleDateString()}</span>
                                    </div>
                                </button>
                            ))}
                            {(!log || log.length === 0) && (
                                <div className="text-center py-4 text-muted-foreground text-xs">
                                    No commits found
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleExecute}
                        disabled={
                            !selectedCommit ||
                            revertMutation.isPending ||
                            cherryPickMutation.isPending
                        }
                    >
                        {(revertMutation.isPending || cherryPickMutation.isPending) ? (
                            <Spinner className="h-3.5 w-3.5 mr-1.5" />
                        ) : action === "revert" ? (
                            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                        ) : (
                            <Check className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        {action === "revert" ? "Revert Commit" : "Cherry-Pick Commit"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
