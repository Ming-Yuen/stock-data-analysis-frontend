import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StockAnalysisPage } from "./StockAnalysis";
import resources from "../locales/zh-HK.json";
import { WatchItem } from "../services/types/dto/watchlist";
import { apiClient } from "../services/apiClient";

jest.mock("@tanstack/react-query", () => ({ useQuery: jest.fn(), useMutation: jest.fn(), useQueryClient: jest.fn() }));
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn(), useParams: () => ({ figi: "AAPL-FIGI" }) }), { virtual: true });
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string, options?: Record<string, unknown>) => {
  const strings = require("../locales/zh-HK.json");
  const value = key.split(".").reduce((node: any, part: string) => node?.[part], strings);
  return typeof value === "string" ? value.replace(/{{(.*?)}}/g, (_: string, token: string) => String(options?.[token] ?? "")) : options?.defaultValue ?? key;
} }) }));
jest.mock("../services/apiClient", () => ({ apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn() } }));

const unavailable = (code: string, message = code) => ({ status: "INSUFFICIENT_DATA", value: null,
  reasons: [{ code, component: "VALUATION", message }], evidenceRefs: [] });
const available = (value: unknown) => ({ status: "AVAILABLE", value, reasons: [], evidenceRefs: [] });
const fair = (modelCode: string, low: number, central: number, high: number) => available({ modelCode, low, central, high, status: "AVAILABLE" });
let valuation: Record<string, any>;
let report: Record<string, any>;
let reportPending: boolean;
let preview: unknown;

beforeEach(() => {
  jest.clearAllMocks();
  reportPending = false;
  preview = null;
  valuation = { fairValueRange: fair("PE", 100, 110, 120), industryFairValueRange: fair("EV_EBITDA", 200, 230, 260) };
  report = {
    context: { figi: "AAPL-FIGI", analysisAsOf: "2026-10-30T20:00:00Z", horizon: "SWING" },
    eligibility: { status: "DEGRADED", reasons: [], components: {}, fundamentalDataThrough: "2026-06-27" },
    normalizedPrice: unavailable("PRICE_MISSING"), priceStructure: unavailable("STRUCTURE_MISSING"), supportResistance: unavailable("LEVELS_MISSING"),
    valuation: available(valuation), marketContext: unavailable("MARKET_MISSING"), tradePlans: unavailable("PLAN_MISSING"),
    confluenceScenarios: unavailable("CONFLUENCE_MISSING"), positionDecision: unavailable("POSITION_MISSING"),
  };
  (useQuery as jest.Mock).mockImplementation(({ queryKey }) => {
    if (queryKey[0] === "analysis-position") return { data: null, isFetched: true };
    if (queryKey[0] === "analysis-valuation-preview") return { data: preview, isLoading: false };
    return reportPending ? { isLoading: true, isFetching: true } : { data: { report }, isLoading: false };
  });
  (useMutation as jest.Mock).mockReturnValue({ mutate: jest.fn(), isPending: false });
  (useQueryClient as jest.Mock).mockReturnValue({ setQueryData: jest.fn(), invalidateQueries: jest.fn() });
});

function range(kind: "historical" | "industry") {
  return within(screen.getByRole("region", { name: resources.analysisReport[kind === "historical" ? "historicalFairValue" : "industryFairValue"] }));
}

test("keeps both valuation methods independent with different central rules", () => {
  render(<StockAnalysisPage />);
  expect(range("historical").getByText("100.00 – 120.00 USD")).toBeTruthy();
  expect(range("historical").getByText("110.00")).toBeTruthy();
  expect(range("industry").getByText("200.00 – 260.00 USD")).toBeTruthy();
  expect(range("industry").getByText("230.00")).toBeTruthy();
  expect(range("industry").getByText(/區間中點/)).toBeTruthy();
  expect(range("industry").queryByText("110.00")).toBeNull();
});

test.each(["historical", "industry"] as const)("keeps both sections when only %s is available", (kind) => {
  if (kind === "historical") valuation.industryFairValueRange = unavailable("INDUSTRY_FAIR_RANGE_MISSING");
  else valuation.fairValueRange = unavailable("HISTORICAL_SAMPLE_MISSING", "歷史樣本尚不足");
  render(<StockAnalysisPage />);
  expect(range(kind).getByText(kind === "historical" ? "100.00 – 120.00 USD" : "200.00 – 260.00 USD")).toBeTruthy();
  const missing = range(kind === "historical" ? "industry" : "historical");
  expect(missing.getByText(/資料不足/)).toBeTruthy();
  expect(missing.getByText(kind === "historical" ? /尚未建立產業合理估值倍數/ : /歷史樣本尚不足/)).toBeTruthy();
});

