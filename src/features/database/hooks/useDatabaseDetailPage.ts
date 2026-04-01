// features/database/hooks/useDatabaseDetailPage.ts

import { useState } from "react";
import { PanelType } from "@/components/layout/VerticalIconBar";

export const useDatabaseDetailPage = () => {
    const [activePanel, setActivePanel] = useState<PanelType>("data");
    const [migrationsOpen, setMigrationsOpen] = useState(false);
    const [chartOpen, setChartOpen] = useState(false);
    const [insertDialogOpen, setInsertDialogOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => setSidebarOpen((prev) => !prev);

    return {
        activePanel,
        setActivePanel,
        migrationsOpen,
        setMigrationsOpen,
        chartOpen,
        setChartOpen,
        insertDialogOpen,
        setInsertDialogOpen,
        sidebarOpen,
        toggleSidebar,
    };
};