export type ProjectType = "telegram_bot" | "web_app" | "b2b_platform" | "ai_integration";

export type Feature =
  | "auth"
  | "payments"
  | "admin_panel"
  | "analytics"
  | "api_integration"
  | "ai_features"
  | "realtime"
  | "file_storage";

export type Timeline = "urgent" | "normal" | "relaxed";

export interface CalculatorState {
  step: number;
  projectType: ProjectType | null;
  features: Feature[];
  timeline: Timeline | null;
}

export interface CalculatorResult {
  minCost: number;
  maxCost: number;
  minWeeks: number;
  maxWeeks: number;
}