test("legacy responses do not calculate observation zones in the browser", () => {
  delete valuation.industryFairValueRange;
  render(<StockAnalysisPage />);
  expect(range("historical").getByText("100.00 – 120.00 USD")).toBeTruthy();
  expect(range("historical").getByText(resources.analysisReport.observationUnavailable)).toBeTruthy();
  expect(range("industry").getByText(/資料不足/)).toBeTruthy();
  expect(range("historical").queryByText(/買入觀察：低於/)).toBeNull();
});

test("uses each backend observation without creating a buy decision", () => {
  valuation.fairValueRange.value.observation = { position: "BELOW_RANGE", currentPrice: 99, buyBelow: 100, sellAbove: 120 };
  valuation.industryFairValueRange.value.observation = { position: "WITHIN_RANGE", currentPrice: 230, buyBelow: 200, sellAbove: 260 };
  render(<StockAnalysisPage />);
  expect(range("historical").getByText(resources.analysisReport.observations.BELOW_RANGE)).toBeTruthy();
  expect(range("industry").getByText(resources.analysisReport.observations.WITHIN_RANGE)).toBeTruthy();
  expect(range("historical").getByText(/本次使用股價: 99.00/)).toBeTruthy();
  expect(screen.getByText(resources.analysisReport.noPreferredPlan)).toBeTruthy();
});

test("reveals verified inputs and safe source links and financial dates", () => {
  Object.assign(valuation.fairValueRange.value, { denominatorValue: 5, multipleQuantiles: { q25: 20, q50: 22, q75: 24 }, assumptions: { sourceUrls: "https://www.sec.gov/example\njavascript:alert(1)", classificationAsOf: "2026-10-30" } });
  render(<StockAnalysisPage />);
  fireEvent.click(range("historical").getByRole("button", { name: resources.analysisReport.calculationEvidence }));
  expect(range("historical").getByText(/財務分母: 5.00/)).toBeTruthy();
  expect(range("historical").getByText(/歷史中位數: 22.00×/)).toBeTruthy();
  expect(range("historical").getByRole("link", { name: /www.sec.gov/ }).getAttribute("href")).toBe("https://www.sec.gov/example");
  expect(range("historical").queryByRole("link", { name: /javascript/ })).toBeNull();
  expect(screen.getByText(/財務期間截至: 2026-06-27/)).toBeTruthy();
});

test("does not promote stale ranges or unselected plans into recommendations", () => {
  valuation.fairValueRange.status = "STALE";
  valuation.fairValueRange.value.observation = { position: "BELOW_RANGE", currentPrice: 99, buyBelow: 100, sellAbove: 120 };
  report.tradePlans = available({ plans: [{ planId: "not-selected", entryRange: { lower: 90, upper: 95 } }], currentPrice: 100, priceDataThrough: "2026-10-30" });
  render(<StockAnalysisPage />);
  expect(range("historical").getByText(/資料已過期/)).toBeTruthy();
  expect(range("historical").queryByText(/買入觀察區/)).toBeNull();
  expect(screen.getByText(resources.analysisReport.noPreferredPlan)).toBeTruthy();
  expect(within(screen.getByRole("region", { name: resources.analysisReport.preferredTechnicalPlan })).queryByText("90.00 – 95.00")).toBeNull();
});

test("only shows unselected plans as observation details and does not duplicate the preferred plan", () => {
  const plan = (planId: string, lower: number, upper: number) => ({ planId, entryRange: { lower, upper }, status: "WAITING_TRIGGER", targets: [], reasons: [], riskReward: unavailable("RR_REQUIRED") });
  report.tradePlans = available({ plans: [plan("chosen", 100, 105), plan("watch-only", 90, 95)], currentPrice: 110, priceDataThrough: "2026-10-30" });
  report.confluenceScenarios = available({ preferredPlanId: "chosen", marketDecision: "WAIT" });
  render(<StockAnalysisPage />);
  const preferred = within(screen.getByRole("region", { name: resources.analysisReport.preferredTechnicalPlan }));
  expect(preferred.getByText("100.00 – 105.00")).toBeTruthy();
  expect(preferred.queryByText("90.00 – 95.00")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: resources.analysisReport.otherObservationPlans }));
  const observations = within(screen.getByRole("region", { name: resources.analysisReport.otherObservationPlans }));
  expect(observations.getByText("90.00 – 95.00")).toBeTruthy();
  expect(observations.queryByText("100.00 – 105.00")).toBeNull();
  expect(observations.getByText(resources.analysisReport.observationPlansLimit)).toBeTruthy();
});

