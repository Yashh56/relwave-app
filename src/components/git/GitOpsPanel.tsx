import { useState } from "react";
import {
    GitMerge,
    Package,
    History,
    FileSearch,
    Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MergePanel from "./MergePanel";
import StashManagerPanel from "./StashManagerPanel";
import BlameView from "./BlameView";
import SchemaRestoreDialog from "./SchemaRestoreDialog";

interface GitOpsPanelProps {
    projectDir: string | null | undefined;
    currentBranch: string | null;
}

type GitOpsTab = "merge" | "stash" | "blame" | "history";

export default function GitOpsPanel({ projectDir, currentBranch }: GitOpsPanelProps) {
    const [activeTab, setActiveTab] = useState<GitOpsTab>("merge");
    const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
    const [blameFile, setBlameFile] = useState<string>("schema/schema.json");

    return (
        <div className="h-full flex flex-col">
            <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as GitOpsTab)}
                className="flex-1 flex flex-col"
            >
                <div className="border-b px-2">
                    <TabsList className="h-9 w-full justify-start bg-transparent p-0 gap-0">
                        <TabsTrigger
                            value="merge"
                            className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs gap-1 px-3"
                        >
                            <GitMerge className="h-3 w-3" />
                            Merge
                        </TabsTrigger>
                        <TabsTrigger
                            value="stash"
                            className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs gap-1 px-3"
                        >
                            <Package className="h-3 w-3" />
                            Stash
                        </TabsTrigger>
                        <TabsTrigger
                            value="blame"
                            className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs gap-1 px-3"
                        >
                            <FileSearch className="h-3 w-3" />
                            Blame
                        </TabsTrigger>
                        <TabsTrigger
                            value="history"
                            className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs gap-1 px-3"
                        >
                            <History className="h-3 w-3" />
                            Restore
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <TabsContent value="merge" className="mt-0 h-full">
                        <MergePanel
                            projectDir={projectDir}
                            currentBranch={currentBranch}
                        />
                    </TabsContent>

                    <TabsContent value="stash" className="mt-0 h-full">
                        <StashManagerPanel projectDir={projectDir} />
                    </TabsContent>

                    <TabsContent value="blame" className="mt-0 h-full">
                        <div className="p-4 space-y-3">
                            <div className="flex gap-2">
                                <select
                                    value={blameFile}
                                    onChange={(e) => setBlameFile(e.target.value)}
                                    className="flex-1 h-7 text-xs font-mono rounded-md border bg-background px-2"
                                >
                                    <option value="schema/schema.json">schema/schema.json</option>
                                    <option value="diagrams/er.json">diagrams/er.json</option>
                                    <option value="queries/queries.json">queries/queries.json</option>
                                    <option value="relwave.json">relwave.json</option>
                                </select>
                            </div>
                            <BlameView
                                projectDir={projectDir}
                                filePath={blameFile}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="history" className="mt-0 h-full">
                        <div className="p-4 space-y-4">
                            <div className="text-center py-6">
                                <History className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                                <p className="text-sm font-medium mb-1">
                                    Revert & Cherry-Pick
                                </p>
                                <p className="text-xs text-muted-foreground mb-4">
                                    Undo a previous commit or apply changes from another branch.
                                </p>
                                <Button
                                    size="sm"
                                    onClick={() => setRestoreDialogOpen(true)}
                                >
                                    <History className="h-3.5 w-3.5 mr-1.5" />
                                    Open Restore Dialog
                                </Button>
                            </div>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>

            <SchemaRestoreDialog
                open={restoreDialogOpen}
                onOpenChange={setRestoreDialogOpen}
                projectDir={projectDir}
            />
        </div>
    );
}
