import { FolderOpen, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "@/components/ui/empty";

interface ProjectsEmptyStateProps {
    hasProjects: boolean;
    onCreateClick: () => void;
    onImportClick: () => void;
}

export function ProjectsEmptyState({ hasProjects, onCreateClick, onImportClick }: ProjectsEmptyStateProps) {
    if (!hasProjects) {
        return (
            <Empty className="h-full flex flex-col items-center justify-center p-6">
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <FolderOpen />
                    </EmptyMedia>
                    <EmptyTitle>No Projects Yet</EmptyTitle>
                    <EmptyDescription>
                        You haven&apos;t created any projects yet. Get started by creating
                        your first project.
                    </EmptyDescription>
                </EmptyHeader>

                {!hasProjects && (
                    <EmptyContent className="flex-row">
                        <Button onClick={onCreateClick} className="mt-4">
                            <Sparkles className="h-4 w-4 mr-2" />
                            Create Your First Project
                        </Button>
                        <Button variant="outline" onClick={onImportClick} className="mt-4">
                            <Upload className="h-4 w-4 mr-2" />
                            Import Project
                        </Button>
                    </EmptyContent>
                )}
            </Empty>
        )
    }
    return (
        <div className="h-full flex flex-col items-center justify-center p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FolderOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                        Projects
                    </h3>
                    <p className="leading-1 not-first:mt-4">
                        Save database details, ER diagrams &amp; queries offline
                    </p>
                </div>
            </div>
        </div>
    )
}
