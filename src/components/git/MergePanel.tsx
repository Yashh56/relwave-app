import { useState } from "react";
import {
    GitMerge,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    FileWarning,
    ChevronDown,
    RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import {
    useGitMerge,
    useGitAbortMerge,
    useGitAbortRebase,
    useGitContinueRebase,
    useGitMergeState,
    useGitMarkResolved,
    useGitRebase,
} from "@/hooks/useGitAdvanced";
import { useGitBranches, useGitCommit, useGitStageAll } from "@/hooks/useGitQueries";
import { toast } from "sonner";
import type { GitBranchInfo, GitMergeState } from "@/types/git";
import { cn } from "@/lib/utils";

interface MergePanelProps {
    projectDir: string | null | undefined;
    currentBranch: string | null;
}

export default function MergePanel({ projectDir, currentBranch }: MergePanelProps) {
    const { data: branches } = useGitBranches(projectDir);
    const { data: mergeState } = useGitMergeState(projectDir);

    const mergeMutation = useGitMerge(projectDir);
    const rebaseMutation = useGitRebase(projectDir);
    const abortMergeMutation = useGitAbortMerge(projectDir);
    const abortRebaseMutation = useGitAbortRebase(projectDir);
    const continueRebaseMutation = useGitContinueRebase(projectDir);
    const markResolvedMutation = useGitMarkResolved(projectDir);
    const stageAllMutation = useGitStageAll(projectDir);
    const commitMutation = useGitCommit(projectDir);

    const [selectedBranch, setSelectedBranch] = useState("");
    const [mode, setMode] = useState<"merge" | "rebase">("merge");

    const otherBranches = branches?.filter((b: GitBranchInfo) => !b.current) || [];
    const isInProgress = mergeState?.mergeInProgress || mergeState?.rebaseInProgress;
    const conflictedFiles = mergeState?.conflictedFiles || [];

    const handleMerge = async () => {
        if (!selectedBranch) return;
        try {
            if (mode === "merge") {
                await mergeMutation.mutateAsync({ branch: selectedBranch, noFF: true });
                toast.success(`Merged ${selectedBranch} into ${currentBranch}`);
            } else {
                await rebaseMutation.mutateAsync(selectedBranch);
                toast.success(`Rebased onto ${selectedBranch}`);
            }
            setSelectedBranch("");
        } catch (e: any) {
            toast.error(`${mode === "merge" ? "Merge" : "Rebase"} failed: ${e.message}`);
        }
    };

    const handleAbort = async () => {
        try {
            if (mergeState?.mergeInProgress) {
                await abortMergeMutation.mutateAsync();
                toast.success("Merge aborted");
            } else if (mergeState?.rebaseInProgress) {
                await abortRebaseMutation.mutateAsync();
                toast.success("Rebase aborted");
            }
        } catch (e: any) {
            toast.error("Abort failed: " + e.message);
        }
    };

    const handleContinueRebase = async () => {
        try {
            await continueRebaseMutation.mutateAsync();
            toast.success("Rebase continued");
        } catch (e: any) {
            toast.error("Continue failed: " + e.message);
        }
    };

    const handleMarkAllResolved = async () => {
        if (conflictedFiles.length === 0) return;
        try {
            await markResolvedMutation.mutateAsync(conflictedFiles);
            toast.success("All files marked as resolved");
        } catch (e: any) {
            toast.error("Failed to mark resolved: " + e.message);
        }
    };

    const handleFinalizeMerge = async () => {
        try {
            await stageAllMutation.mutateAsync();
            await commitMutation.mutateAsync(`Merge completed`);
            toast.success("Merge commit created");
        } catch (e: any) {
            toast.error("Finalize failed: " + e.message);
        }
    };

    return (
        <div className="space-y-4 p-4">
            <div className="flex items-center gap-2">
                <GitMerge className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-sm">Merge & Rebase</h3>
            </div>

            {/* In-progress conflict resolution */}
            {isInProgress && (
                <Card className="border-orange-500/30 bg-orange-500/5">
                    <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm flex items-center gap-2 text-orange-500">
                            <AlertTriangle className="h-4 w-4" />
                            {mergeState?.mergeInProgress ? "Merge" : "Rebase"} in Progress
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3 space-y-3">
                        {conflictedFiles.length > 0 ? (
                            <>
                                <p className="text-xs text-muted-foreground">
                                    {conflictedFiles.length} file{conflictedFiles.length !== 1 ? "s" : ""} with conflicts:
                                </p>
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {conflictedFiles.map((f) => (
                                        <div
                                            key={f}
                                            className="flex items-center gap-2 text-xs font-mono p-1.5 rounded bg-muted/50"
                                        >
                                            <FileWarning className="h-3 w-3 text-orange-500 shrink-0" />
                                            <span className="truncate">{f}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <Button
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={handleMarkAllResolved}
                                        disabled={markResolvedMutation.isPending}
                                    >
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Mark All Resolved
                                    </Button>
                                    {mergeState?.mergeInProgress && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs"
                                            onClick={handleFinalizeMerge}
                                        >
                                            <GitMerge className="h-3 w-3 mr-1" />
                                            Finalize Merge
                                        </Button>
                                    )}
                                    {mergeState?.rebaseInProgress && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs"
                                            onClick={handleContinueRebase}
                                            disabled={continueRebaseMutation.isPending}
                                        >
                                            <RotateCcw className="h-3 w-3 mr-1" />
                                            Continue Rebase
                                        </Button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-2 text-xs text-green-500">
                                <CheckCircle2 className="h-3 w-3" />
                                All conflicts resolved. Finalize the merge/rebase.
                            </div>
                        )}

                        <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 text-xs w-full"
                            onClick={handleAbort}
                            disabled={abortMergeMutation.isPending || abortRebaseMutation.isPending}
                        >
                            <XCircle className="h-3 w-3 mr-1" />
                            Abort {mergeState?.mergeInProgress ? "Merge" : "Rebase"}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Start new merge/rebase */}
            {!isInProgress && (
                <Card>
                    <CardContent className="p-4 space-y-3">
                        <div className="flex gap-2">
                            <Button
                                variant={mode === "merge" ? "default" : "outline"}
                                size="sm"
                                className="h-7 text-xs flex-1"
                                onClick={() => setMode("merge")}
                            >
                                Merge
                            </Button>
                            <Button
                                variant={mode === "rebase" ? "default" : "outline"}
                                size="sm"
                                className="h-7 text-xs flex-1"
                                onClick={() => setMode("rebase")}
                            >
                                Rebase
                            </Button>
                        </div>

                        <div className="text-xs text-muted-foreground">
                            {mode === "merge"
                                ? `Merge a branch into ${currentBranch || "current branch"}`
                                : `Rebase ${currentBranch || "current branch"} onto another branch`}
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-between font-mono text-xs h-8"
                                >
                                    {selectedBranch || "Select branch..."}
                                    <ChevronDown className="h-3 w-3 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="max-h-48 overflow-y-auto">
                                {otherBranches.map((b: GitBranchInfo) => (
                                    <DropdownMenuItem
                                        key={b.name}
                                        onClick={() => setSelectedBranch(b.name)}
                                        className="font-mono text-xs"
                                    >
                                        {b.name}
                                    </DropdownMenuItem>
                                ))}
                                {otherBranches.length === 0 && (
                                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                        No other branches
                                    </div>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            size="sm"
                            className="w-full h-8 text-xs"
                            onClick={handleMerge}
                            disabled={
                                !selectedBranch ||
                                mergeMutation.isPending ||
                                rebaseMutation.isPending
                            }
                        >
                            {(mergeMutation.isPending || rebaseMutation.isPending) ? (
                                <Spinner className="h-3 w-3 mr-1.5" />
                            ) : (
                                <GitMerge className="h-3 w-3 mr-1.5" />
                            )}
                            {mode === "merge" ? "Merge" : "Rebase"}
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
