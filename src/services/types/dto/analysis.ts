export type MetricStatus = "AVAILABLE" | "STALE" | "INSUFFICIENT_DATA" | "UNVERIFIED" | "NOT_APPLICABLE";
export type EligibilityStatus = "ALLOWED" | "DEGRADED" | "BLOCKED";
export type AnalysisHorizon = "SWING" | "POSITION";
export type PositionSelectionKind = "UNKNOWN" | "CURRENT" | "EXPLICIT_NONE";

/** 分析頁面使用的請求欄位；未指定 analysisAsOf 時由後端決定分析時間。 */
export interface AnalysisReportRequest {
  figi: string; horizon: AnalysisHorizon; analysisAsOf?: string | null;
  positionSelection: { kind: PositionSelectionKind }; accountRisk: AccountRiskContext | null;
}

export interface AnalysisReason { code: string; component: string; message: string; params?: Record<string, unknown>; evidenceRefs?: string[]; }
export interface MetricResult<T> { status: MetricStatus; value: T | null; reasons: AnalysisReason[]; evidenceRefs: string[]; lastKnown?: T | null; }
export interface AnalysisContext { figi: string; analysisAsOf: string; knowledgeAsOf: string; horizon: AnalysisHorizon; }
export interface AnalysisEligibility { status: EligibilityStatus; reasons: AnalysisReason[]; components: Record<string, MetricStatus>; priceDataThrough?: string | null; fundamentalDataThrough?: string | null; }

export interface PriceBasisDescriptor {
  basisId: string; source: string; priceAdjustment?: string | null; referenceDate?: string | null; splitVersion?: string | null;
  shareUnit?: string | null; sessionScope?: string | null; currency?: string | null; verified: boolean; evidenceRef?: string | null;
}
export interface NormalizedBar {
  sessionDate: string; open: number; high: number; low: number; close: number; volume: MetricResult<number>;
  sessionOpenAt?: string | null; sessionCloseAt?: string | null; availableAt?: string | null; observedAt?: string | null;
  versionRef: string; basisId: string;
}
export interface NormalizedPriceSeries {
  figi: string; timeframe: string; bars: NormalizedBar[]; priceBasis: PriceBasisDescriptor;
  coverage?: { requestedFrom?: string | null; requestedTo?: string | null; actualFrom?: string | null; actualTo?: string | null; validCount: number; expectedCount: number; gapDates: string[]; basisSegments: string[] } | null;
  quality: MetricStatus; evidenceRefs?: string[]; inputHash: string;
}

export interface AtrPoint { sessionDate: string; period: number; atr: number; atrPercent: number; seedDate: string; trCount: number; warmupCount: number; }
export interface StructureTrend { state: string; asOf: string; highRelation?: string | null; lowRelation?: string | null; pivotIds: string[]; lastTransitionAt?: string | null; }
export interface TimeframeStructure {
  timeframe: "DAILY" | "WEEKLY" | "MONTHLY"; bars: NormalizedBar[]; atr14: MetricResult<AtrPoint>;
  highRelation: MetricResult<string>; lowRelation: MetricResult<string>; minorTrend: MetricResult<StructureTrend>; majorTrend: MetricResult<StructureTrend>;
  reasons: AnalysisReason[];
}
export interface PriceStructure { figi: string; inputHash: string; priceDataThrough: string; timeframes: TimeframeStructure[]; evidenceRefs: string[]; reasons: AnalysisReason[]; }

export interface LevelZone {
  id: string; timeframe: string; lower: number; upper: number; role: "SUPPORT" | "RESISTANCE"; strength: number;
  confirmedAt?: string | null; testCount: number; lastTestAt?: string | null; state: string; center?: number | null; strengthLabel: string;
  effectiveStrength: number; distanceLowerPercent?: number | null; distanceUpperPercent?: number | null; retestState: string;
  majorLevel?: boolean; evidenceRefs: string[];
}
export interface SupportResistance { supports: LevelZone[]; resistances: LevelZone[]; containingZones: LevelZone[]; reasons: AnalysisReason[]; }

export interface RiskReward { entry: number; stop: number; grossRR: number; netRR: number; potentialUpsidePercent: number; potentialDownsidePercent: number; }
export interface PriceRange { lower: number; upper: number; basisId: string; }
export interface TradePlan {
  planId: string; setupType: string; entryRange?: PriceRange | null; entryMethod?: string | null; trigger?: string | null;
  stop?: { protectivePrice: number; closeThreshold: number | null; requiredCloses?: number; evaluationTimeframe?: string } | null;
  targets: { price: number; weight: number; reason: string; sourceZoneId?: string }[];
  riskReward: MetricResult<RiskReward>; status: string; reasons: AnalysisReason[]; validThroughSession?: string | null; evidenceRefs?: string[];
}
export interface TradePlanResult { plans: TradePlan[]; currentPrice: number; priceDataThrough: string; currentPriceRR: MetricResult<RiskReward>; reasons: AnalysisReason[]; evidenceRefs?: string[]; contextEvaluated: boolean; }

