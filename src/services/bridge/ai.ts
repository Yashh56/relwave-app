import { bridgeRequest } from "./bridgeClient";

// ── Re-export the types that the frontend needs ───────────────────────────
// (These mirror the bridge types but kept local to avoid importing from bridge)

export type AIProviderName =
  | "anthropic"
  | "openai"
  | "gemini"
  | "groq"
  | "mistral"
  | "ollama";

export interface AISettings {
  defaultProvider: AIProviderName;
  anthropicApiKey?: string;
  openaiApiKey?: string;
  geminiApiKey?: string;
  groqApiKey?: string;
  mistralApiKey?: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
}

export interface SchemaAnalysisInput {
  tables: Array<{
    name: string;
    schema?: string;
    columns: Array<{
      name: string;
      type: string;
      nullable?: boolean;
      isPrimaryKey?: boolean;
      isForeignKey?: boolean;
      references?: { table: string; column: string };
    }>;
    indexes?: string[];
    foreignKeys?: string[];
    constraints?: string[];
  }>;
  databaseType?: string;
}

export interface QueryExplanationInput {
  sql: string;
  schema?: SchemaAnalysisInput["tables"];
  databaseType?: string;
}

export interface ChartRecommendationInput {
  tableName: string;
  columns: Array<{
    name: string;
    type: string;
    isPrimaryKey?: boolean;
    sampleValues?: string[];
  }>;
}

export interface ChartRecommendation {
  chartType: "bar" | "line" | "area" | "pie";
  xAxis: string;
  yAxis: string;
  reasoning: string;
}

// ── AI Settings storage ───────────────────────────────────────────────────

const AI_SETTINGS_KEY = "relwave:ai-settings";

export function loadAISettings(): AISettings {
  try {
    const raw = localStorage.getItem(AI_SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as AISettings;
  } catch { /* ignore */ }
  return { defaultProvider: "ollama" };
}

export function saveAISettings(settings: AISettings): void {
  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
}

// ── Bridge service class ──────────────────────────────────────────────────

class AIService {
  /**
   * Test whether the configured provider is reachable.
   */
  async testConnection(settings: AISettings): Promise<{ connected: boolean; message?: string }> {
    try {
      const result = await bridgeRequest("ai.testConnection", { settings });
      return { connected: true };
    } catch (err: any) {
      return { connected: false, message: err?.message ?? String(err) };
    }
  }

  /**
   * Analyze a database schema. Returns a markdown string.
   */
  async analyzeSchema(settings: AISettings, input: SchemaAnalysisInput): Promise<string> {
    const result = await bridgeRequest("ai.analyzeSchema", { settings, input });
    return result?.data?.markdown ?? "";
  }

  /**
   * Explain a SQL query. Returns a markdown string.
   */
  async explainQuery(settings: AISettings, input: QueryExplanationInput): Promise<string> {
    const result = await bridgeRequest("ai.explainQuery", { settings, input });
    return result?.data?.markdown ?? "";
  }

  /**
   * Recommend a chart type and axes for the given table metadata.
   */
  async recommendChart(
    settings: AISettings,
    input: ChartRecommendationInput
  ): Promise<ChartRecommendation> {
    const result = await bridgeRequest("ai.recommendChart", { settings, input });
    return result?.data as ChartRecommendation;
  }
}

export const aiService = new AIService();