test("shows backend technical descriptions without inferring a crossover", () => {
  report.marketContext = available({ momentum: {}, momentumDetail: { indicators: { MACD: available(2.1), RSI14: unavailable("RSI_WARMUP_REQUIRED") },
    interpretations: { MACD: { code: "MACD_ABOVE_SIGNAL", status: "AVAILABLE", params: { unit: "PRICE", timeframe: "DAILY" }, reasons: [] } } }, market: unavailable("MARKET_UNKNOWN") });
  render(<StockAnalysisPage />);
  expect(screen.getByText(resources.analysisReport.interpretations.MACD_ABOVE_SIGNAL)).toBeTruthy();
  expect(screen.getByText(resources.analysisReport.reasons.RSI_WARMUP_REQUIRED)).toBeTruthy();
  expect(screen.getByText(resources.analysisReport.scoreLimit)).toBeTruthy();
});

test("uses backend messages for unknown reasons and keeps market comparison separate", () => {
  valuation.industryFairValueRange = unavailable("NEW_UPSTREAM_REASON", "來源正在重新核驗");
  valuation.industryMarketReference = { classificationCode: "TEST", valuationIndustry: "Test industry", primaryValuationMetric: "PE", status: "AVAILABLE", marketAsOf: "2026-10-30", peMedian: 22 };
  render(<StockAnalysisPage />);
  expect(range("industry").getByText("來源正在重新核驗")).toBeTruthy();
  expect(screen.getByText("P/E: 22.00×")).toBeTruthy();
  expect(range("industry").queryByText("22.00")).toBeNull();
});

test("shows saved values while detailed analysis is loading, then replaces them with the report", () => {
  reportPending = true;
  preview = { figi: "AAPL-FIGI", quoteDate: "2026-10-30", valuationAnalysisAsOf: "2026-10-30T20:00:00Z", fairValueRange: fair("PE", 80, 90, 95) };
  const { rerender } = render(<StockAnalysisPage />);
  const saved = within(screen.getByRole("region", { name: resources.analysisReport.savedValuation }));
  expect(saved.getByText("80.00 – 95.00 USD")).toBeTruthy();
  expect(saved.getByText(resources.analysisReport.savedValuationLoading)).toBeTruthy();
  expect(screen.queryByText(resources.analysisReport.technicalTradePlan)).toBeNull();
  reportPending = false;
  rerender(<StockAnalysisPage />);
  expect(screen.queryByRole("region", { name: resources.analysisReport.savedValuation })).toBeNull();
  expect(range("historical").getByText("100.00 – 120.00 USD")).toBeTruthy();
  expect(screen.queryByText("80.00 – 95.00 USD")).toBeNull();
});

test("uses a supplied stock cache without an enquiry and supports old stocks without cached fields", () => {
  reportPending = true;
  const stock = { figi: "AAPL-FIGI", symbol: "AAPL", fairValueRange: fair("PE", 80, 90, 95) } as unknown as WatchItem;
  const { rerender } = render(<StockAnalysisPage stock={stock} />);
  expect(screen.getByRole("region", { name: resources.analysisReport.savedValuation })).toBeTruthy();
  const options = (useQuery as jest.Mock).mock.calls.find(([query]) => query.queryKey[0] === "analysis-valuation-preview")?.[0];
  expect(options.enabled).toBe(false);
  rerender(<StockAnalysisPage stock={{ figi: "AAPL-FIGI", symbol: "AAPL" } as WatchItem} />);
  expect(screen.queryByRole("region", { name: resources.analysisReport.savedValuation })).toBeNull();
  expect(screen.getByText(resources.analysisReport.loading)).toBeTruthy();
});

test("loads the saved preview through a one-stock FIGI enquiry and rejects another FIGI", async () => {
  reportPending = true;
  render(<StockAnalysisPage />);
  const options = (useQuery as jest.Mock).mock.calls.find(([query]) => query.queryKey[0] === "analysis-valuation-preview")?.[0];
  expect(options.enabled).toBe(true);
  (apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true, watchItems: [{ figi: "OTHER-FIGI" }] } });
  expect(await options.queryFn()).toBeNull();
  expect(apiClient.post).toHaveBeenCalledWith(expect.anything(), { page: 1, pageSize: 1, criteria: { figi: "AAPL-FIGI" } });
});
