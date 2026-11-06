export interface IndustryValuationConfig {
  effectiveAt: string;
  modelCode: string;
  primaryMetric: string;
  assumedMultipleLow: number | null;
  assumedMultipleHigh: number | null;
  rationale: string | null;
  sourceUrl: string | null;
}
export interface IndustryValuationReview {
  industryCode: string;
  industry: string;
  current: IndustryValuationConfig | null;
  supportedMetrics: Record<string, string[]>;
  canPropose: boolean;
}
export interface IndustryValuationDraft {
  modelCode: string;
  primaryMetric: string;
  assumedMultipleLow: number | null;
  assumedMultipleHigh: number | null;
  asOf: string;
  rationale: string | null;
  sources: Array<{ url: string; title: string; publishedDate: string | null; evidence: string | null }>;
}
export interface IndustryValuationUpdate {
  baseEffectiveAt: string | null;
  modelCode: string;
  primaryMetric: string;
  assumedMultipleLow: number | null;
  assumedMultipleHigh: number | null;
  rationale: string | null;
  sourceUrl: string | null;
}
