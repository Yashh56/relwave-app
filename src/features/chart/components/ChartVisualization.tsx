import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart3, Download, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChartConfigPanel } from "./ChartConfigPanel";
import ChartRenderer from "./ChartRenderer";
import { useChartVisualization } from "../hooks/useChartVisualization";
import { SelectedTable } from "@/features/database/types";


interface ChartVisualizationProps {
  selectedTable: SelectedTable;
  dbId?: string;
}


export const ChartVisualization = ({ selectedTable, dbId }: ChartVisualizationProps) => {



  const { handleExport, chartType, chartTitle, setChartTitle, setChartType, xAxis, yAxis, setXAxis, setYAxis, columnData, isExecuting, errorMessage, rowData } = useChartVisualization(selectedTable, dbId);



  return (
    <div className="space-y-4">
      {/* Config Panel */}
      <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground">Configure Chart</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                <Download className="h-3 w-3" />
                Export
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("png")} className="text-xs">
                Export as PNG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("svg")} className="text-xs">
                Export as SVG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ChartConfigPanel
          chartType={chartType}
          setChartType={setChartType}
          xAxis={xAxis}
          setXAxis={setXAxis}
          yAxis={yAxis}
          setYAxis={setYAxis}
          chartTitle={chartTitle}
          setChartTitle={setChartTitle}
          columns={columnData}
        />
      </div>

      {/* Chart Container */}
      <div
        id="chart-container"
        className="rounded-lg border border-border/50 bg-background p-5"
      >
        {chartTitle && (
          <h3 className="text-xs font-medium text-center text-muted-foreground mb-4">
            {chartTitle}
          </h3>
        )}

        {isExecuting ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary/60 mb-3" />
            <p className="text-xs text-muted-foreground">Processing data...</p>
          </div>
        ) : errorMessage ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-destructive/10 p-3 mb-3">
              <BarChart3 className="h-5 w-5 text-destructive/70" />
            </div>
            <p className="text-xs text-destructive/80 font-medium">{errorMessage}</p>
          </div>
        ) : !rowData.length ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted/50 p-3 mb-3">
              <BarChart3 className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <p className="text-xs text-muted-foreground">Select axes to visualize data</p>
          </div>
        ) : (
          <ChartRenderer
            chartType={chartType}
            xAxis={xAxis}
            yAxis={yAxis}
            data={rowData}
          />
        )}
      </div>
    </div>
  );
};