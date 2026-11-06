import { Financials, ValuationResult } from "./valuation";

export type MetricStatus = "AVAILABLE" | "STALE" | "INSUFFICIENT_DATA" | "UNVERIFIED" | "NOT_APPLICABLE";
export interface AnalysisReportRequest { figi: string; valuationDate?: string; }
export interface AnalysisReason { code: string; component: string; message: string; params?: Record<string, unknown>; }
export interface MetricResult<T> { status: MetricStatus; value: T | null; reasons: AnalysisReason[]; lastKnown?: T | null; }

export interface NormalizedBar {
  sessionDate: string; open: number; high: number; low: number; close: number; volume: MetricResult<number>;
}
export interface AtrPoint { sessionDate: string; period: number; atr: number; atrPercent: number; seedDate: string; trCount: number; warmupCount: number; }
export interface StructureTrend { state: string; asOf: string; highRelation?: string | null; lowRelation?: string | null; pivotIds: string[]; lastTransitionAt?: string | null; }
export interface TimeframeStructure {
  timeframe: "DAILY" | "WEEKLY" | "MONTHLY"; bars: NormalizedBar[]; atr14: MetricResult<AtrPoint>;
  highRelation: MetricResult<string>; lowRelation: MetricResult<string>; minorTrend: MetricResult<StructureTrend>; majorTrend: MetricResult<StructureTrend>;
  reasons: AnalysisReason[];
}
export interface PriceStructure { figi: string; priceDataThrough: string; timeframes: TimeframeStructure[]; reasons: AnalysisReason[]; }
export interface LevelZone {
  id: string; timeframe: string; lower: number; upper: number; role: "SUPPORT" | "RESISTANCE"; strength: number;
  confirmedAt?: string | null; testCount: number; lastTestAt?: string | null; state: string; center?: number | null; strengthLabel: string;
  effectiveStrength: number; distanceLowerPercent?: number | null; distanceUpperPercent?: number | null; retestState: string; majorLevel?: boolean;
}
export interface SupportResistance { supports: LevelZone[]; resistances: LevelZone[]; containingZones: LevelZone[]; reasons: AnalysisReason[]; }
export interface RiskReward { entry: number; stop: number; grossRR: number; netRR: number; potentialUpsidePercent: number; potentialDownsidePercent: number; }
export interface PriceRange { lower: number; upper: number; }
export interface TradePlan {
  planId: string; setupType: string; entryRange?: PriceRange | null; entryMethod?: string | null; trigger?: string | null;
  stop?: { protectivePrice: number; closeThreshold: number | null; requiredCloses?: number; evaluationTimeframe?: string } | null;
  targets: { price: number; weight: number; reason: string; sourceZoneId?: string }[];
  riskReward: MetricResult<RiskReward>; status: string; reasons: AnalysisReason[]; validThroughSession?: string | null;
}
export interface TradePlanResult { plans: TradePlan[]; currentPrice: number; priceDataThrough: string; currentPriceRR: MetricResult<RiskReward>; reasons: AnalysisReason[]; contextEvaluated: boolean; }
export interface MomentumVolume { rsi14: MetricResult<number>; momentumSignal: MetricResult<number>; macd: MetricResult<number>; macdSignal: MetricResult<number>; volumeVs20Day: MetricResult<number>; volumeSignal: MetricResult<number>; drawdownFrom252High: MetricResult<number>; return20: MetricResult<number>; return60: MetricResult<number>; }
export interface IndicatorInterpretation { code: string; params: Record<string, string | number>; status: MetricStatus; reasons: AnalysisReason[]; }
export interface MomentumAnalysis { indicators: Record<string, MetricResult<number>>; interpretations?: Record<string, IndicatorInterpretation>; reasons: AnalysisReason[]; }
export interface MarketContext {
  momentum: MomentumVolume; market: MetricResult<{ regime: string; fearGreedScore: MetricResult<number>; breadthScore: MetricResult<number> }>;
  tradeConstraint: { entryPermission: string; reasonCodes: string[] }; reasons: AnalysisReason[];
  momentumDetail?: MomentumAnalysis | null;
}

export interface FutuValuationObservation {
  observationDate: string; observedAt: string;
  pe: number | null; pb: number | null; ps: number | null; forwardPe: number | null; forwardPs: number | null;
}
export interface FutuEarningsExpectation {
  fiscalPeriod: string; periodType: string; periodStart: string | null; periodEnd: string | null;
  currency: string | null; eps: number | null; revenue: number | null;
  observationDate: string; observedAt: string; source: string;
}
export interface FutuObservations { valuation: FutuValuationObservation | null; earnings: FutuEarningsExpectation[]; }

export interface StockAnalysisReport {
  figi: string;
  symbol: string;
  name: string;
  valuationDate: string;
  valuation: ValuationResult | null;
  financials: Financials | null;
  history: ValuationResult[];
  priceStructure: MetricResult<PriceStructure>;
  supportResistance: MetricResult<SupportResistance>;
  marketContext: MetricResult<MarketContext>;
  futuObservations: FutuObservations | null;
  tradePlans: MetricResult<TradePlanResult>;
  reasons: AnalysisReason[];
}