import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, ScatterChart as ScatterChartIcon } from "lucide-react";
import { toPng, toSvg } from "html-to-image";
import { toast } from "sonner";

// Adjusted COLORS for a vibrant, yet professional palette, optimized for light/dark contrast
const COLORS = ["#06B6D4", "#A855F7", "#10B981", "#F59E0B", "#EF4444", "#52525B"]; // Cyan, Violet, Emerald, Amber, Red, Gray

interface ChartVisualizationProps {
  data: Array<Record<string, any>>;
}

export const ChartVisualization = ({ data }: ChartVisualizationProps) => {
  const [chartType, setChartType] = useState<"bar" | "line" | "pie" | "scatter">("bar");
  const [xAxis, setXAxis] = useState("");
  const [yAxis, setYAxis] = useState("");
  const [chartTitle, setChartTitle] = useState("Query Results Visualization");

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  const handleExport = async (format: "png" | "svg") => {
    const chartElement = document.getElementById("chart-container");
    if (!chartElement) return;

    try {
      // Determine background based on current theme (simple detection based on dark class presence)
      const isDarkMode = chartElement.closest('.dark');
      const backgroundColor = isDarkMode ? "#050505" : "#FFFFFF"; // Use app background

      const dataUrl = format === "png"
        ? await toPng(chartElement, { quality: 0.95, backgroundColor })
        : await toSvg(chartElement, { backgroundColor });

      const link = document.createElement("a");
      link.download = `chart-${Date.now()}.${format}`;
      link.href = dataUrl;
      link.click();

      toast.success(`Chart exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error("Failed to export chart");
      console.error(error);
    }
  };

  const renderChart = () => {
    if (!xAxis || !yAxis) {
      return (
        <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
          <BarChart3 className="h-10 w-10 mb-3" />
          <p className="text-lg font-semibold">Configure axes to generate chart</p>
          <p className="text-sm">Select both X and Y columns to plot your data.</p>
        </div>
      );
    }

    const chartData = data.map((row) => ({
      x: row[xAxis],
      y: Number(row[yAxis]) || 0,
    }));

    // Dynamically set Recharts theme based on the presence of the 'dark' class on the body (or parent container)
    // This is a proxy for the actual theme setting.
    const isDarkMode = document.body.classList.contains('dark');

    const rechartsTheme = {
      stroke: isDarkMode ? "#E5E7EB" : "#1F2937", // Axes/Tick color
      gridStroke: isDarkMode ? "#374151" : "#E5E7EB", // Grid line color
      tooltipBg: isDarkMode ? "#1F2937" : "#FFFFFF", // Tooltip background
      tooltipBorder: isDarkMode ? "#4B5563" : "#D1D5DB", // Tooltip border
      lineStroke: COLORS[0], // Primary color for lines/bars
    };


    switch (chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={rechartsTheme.gridStroke} />
              <XAxis dataKey="x" stroke={rechartsTheme.stroke} tick={{ fill: rechartsTheme.stroke }} />
              <YAxis stroke={rechartsTheme.stroke} tick={{ fill: rechartsTheme.stroke }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: rechartsTheme.tooltipBg,
                  border: `1px solid ${rechartsTheme.tooltipBorder}`,
                  borderRadius: "8px",
                  color: rechartsTheme.stroke,
                }}
              />
              <Legend wrapperStyle={{ color: rechartsTheme.stroke, paddingTop: '10px' }} />
              <Bar dataKey="y" name={yAxis}>
                {/* Individual coloring for aesthetic appeal */}
                {chartData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={rechartsTheme.gridStroke} />
              <XAxis dataKey="x" stroke={rechartsTheme.stroke} tick={{ fill: rechartsTheme.stroke }} />
              <YAxis stroke={rechartsTheme.stroke} tick={{ fill: rechartsTheme.stroke }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: rechartsTheme.tooltipBg,
                  border: `1px solid ${rechartsTheme.tooltipBorder}`,
                  borderRadius: "8px",
                  color: rechartsTheme.stroke,
                }}
              />
              <Legend wrapperStyle={{ color: rechartsTheme.stroke, paddingTop: '10px' }} />
              <Line type="monotone" dataKey="y" stroke={rechartsTheme.lineStroke} strokeWidth={3} name={yAxis} dot={{ fill: rechartsTheme.lineStroke, r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ x, percent = 0 }) => `${x} (${(percent * 100).toFixed(0)}%)`} // Label with percentage
                outerRadius={120}
                dataKey="y"
              >
                {chartData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={rechartsTheme.tooltipBg} strokeWidth={3} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: rechartsTheme.tooltipBg,
                  border: `1px solid ${rechartsTheme.tooltipBorder}`,
                  borderRadius: "8px",
                  color: rechartsTheme.stroke,
                }}
              />
              <Legend wrapperStyle={{ color: rechartsTheme.stroke, paddingTop: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        );

      case "scatter":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={rechartsTheme.gridStroke} />
              <XAxis dataKey="x" stroke={rechartsTheme.stroke} tick={{ fill: rechartsTheme.stroke }} />
              <YAxis dataKey="y" stroke={rechartsTheme.stroke} tick={{ fill: rechartsTheme.stroke }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: rechartsTheme.tooltipBg,
                  border: `1px solid ${rechartsTheme.tooltipBorder}`,
                  borderRadius: "8px",
                  color: rechartsTheme.stroke,
                }}
              />
              <Legend wrapperStyle={{ color: rechartsTheme.stroke, paddingTop: '10px' }} />
              <Scatter name={yAxis} data={chartData} fill={rechartsTheme.lineStroke} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    // Applied clean card styling: bg-card, border-border, shadow-elevated
    <Card className="bg-card border border-border rounded-xl shadow-elevated">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-xl text-foreground">Chart Visualization</CardTitle>
            <CardDescription className="text-muted-foreground">Generate charts from your query results</CardDescription>
          </div>
          {/* Export Buttons: Using standard outline style with theme hover */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport("png")} className="border-border hover:bg-accent transition-colors">
              <Download className="h-4 w-4 mr-2" />
              Export PNG
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport("svg")} className="border-border hover:bg-accent transition-colors">
              <Download className="h-4 w-4 mr-2" />
              Export SVG
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Configuration - Fully Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Chart Type Select */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Chart Type</Label>
            <Select value={chartType} onValueChange={(val: any) => setChartType(val)}>
              {/* Select Trigger: Uses bg-input, focus:border-primary */}
              <SelectTrigger className="bg-input border-border text-foreground focus:border-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-foreground">
                <SelectItem value="bar">
                  <div className="flex items-center gap-2 text-cyan-400"> <BarChart3 className="h-4 w-4" /> Bar Chart </div>
                </SelectItem>
                <SelectItem value="line">
                  <div className="flex items-center gap-2 text-violet-400"> <LineChartIcon className="h-4 w-4" /> Line Chart </div>
                </SelectItem>
                <SelectItem value="pie">
                  <div className="flex items-center gap-2 text-emerald-400"> <PieChartIcon className="h-4 w-4" /> Pie Chart </div>
                </SelectItem>
                <SelectItem value="scatter">
                  <div className="flex items-center gap-2 text-amber-400"> <ScatterChartIcon className="h-4 w-4" /> Scatter Plot </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* X Axis Select */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">X Axis</Label>
            <Select value={xAxis} onValueChange={setXAxis}>
              {/* Select Trigger: Uses bg-input, focus:border-primary */}
              <SelectTrigger className="bg-input border-border text-foreground focus:border-primary">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-foreground">
                {columns.map((col) => (
                  <SelectItem key={col} value={col}> {col} </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Y Axis Select */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Y Axis</Label>
            <Select value={yAxis} onValueChange={setYAxis}>
              {/* Select Trigger: Uses bg-input, focus:border-primary */}
              <SelectTrigger className="bg-input border-border text-foreground focus:border-primary">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-foreground">
                {columns.map((col) => (
                  <SelectItem key={col} value={col}> {col} </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Chart Title Input */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Chart Title</Label>
            <Input
              value={chartTitle}
              onChange={(e) => setChartTitle(e.target.value)}
              placeholder="Enter title"
              // Input: Uses bg-input, focus:border-primary
              className="bg-input border-border text-foreground focus:border-primary"
            />
          </div>
        </div>

        {/* Chart Display Area - High contrast container */}
        {/* Ensure chart container uses theme colors for high contrast */}
        <div id="chart-container" className="bg-background border border-border rounded-xl p-6 shadow-xl relative min-h-[400px]">
          <h3 className="text-lg font-semibold text-center mb-4 text-foreground">{chartTitle}</h3>
          {renderChart()}
        </div>
      </CardContent>
    </Card>
  );
};