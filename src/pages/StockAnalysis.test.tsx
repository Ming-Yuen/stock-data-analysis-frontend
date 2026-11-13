import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { StockAnalysisPage } from "./StockAnalysis";
import { apiClient } from "../services/apiClient";
import { SeriesChart } from "./ValuationPanels";
import { formatNumber } from "./AnalysisPanels";

jest.mock("@tanstack/react-query", () => ({ useQuery: jest.fn() }));
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn(), useParams: () => ({ figi: "AAPL-FIGI" }) }), { virtual: true });
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key }) }));
jest.mock("../services/apiClient", () => ({ apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn() } }));
jest.mock("./IndustryValuationProposalPanel", () => ({ IndustryValuationProposalPanel: () => null }));

const unavailable = (code: string) => ({ status: "INSUFFICIENT_DATA", value: null, reasons: [{ code, component: "TEST", message: code }] });
const metric = (value: number | null) => ({ value, status: value == null ? "INSUFFICIENT_DATA" : "AVAILABLE", reasonCode: value == null ? "MISSING_INPUT" : null });
const reference = (kind: string, low: number, high: number) => ({
  kind, metricCode: "PE", status: "AVAILABLE", reasonCode: null, multipleLow: 10, multipleMedian: 15, multipleHigh: 20,
  priceLow: low, priceHigh: high, sampleCount: 24,
});
let report: any;

beforeEach(() => {
  jest.clearAllMocks();
  report = {
    figi: "AAPL-FIGI", symbol: "AAPL", name: "Apple", valuationDate: "2026-11-05",
    valuation: { figi: "AAPL-FIGI", valuationDate: "2026-11-05", analysisAsOf: "2026-11-05T21:00:00Z", calculatedAt: "2026-11-06T00:00:00Z",
      currency: "USD", price: 200, industryCode: "I43", modelCode: "PE", primaryMetric: "PE", status: "PARTIAL", reasonCode: "SOME_INPUTS_MISSING",
      metrics: { pe: metric(25), pb: metric(null), ps: metric(7), pfcf: metric(null), evEbitda: metric(null) },
      historicalReference: reference("HISTORICAL_MARKET", 100, 150), peerReference: reference("PEER_MARKET", 120, 160),
      industryAssumption: reference("INDUSTRY_ASSUMPTION", 130, 170) },
    financials: null, history: [], priceStructure: unavailable("NO_PRICE"), supportResistance: unavailable("NO_LEVELS"),
    marketContext: unavailable("NO_MARKET"), tradePlans: unavailable("NO_PLAN"), futuObservations: null, reasons: [],
  };
  (useQuery as jest.Mock).mockImplementation((options: any) => ({ data: options.queryKey[0] === "analysis-report" ? report : undefined,
    isLoading: false, isFetching: false, isError: false, refetch: jest.fn() }));
});

test("reads the plain report API and sends only FIGI and optional valuation date", async () => {
  render(<StockAnalysisPage />);
  const query = (useQuery as jest.Mock).mock.calls.find(([options]) => options.queryKey[0] === "analysis-report")![0];
  (apiClient.post as jest.Mock).mockResolvedValue({ data: report });
  expect(await query.queryFn()).toBe(report);
  expect(apiClient.post).toHaveBeenCalledWith("analysis/report", { figi: "AAPL-FIGI" });
  fireEvent.change(screen.getByLabelText("估值日期（留空為最新）"), { target: { value: "2026-10-30" } });
  fireEvent.click(screen.getByRole("button", { name: "查詢" }));
  const calls = (useQuery as jest.Mock).mock.calls.filter(([options]) => options.queryKey[0] === "analysis-report");
  await calls[calls.length - 1][0].queryFn();
  expect(apiClient.post).toHaveBeenLastCalledWith("analysis/report", { figi: "AAPL-FIGI", valuationDate: "2026-10-30" });
});

test("keeps actual historical and peer references separate from industry assumptions", () => {
  render(<StockAnalysisPage />);
  expect(within(screen.getByRole("region", { name: "歷史市場估值參考" })).getByText("100.00–150.00")).toBeTruthy();
  expect(within(screen.getByRole("region", { name: "同業市場估值參考" })).getByText("120.00–160.00")).toBeTruthy();
  expect(within(screen.getByRole("region", { name: "產業估值假設" })).getByText("130.00–170.00")).toBeTruthy();
  expect(screen.getByText("25.00")).toBeTruthy();
  expect(screen.queryByText("勝率")).toBeNull();
});

test("does not display unavailable values or coerce missing values into zero", () => {
  report.valuation.metrics.pe = { value: 99999, status: "INSUFFICIENT_DATA", reasonCode: "EPS_BASIS_MISSING" };
  render(<StockAnalysisPage />);
  expect(screen.queryByText("99,999.00")).toBeNull();
  expect(screen.getByText(/EPS_BASIS_MISSING/)).toBeTruthy();
  expect(formatNumber(null)).toBe("—");
  expect(formatNumber(undefined)).toBe("—");
  expect(formatNumber(0)).toBe("0.00");
});

test("displays after-close share observation time on the single daily valuation", () => {
  report.valuation.analysisAsOf = "2026-11-12T21:00:00Z";
  report.valuation.sharesObservedAt = "2026-11-13T02:10:32Z";
  render(<StockAnalysisPage />);
  expect(screen.getByText(/股數取得時間（香港）/)).toHaveTextContent("10:10");
});

test("does not show an after-close label when shares were already observed", () => {
  report.valuation.analysisAsOf = "2026-11-12T21:00:00Z";
  report.valuation.sharesObservedAt = "2026-11-12T20:00:00Z";
  render(<StockAnalysisPage />);
  expect(screen.queryByText(/收市估算使用收市後取得的股數/)).not.toBeInTheDocument();
});

test("nonpositive free cash flow displays not meaningful instead of an available negative multiple", () => {
  report.valuation.metrics.pfcf = { value: null, status: "NOT_APPLICABLE", reasonCode: "NON_POSITIVE_FCF" };
  render(<StockAnalysisPage />);
  expect(screen.getByText(/自由現金流非正，P\/FCF 不適用（N.M.）/)).toBeInTheDocument();
  expect(screen.getByText("25.00")).toBeInTheDocument();
});

test("nonpositive earnings displays loss or zero earnings as not applicable", () => {
  report.valuation.metrics.pe = { value: null, status: "NOT_APPLICABLE", reasonCode: "NON_POSITIVE_EPS" };
  render(<StockAnalysisPage />);
  expect(screen.getByText(/每股盈利非正（虧損或零盈利），PE 不適用（N.M.）/)).toBeInTheDocument();
});

test("history chart leaves gaps rather than inventing observations", () => {
  render(<SeriesChart title="測試歷史" points={[
    { date: "2026-01-01", value: 10 }, { date: "2026-02-01", value: null }, { date: "2026-03-01", value: 20 },
  ]} />);
  const path = screen.getByRole("img", { name: "測試歷史" }).querySelector("path")!.getAttribute("d")!;
  expect(path.split("M").length - 1).toBe(2);
  expect(path.includes("L")).toBe(false);
});

test("shows SEC financial source and actual TTM interval without replacing valuation date", () => {
  report.valuation.metrics.ps = { ...metric(7), financialSource: "SEC", periodStart: "2025-07-01", periodEnd: "2026-06-30" };
  render(<StockAnalysisPage />);
  expect(screen.getByText(/SEC 財務.*2025-07-01～2026-06-30/)).toBeInTheDocument();
  expect(screen.getByText("7.00")).toBeInTheDocument();
});