export interface ValuationObservation { position: "BELOW_RANGE" | "WITHIN_RANGE" | "ABOVE_RANGE"; currentPrice: number; buyBelow: number; sellAbove: number; }
export interface FairValueRange {
  modelCode: string; low: number; central: number; high: number; status: MetricStatus;
  priceBasis?: string; denominatorValue?: number | null; multipleQuantiles?: Record<string, number>;
  sensitivity?: Record<string, number>; assumptions?: Record<string, unknown>; reasons?: AnalysisReason[]; evidenceRefs?: string[];
  observation?: ValuationObservation | null;
}
export interface IndustryMarketReference {
  classificationCode: string; valuationIndustry: string; primaryValuationMetric?: string | null;
  marketAsOf?: string | null; peMedian?: number | null; pbMedian?: number | null; psMedian?: number | null; evEbitdaMedian?: number | null;
  status: MetricStatus; reasonCode?: string | null; method?: string;
}
export interface HistoricalValuation {
  currentPrice: number; priceDate: string; basisId: string; priceBasis?: PriceBasisDescriptor | null;
  currentRatios: Record<string, MetricResult<number>>; fairValueRange: MetricResult<FairValueRange>;
  industryFairValueRange?: MetricResult<FairValueRange> | null;
  industryMarketReference?: IndustryMarketReference | null;
  fundamentalDataThrough?: string | null;
  eligibility: EligibilityStatus; reasons: AnalysisReason[]; availableAt?: string | null; observedAt?: string | null;
}
export interface MomentumVolume { rsi14: MetricResult<number>; momentumSignal: MetricResult<number>; macd: MetricResult<number>; macdSignal: MetricResult<number>; volumeVs20Day: MetricResult<number>; volumeSignal: MetricResult<number>; drawdownFrom252High: MetricResult<number>; return20: MetricResult<number>; return60: MetricResult<number>; }
export interface IndicatorInterpretation { code: string; params: Record<string, string | number>; status: MetricStatus; reasons: AnalysisReason[]; }
export interface MomentumAnalysis { indicators: Record<string, MetricResult<number>>; interpretations?: Record<string, IndicatorInterpretation>; reasons: AnalysisReason[]; }
export interface MarketContext {
  momentum: MomentumVolume; market: MetricResult<{ regime: string; fearGreedScore: MetricResult<number>; breadthScore: MetricResult<number> }>;
  tradeConstraint: { entryPermission: string; reasonCodes: string[] }; reasons: AnalysisReason[];
  momentumDetail?: MomentumAnalysis | null;
}
export interface Scenario { id?: string; type: string; probability?: number | null; status?: string; trigger?: string | null; invalidation?: string | null; referencePrice: number; targetPrice: number; invalidationPrice: number; rationale: string; }
export interface ConfluenceScenario {
  confluence: { score0To100: number; evidenceScore: number; coverage: number; policyVersion: string };
  orderedPlans?: Array<{ planId: string; evidenceScore: number; coverage: number; confidence: string; buyCandidate: boolean }>;
  preferredPlanId?: string | null; strongBuyZone?: PriceRange | null; marketDecision?: "WAIT" | "BUY_CANDIDATE"; confidence?: string;
  evidenceScore?: number; coverage?: number; scenarios: Scenario[]; activeScenarioId?: string | null; reasons: AnalysisReason[];
}
export interface AccountRiskContext {
  currency: "USD"; asOf: string; equity: number; availableCash: number; portfolioRiskAmount: number;
  riskBudgetFraction: number; maxPortfolioRiskFraction: number; maxPositionWeightFraction: number; quantityStep: number;
  complete: boolean; provenance: "USER_DECLARED";
}

export interface PositionDecision {
  action: string; planId?: string | null; status: MetricStatus; positionVersion?: string | null; suggestedFraction?: number | null;
  suggestedQuantity?: number | null; currentExposurePercent?: number | null; riskBudgetAmount?: number | null;
  primaryReason: string; reasons: AnalysisReason[]; evidenceRefs: string[]; positionKnown: boolean;
}
export interface StockAnalysisReport {
  context: AnalysisContext; eligibility: AnalysisEligibility; normalizedPrice: MetricResult<NormalizedPriceSeries>;
  priceStructure: MetricResult<PriceStructure>; supportResistance: MetricResult<SupportResistance>; valuation: MetricResult<HistoricalValuation>;
  marketContext: MetricResult<MarketContext>; tradePlans: MetricResult<TradePlanResult>; confluenceScenarios: MetricResult<ConfluenceScenario>;
  positionDecision: MetricResult<PositionDecision>; snapshotId?: string | null; reasons: AnalysisReason[];
}

export interface AnalysisApiError { code: string; fieldErrors: Record<string, string>; requestId: string; }
export interface AnalysisApiResponse<T> { success: boolean; message: string; data: T | null; error: AnalysisApiError | null; }
export interface AnalysisReportData { report: StockAnalysisReport; }
export interface PositionDto { id: string; version: string; figi: string; quantity: number; averageCost?: number | null; currency: string; horizon: AnalysisHorizon; effectiveAt: string; basisRef: string; manualStop?: number | null; thesis?: string | null; status: string; closedAt?: string | null; }
