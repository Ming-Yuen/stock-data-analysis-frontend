import React from "react";
import { render, screen, within } from "@testing-library/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StockAnalysisPage } from "./StockAnalysis";

jest.mock("@tanstack/react-query", () => ({ useQuery: jest.fn(), useMutation: jest.fn(), useQueryClient: jest.fn() }));
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn(), useParams: () => ({ figi: "AAPL-FIGI" }) }), { virtual: true });
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("../services/apiClient", () => ({ apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn() } }));

const unavailable = (code: string) => ({ status: "INSUFFICIENT_DATA", value: null,
  reasons: [{ code, component: "VALUATION", message: code }], evidenceRefs: [] });
const available = (modelCode: string, low: number, central: number, high: number) => ({ status: "AVAILABLE",
  value: { modelCode, low, central, high, status: "AVAILABLE" }, reasons: [], evidenceRefs: [] });
const historical = available("HISTORICAL_PE", 100, 110, 120);
const industry = available("INDUSTRY_PE_ASSUMPTION", 200, 230, 260);
let valuation: Record<string, unknown>;

beforeEach(() => {
  jest.clearAllMocks();
  valuation = { fairValueRange: historical, industryFairValueRange: industry };
  const report = {
    context: { figi: "AAPL-FIGI", analysisAsOf: "2026-10-30T20:00:00Z", horizon: "SWING" },
    eligibility: { status: "DEGRADED", reasons: [], components: {} },
    normalizedPrice: unavailable("PRICE_MISSING"), priceStructure: unavailable("STRUCTURE_MISSING"),
    supportResistance: unavailable("LEVELS_MISSING"),
    valuation: { status: "AVAILABLE", value: valuation, reasons: [], evidenceRefs: [] },
    marketContext: unavailable("MARKET_MISSING"), tradePlans: unavailable("PLAN_MISSING"),
    confluenceScenarios: unavailable("CONFLUENCE_MISSING"), positionDecision: unavailable("POSITION_MISSING"),
  };
  (useQuery as jest.Mock).mockImplementation(({ queryKey }) => queryKey[0] === "analysis-position"
    ? { data: null, isFetched: true }
    : { data: { report }, isLoading: false });
  (useMutation as jest.Mock).mockReturnValue({ mutate: jest.fn(), isPending: false });
  (useQueryClient as jest.Mock).mockReturnValue({ setQueryData: jest.fn(), invalidateQueries: jest.fn() });
});

function range(kind: "historical" | "industry") {
  return within(screen.getByRole("region", { name: `analysisReport.${kind}FairValue` }));
}

test("shows independent historical and industry ranges without replacing either value", () => {
  render(<StockAnalysisPage />);

  expect(range("historical").getByText("HISTORICAL_PE")).toBeTruthy();
  expect(range("historical").getByText("100.00 – 120.00")).toBeTruthy();
  expect(range("historical").getByText("110.00")).toBeTruthy();
  expect(range("industry").getByText("INDUSTRY_PE_ASSUMPTION")).toBeTruthy();
  expect(range("industry").getByText("200.00 – 260.00")).toBeTruthy();
  expect(range("industry").getByText("230.00")).toBeTruthy();
  expect(range("industry").getByText(/analysisReport.rangeMidpoint/)).toBeTruthy();
  expect(range("industry").queryByText("110.00")).toBeNull();
});

test.each(["historical", "industry"] as const)("keeps both sections visible when only %s is available", (availableKind) => {
  if (availableKind === "historical") valuation.industryFairValueRange = unavailable("INDUSTRY_PE_RANGE_MISSING");
  else valuation.fairValueRange = unavailable("HISTORICAL_SAMPLE_MISSING");
  render(<StockAnalysisPage />);

  expect(range(availableKind).getByText(availableKind === "historical" ? "100.00 – 120.00" : "200.00 – 260.00")).toBeTruthy();
  const missing = range(availableKind === "historical" ? "industry" : "historical");
  expect(missing.getByText(/INSUFFICIENT_DATA/)).toBeTruthy();
  expect(missing.getByText(availableKind === "historical" ? /INDUSTRY_PE_RANGE_MISSING/ : /HISTORICAL_SAMPLE_MISSING/)).toBeTruthy();
});

test("legacy responses retain the historical range and show an unavailable industry range", () => {
  delete valuation.industryFairValueRange;
  render(<StockAnalysisPage />);

  expect(range("historical").getByText("100.00 – 120.00")).toBeTruthy();
  expect(range("industry").getByText(/INSUFFICIENT_DATA/)).toBeTruthy();
  expect(range("industry").queryByText("200.00 – 260.00")).toBeNull();
});
