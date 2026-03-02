import type { ProjectType, Feature, Timeline, CalculatorResult } from "@/types/calculator";

const BASE_COSTS: Record<ProjectType, number> = {
  telegram_bot: 150000,
  web_app: 300000,
  b2b_platform: 500000,
  ai_integration: 400000,
};

const FEATURE_COSTS: Record<Feature, number> = {
  auth: 50000,
  payments: 80000,
  admin_panel: 100000,
  analytics: 70000,
  api_integration: 60000,
  ai_features: 120000,
  realtime: 90000,
  file_storage: 40000,
};

const TIMELINE_MULTIPLIERS: Record<Timeline, number> = {
  urgent: 1.5,
  normal: 1.0,
  relaxed: 0.85,
};

const BASE_WEEKS: Record<ProjectType, number> = {
  telegram_bot: 3,
  web_app: 6,
  b2b_platform: 10,
  ai_integration: 8,
};

const FEATURE_WEEKS: Record<Feature, number> = {
  auth: 1,
  payments: 1.5,
  admin_panel: 2,
  analytics: 1.5,
  api_integration: 1,
  ai_features: 2,
  realtime: 1.5,
  file_storage: 0.5,
};

export function calculateProject(
  projectType: ProjectType,
  features: Feature[],
  timeline: Timeline
): CalculatorResult {
  const baseCost = BASE_COSTS[projectType];
  const featureCost = features.reduce((sum, f) => sum + FEATURE_COSTS[f], 0);
  const totalCost = (baseCost + featureCost) * TIMELINE_MULTIPLIERS[timeline];

  const baseWeeks = BASE_WEEKS[projectType];
  const featureWeeks = features.reduce((sum, f) => sum + FEATURE_WEEKS[f], 0);
  const totalWeeks = baseWeeks + featureWeeks;

  const variance = 0.2;

  return {
    minCost: Math.round(totalCost * (1 - variance)),
    maxCost: Math.round(totalCost * (1 + variance)),
    minWeeks: Math.round(totalWeeks * (1 - variance)),
    maxWeeks: Math.round(totalWeeks * (1 + variance)),
  };
}
