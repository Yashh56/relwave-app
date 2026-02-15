import {
    Package,
    Trash2,
    Download,
    XCircle,
    Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
    useGitStashList,
    useGitStashApply,
    useGitStashDrop,
    useGitStashClear,
} from "@/hooks/useGitAdvanced";
import { useGitStash } from "@/hooks/useGitQueries";
import { toast } from "sonner";
import type { GitStashEntry } from "@/types/git";
import { useState } from "react";
import { Input } from "@/components/ui/input";

interface StashManagerPanelProps {
    projectDir: string | null | undefined;
}

export default function StashManagerPanel({ projectDir }: StashManagerPanelProps) {
    const { data: stashes, isLoading } = useGitStashList(projectDir);
    const stashMutation = useGitStash(projectDir);
    const applyMutation = useGitStashApply(projectDir);
    const dropMutation = useGitStashDrop(projectDir);
    const clearMutation = useGitStashClear(projectDir);

    const [stashMessage, setStashMessage] = useState("");

    const handleStash = async () => {
        try {
            await stashMutation.mutateAsync(stashMessage.trim() || undefined);
            toast.success("Changes stashed");
            setStashMessage("");
        } catch (e: any) {
            toast.error("Stash failed: " + e.message);
        }
    };

    const handleApply = async (index: number) => {
        try {
            await applyMutation.mutateAsync(index);
            toast.success(`Applied stash@{${index}}`);
        } catch (e: any) {
            toast.error("Apply failed: " + e.message);
        }
    };

    const handleDrop = async (index: number) => {
        try {
            await dropMutation.mutateAsync(index);
            toast.success(`Dropped stash@{${index}}`);
        } catch (e: any) {
            toast.error("Drop failed: " + e.message);
        }
    };

    const handleClearAll = async () => {
        try {
            await clearMutation.mutateAsync();
            toast.success("All stashes cleared");
        } catch (e: any) {
            toast.error("Clear failed: " + e.message);
        }
    };

    return (
        <div className="space-y-4 p-4">
            <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-sm">Stash Manager</h3>
            </div>

            {/* Quick stash */}
            <div className="flex gap-2">
                <Input
                    placeholder="Stash message (optional)..."
                    value={stashMessage}
                    onChange={(e) => setStashMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleStash();
                    }}
                    className="h-7 text-xs"
                />
                <Button
                    size="sm"
                    className="h-7 text-xs shrink-0"
                    onClick={handleStash}
                    disabled={stashMutation.isPending}
                >
                    {stashMutation.isPending ? (
                        <Spinner className="h-3 w-3" />
                    ) : (
                        <Package className="h-3 w-3 mr-1" />
                    )}
                    Stash
                </Button>
            </div>

            {/* Stash list */}
            {isLoading && (
                <div className="flex items-center justify-center py-6">
                    <Spinner className="h-5 w-5" />
                </div>
            )}

            {!isLoading && (!stashes || stashes.length === 0) && (
                <div className="text-center py-6 text-muted-foreground text-xs">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No stashed changes</p>
                </div>
            )}

            {stashes && stashes.length > 0 && (
                <>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {stashes.map((s: GitStashEntry) => (
                            <Card key={s.index} className="p-0">
                                <CardContent className="p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-mono text-muted-foreground">
                                                    stash@{"{" + s.index + "}"}
                                                </span>
                                                {s.date && (
                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                                        <Clock className="h-2.5 w-2.5" />
                                                        {new Date(s.date).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs truncate mt-0.5">
                                                {s.message}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                                onClick={() => handleApply(s.index)}
                                                disabled={applyMutation.isPending}
                                                title="Apply this stash"
                                            >
                                                <Download className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                                onClick={() => handleDrop(s.index)}
                                                disabled={dropMutation.isPending}
                                                title="Drop this stash"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Button
                        variant="destructive"
                        size="sm"
                        className="w-full h-7 text-xs"
                        onClick={handleClearAll}
                        disabled={clearMutation.isPending}
                    >
                        <XCircle className="h-3 w-3 mr-1" />
                        Clear All Stashes
                    </Button>
                </>
            )}
        </div>
    );
}
