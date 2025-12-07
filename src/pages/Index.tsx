import { useState, useEffect } from "react";
import { Database, Plus, Search, Server, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatabaseCard } from "@/components/DatabaseCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { bridgeApi, type DatabaseConnection } from "@/services/bridgeApi";
import { startBridgeListeners, stopBridgeListeners, isBridgeReady } from "@/services/bridgeClient";
import { Checkbox } from "@/components/ui/checkbox";
import { ModeToggle } from "@/components/mode-toggle";
import Loader from "@/components/Loader";

// Type for database stats
interface DatabaseStats {
  total_tables: string;
  total_db_size: string;
  total_db_size_mb: string;
}

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [databases, setDatabases] = useState<DatabaseConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bridgeReady, setBridgeReady] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  // Store stats for each database by ID
  const [databaseStats, setDatabaseStats] = useState<Record<string, DatabaseStats>>({});

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    host: "",
    port: "",
    user: "",
    password: "",
    database: "",
    sslmode: "",
    ssl: false
  });

  // Initialize bridge listeners on mount
  useEffect(() => {
    const initBridge = async () => {
      try {
        await startBridgeListeners();

        // Listen for bridge.ready notification
        const handleBridgeReady = () => {
          console.log('Bridge ready event received');
          setBridgeReady(true);
          loadDatabases();
        };

        window.addEventListener('bridge:bridge.ready', handleBridgeReady);

        // Check if bridge is already ready
        if (isBridgeReady()) {
          setBridgeReady(true);
          loadDatabases();
        }

        return () => {
          window.removeEventListener('bridge:bridge.ready', handleBridgeReady);
          stopBridgeListeners();
        };
      } catch (error: any) {
        console.error('Failed to initialize bridge:', error);
        toast.error("Failed to connect to database bridge", {
          description: error.message
        });
        setLoading(false);
      }
    };

    initBridge();
  }, []);

  const loadDatabases = async () => {
    if (!isBridgeReady()) {
      console.warn('Bridge not ready, skipping database load');
      return;
    }

    try {
      setLoading(true);
      const startTime = performance.now();

      // Load databases list first - this should be fast
      const dbs = await bridgeApi.listDatabases();
      const dbLoadTime = performance.now() - startTime;
      console.log(`Loaded ${dbs.length} databases in ${dbLoadTime.toFixed(0)}ms`);

      setDatabases(dbs);
      setLoading(false); // Show databases immediately

      // Load stats in the background - don't block UI
      if (dbs.length > 0) {
        loadDatabasesStats(dbs);
      }
    } catch (error: any) {
      console.error('Failed to load databases:', error);
      toast.error("Failed to load databases", {
        description: error.message
      });
      setLoading(false);
    }
  };

  const loadDatabasesStats = async (dbs?: DatabaseConnection[]) => {
    const databasesToLoad = dbs || databases;

    if (!isBridgeReady() || databasesToLoad.length === 0) {
      console.warn('Bridge not ready or no databases to load stats for');
      return;
    }

    setStatsLoading(true);
    const startTime = performance.now();

    // Helper to normalize various API shapes into DatabaseStats
    const normalizeStats = (raw: any): DatabaseStats | null => {
      if (!raw) return null;

      // If API returns an array, prefer the first item
      const item = Array.isArray(raw) ? raw[0] : raw;

      if (typeof item !== "object") return null;

      const total_tables = item.total_tables ?? item.totalTables ?? item.tables;
      const total_db_size = item.total_db_size ?? item.totalDbSize ?? item.data_size;
      const total_db_size_mb = item.total_db_size_mb ?? item.totalDbSizeMb ?? item.data_size_mb;

      if (total_tables == null || total_db_size == null || total_db_size_mb == null) {
        return null;
      }

      return {
        total_tables: String(total_tables),
        total_db_size: String(total_db_size),
        total_db_size_mb: String(total_db_size_mb),
      };
    };

    try {
      console.log(`Loading stats for ${databasesToLoad.length} databases...`);

      // Fetch stats for all databases in parallel with error handling
      const statsPromises = databasesToLoad.map(async (db) => {
        try {
          const stats = await bridgeApi.getDatabaseStats(db.id);
          return { id: db.id, stats, error: null };
        } catch (error) {
          console.error(`Failed to load stats for ${db.name}:`, error);
          return { id: db.id, stats: null, error };
        }
      });

      const results = await Promise.all(statsPromises);
      const elapsed = performance.now() - startTime;

      // Count successes and failures
      const successful = results.filter(r => r.stats !== null).length;
      const failed = results.length - successful;
      console.log(
        `Stats loaded in ${elapsed.toFixed(0)}ms: ${successful} successful, ${failed} failed`
      );

      // Update stats state incrementally
      const statsMap: Record<string, DatabaseStats> = {};
      results.forEach(({ id, stats }) => {
        const normalized = normalizeStats(stats);
        if (normalized) {
          statsMap[id] = normalized;
        }
      });

      setDatabaseStats(statsMap);

      if (failed > 0) {
        toast.warning(`Could not load stats for ${failed} database(s)`, {
          description: "Some statistics may be unavailable"
        });
      }
    } catch (error) {
      console.error('Failed to load database stats:', error);
      toast.error("Failed to load database statistics", {
        description: "Statistics will be unavailable"
      });
    } finally {
      setStatsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDatabases();
    setRefreshing(false);
    toast.success("Databases refreshed");
  };

  const filteredDatabases = databases.filter((db) =>
    db.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddDatabase = async () => {
    // Validate required fields
    const required = ["name", "type", "host", "port", "user", "database"];
    const missing = required.filter(field => !formData[field as keyof typeof formData]);

    if (missing.length > 0) {
      toast.error("Missing required fields", {
        description: `Please fill in: ${missing.join(", ")}`
      });
      return;
    }

    try {
      const newDb = await bridgeApi.addDatabase({
        name: formData.name,
        type: formData.type,
        host: formData.host,
        port: parseInt(formData.port),
        user: formData.user,
        ssl: formData.ssl,
        sslmode: formData.ssl ? (formData.sslmode || 'require') : 'disable',
        password: formData.password,
        database: formData.database
      });

      toast.success("Database connection added successfully", {
        description: `${newDb.name} is now available.`
      });

      // Reset form
      setFormData({
        name: "",
        type: "",
        host: "",
        port: "",
        user: "",
        password: "",
        database: "",
        sslmode: "",
        ssl: false
      });

      setIsDialogOpen(false);
      await loadDatabases();
    } catch (error: any) {
      toast.error("Failed to add database", {
        description: error.message
      });
    }
  };

  const handleDeleteDatabase = async (id: string, name: string) => {
    try {
      await bridgeApi.deleteDatabase(id);
      toast.success("Database connection removed", {
        description: `${name} has been deleted.`
      });
      await loadDatabases();
    } catch (error: any) {
      toast.error("Failed to delete database", {
        description: error.message
      });
    }
  };

  const handleTestConnection = async (id: string, name: string) => {
    try {
      const result = await bridgeApi.testConnection(id);
      if (result.ok) {
        toast.success("Connection successful", {
          description: `Successfully connected to ${name}`
        });
      } else {
        toast.error("Connection failed", {
          description: result.message || "Could not connect to database"
        });
      }
    } catch (error: any) {
      toast.error("Connection test failed", {
        description: error.message
      });
    }
  };

  // Calculate aggregate stats
  const connectedCount = databases.length;
  const totalTables = Object.values(databaseStats).reduce((sum, stats) => {
    return sum + parseInt(stats.total_tables || '0');
  }, 0);
  const totalSizeMB = Object.values(databaseStats).reduce((sum, stats) => {
    return sum + parseFloat(stats.total_db_size_mb || '0');
  }, 0);
  const totalSize = totalSizeMB > 1024
    ? `${(totalSizeMB / 1024).toFixed(2)} GB`
    : `${totalSizeMB.toFixed(2)} MB`;

  // Show bridge initialization status
  if (!bridgeReady && loading) {
    return (
      <div className="h-screen bg-background text-foreground flex items-center justify-center overflow-hidden">
        <div className="text-center">
          <Loader />
          <h2 className="text-xl font-semibold mb-2 text-foreground">Initializing Database Bridge</h2>
          <p className="text-muted-foreground">Please wait while we connect to the bridge...</p>
        </div>
      </div>
    );
  }

  // Show error if bridge failed to initialize
  if (!bridgeReady && !loading) {
    return (
      <div className="h-screen bg-background text-foreground flex items-center justify-center overflow-hidden">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2 text-foreground">Bridge Connection Failed</h2>
          <p className="text-muted-foreground mb-4">
            Could not connect to the database bridge. Please restart the application.
          </p>
          <Button onClick={() => window.location.reload()} className="bg-primary hover:bg-primary/90">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background dark:bg-[#050505] text-foreground overflow-hidden">
      {/* IMPROVED HEADER: No gradients, clean solid accent color for branding */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50 shadow-sm dark:shadow-md flex-shrink-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Solid Cyan Icon Background */}
              <div className="p-3 bg-cyan-500 rounded-xl shadow-lg">
                <Server className="h-6 w-6 text-white" />
              </div>
              <div>
                {/* Solid Cyan Text Title */}
                <h1 className="text-3xl font-extrabold text-cyan-500">
                  Data Portal
                </h1>
                <p className="text-sm text-muted-foreground">Manage and visualize your connections</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ModeToggle />
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing}
                className="hover:border-primary hover:bg-accent transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  {/* Solid Cyan Button (formerly gradient) */}
                  <Button className="bg-cyan-500 hover:bg-cyan-600 transition-all shadow-lg shadow-cyan-500/30">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Connection
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] bg-background border-border rounded-xl shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-foreground">
                      Add New Database Connection 🔌
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Connect to a local, Docker, or remote database instance.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-5 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="db-name" className="text-foreground">Connection Name</Label>
                      <Input
                        id="db-name"
                        placeholder="My Production DB"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="bg-input/50 border-border focus:border-primary text-foreground transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="db-type" className="text-foreground">Database Type</Label>
                      <Select value={formData.type} onValueChange={(val) => handleInputChange('type', val)}>
                        <SelectTrigger id="db-type" className="bg-input/50 border-border focus:border-primary text-foreground transition-colors">
                          <SelectValue placeholder="Select database type" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border text-foreground shadow-xl">
                          <SelectItem value="postgresql">PostgreSQL</SelectItem>
                          <SelectItem value="mysql">MySQL</SelectItem>
                          <SelectItem value="mongodb">MongoDB</SelectItem>
                          <SelectItem value="sqlite">SQLite</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="host" className="text-foreground">Host</Label>
                        <Input
                          id="host"
                          placeholder="localhost"
                          value={formData.host}
                          onChange={(e) => handleInputChange('host', e.target.value)}
                          className="bg-input/50 border-border focus:border-primary text-foreground transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="port" className="text-foreground">Port</Label>
                        <Input
                          id="port"
                          placeholder="5432"
                          value={formData.port}
                          onChange={(e) => handleInputChange('port', e.target.value)}
                          className="bg-input/50 border-border focus:border-primary text-foreground transition-colors"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-foreground">Username</Label>
                        <Input
                          id="username"
                          placeholder="postgres"
                          value={formData.user}
                          onChange={(e) => handleInputChange('user', e.target.value)}
                          className="bg-input/50 border-border focus:border-primary text-foreground transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-foreground">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                          className="bg-input/50 border-border focus:border-primary text-foreground transition-colors"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="database" className="text-foreground">Database Name</Label>
                      <Input
                        id="database"
                        placeholder="myapp_db"
                        value={formData.database}
                        onChange={(e) => handleInputChange('database', e.target.value)}
                        className="bg-input/50 border-border focus:border-primary text-foreground transition-colors"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ssl"
                        checked={formData.ssl}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ssl: checked as boolean }))}
                      />
                      <Label htmlFor="ssl" className="text-foreground cursor-pointer">
                        Enable SSL Connection
                      </Label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="border-border hover:bg-accent transition-colors"
                    >
                      Cancel
                    </Button>
                    {/* Solid Cyan Button (formerly gradient) */}
                    <Button
                      onClick={handleAddDatabase}
                      className="bg-cyan-500 hover:bg-cyan-600 transition-all shadow-md shadow-cyan-500/30"
                    >
                      Connect
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="grow overflow-y-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {/* Card 1: Total Connections (Cyan) */}
            <Card className="shadow-elevated hover:border-cyan-500/50 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-cyan-500/20 rounded-xl">
                    <Database className="h-6 w-6 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-extrabold text-foreground">{databases.length}</p>
                    <p className="text-sm text-muted-foreground">Total Connections</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Active Connections (Emerald) */}
            <Card className="shadow-elevated hover:border-emerald-500/50 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/20 rounded-xl">
                    <Database className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-extrabold text-foreground">{connectedCount}</p>
                    <p className="text-sm text-muted-foreground">Active Connections</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Total Tables (Violet) */}
            <Card className="shadow-elevated hover:border-violet-500/50 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-violet-500/20 rounded-xl">
                    <Database className="h-6 w-6 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-extrabold text-foreground">
                      {statsLoading ? "..." : totalTables}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Schemas/Tables</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Total Data Size (Amber) */}
            <Card className="shadow-elevated hover:border-amber-500/50 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-500/20 rounded-xl">
                    <Database className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-extrabold text-foreground">
                      {statsLoading ? "..." : totalSize}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Data Size</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-8">
            <div className="relative max-w-full lg:max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by connection name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-input/50 border-border text-foreground focus:border-primary transition-colors"
              />
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-6 text-foreground">Active Connections</h2>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                {filteredDatabases.map((db) => {
                  return (
                    <DatabaseCard
                      key={db.id}
                      id={db.id}
                      name={db.name}
                      type={db.type}
                      status="connected"
                      host={`${db.host}:${db.port}`}
                      onDelete={() => handleDeleteDatabase(db.id, db.name)}
                      onTest={() => handleTestConnection(db.id, db.name)}
                    />
                  );
                })}
              </div>

              {filteredDatabases.length === 0 && (
                <div className="text-center py-20 border border-dashed border-border rounded-xl mt-8">
                  <Database className="h-16 w-16 text-muted-foreground/50 mx-auto mb-6" />
                  <h3 className="text-xl font-semibold mb-3 text-foreground">
                    {databases.length === 0 ? 'No connections yet' : 'No matching connections found'}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {databases.length === 0
                      ? 'Get started by adding your first database connection.'
                      : 'Try adjusting your search or create a new database connection.'}
                  </p>
                  <Button
                    onClick={() => setIsDialogOpen(true)}
                    // Solid Cyan Button (formerly gradient)
                    className="bg-cyan-500 hover:bg-cyan-600 transition-all shadow-lg shadow-cyan-500/30"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Connection
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;