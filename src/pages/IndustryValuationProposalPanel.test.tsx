import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IndustryValuationProposalPanel, reportMatchesProposal } from "./IndustryValuationProposalPanel";
import { industryValuationApi } from "../services/industryValuationApi";
import { IndustryValuationApproval, IndustryValuationReview } from "../services/types/dto/industryValuation";
import { StockAnalysisReport } from "../services/types/dto/analysis";
import { Job } from "../services/types/dto/batch";
import { ActiveStatus } from "../services/types/enums/ActiveStatus";
import resources from "../locales/en.json";

jest.mock("../services/industryValuationApi", () => ({ industryValuationApi: {
  review: jest.fn(), propose: jest.fn(), approve: jest.fn(), job: jest.fn(), recalculate: jest.fn(),
} }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { resolvedLanguage: "en-GB" }, t: (key: string, options?: Record<string, unknown>) => {
  const strings = require("../locales/en.json");
  const value = key.split(".").reduce((node: any, part: string) => node?.[part], strings);
  return typeof value === "string" ? value : options?.defaultValue ?? key;
} }) }));

const api = industryValuationApi as jest.Mocked<typeof industryValuationApi>;
let review: IndustryValuationReview;
let job: Job;
let client: QueryClient;
const reload = jest.fn();
const labels = resources.industryProposal;

beforeEach(() => {
  jest.clearAllMocks();
  review = {
    industryCode: "I43", industry: "Semiconductors", valuationModelCode: "NON_FINANCIAL_OPERATING", primaryValuationMetric: "PE",
    current: { ranges: { PE: { low: 12, high: 18 }, PB: null }, asOf: "2026-10-01", sourceUrls: ["https://example.com/current"], rationale: "Current rationale" },
    latestProposal: { id: "draft-id", status: "DRAFT", valuationModelCode: "NON_FINANCIAL_OPERATING", metric: "PE", low: 15, high: 25,
      asOf: "2026-11-04", sourceUrls: ["https://example.com/draft"], rationale: "Draft rationale", createdAt: "2026-11-04T01:00:00Z",
      sources: [{ url: "https://example.com/draft", title: "Industry evidence", publishedDate: "2026-10-30", evidence: "Reported business margins support the stated assumptions." }],
      completedAt: "2026-11-04T01:01:00Z", approvedAt: null, failureReason: null },
    availableActions: ["PROPOSE", "APPROVE"], unavailabilityReason: null,
  };
  job = {
    id: 1, taskCode: "BACKEND_VALUATION_TASK", taskGroup: "SCHEDULE",
    jobParams: {}, jobClassPath: "StockValuationSnapshotDailyTask", cronExpression: "0 0 12 * * ?",
    activeStatus: ActiveStatus.ACTIVE,
  };
  api.review.mockResolvedValue(review);
  api.job.mockResolvedValue(job);
  api.recalculate.mockResolvedValue();
  reload.mockResolvedValue(null);
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
});
afterEach(() => { client.clear(); jest.useRealTimers(); });

async function renderPanel() {
  const rendered = render(<QueryClientProvider client={client}><IndustryValuationProposalPanel industryCode="I43" figi="NVDA-FIGI" reloadReport={reload} /></QueryClientProvider>);
  await screen.findByText("Semiconductors · I43");
  return rendered;
}
function approved(): IndustryValuationApproval {
  return { review: { ...review, availableActions: ["PROPOSE"], latestProposal: { ...review.latestProposal!, status: "APPROVED", approvedAt: "2026-11-04T01:05:00Z" } },
    recalculationRequired: true, recalculationTaskCode: job.taskCode };
}
function matchingReport(): StockAnalysisReport {
  return { context: { figi: "NVDA-FIGI" }, valuation: { status: "AVAILABLE", value: { industryFairValueRange: {
    status: "AVAILABLE", value: { modelCode: "PE", multipleQuantiles: { low: 15, high: 25 }, assumptions: {
      industryCode: "I43", rangeSource: "AI_INDUSTRY_BASELINE", primaryValuationMetric: "PE", classificationAsOf: "2026-11-04", sourceUrls: "https://example.com/draft",
    } }, reasons: [],
  } } } } as unknown as StockAnalysisReport;
}
async function advance(milliseconds: number) {
  await act(async () => { jest.advanceTimersByTime(milliseconds); });
}

test("shows current and draft assumptions inline without opening a popup or approving automatically", async () => {
  await renderPanel();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(within(screen.getByRole("region", { name: labels.current })).getByText("P/E: 12 – 18 ×")).toBeTruthy();
  expect(within(screen.getByRole("region", { name: labels.proposal })).getByText("Proposed multiple range: 15 – 25 ×")).toBeTruthy();
  expect(screen.getByRole("link", { name: "https://example.com/draft" }).getAttribute("href")).toBe("https://example.com/draft");
  expect(screen.getByText("Draft rationale")).toBeTruthy();
  expect(screen.getByText("Reported business margins support the stated assumptions.")).toBeTruthy();
  expect(screen.getByText("Source published: 2026-10-30")).toBeTruthy();
  expect(api.approve).not.toHaveBeenCalled();
  expect(api.recalculate).not.toHaveBeenCalled();
});

test("uses backend actions and preserves the reason when an action is unavailable", async () => {
  review.availableActions = [];
  review.unavailabilityReason = "The backend requires a supported primary metric.";
  await renderPanel();
  expect(screen.queryByRole("button", { name: labels.propose })).toBeNull();
  expect(screen.queryByRole("button", { name: labels.approve })).toBeNull();
  expect(screen.getByText(review.unavailabilityReason)).toBeTruthy();
});

test("polls a pending proposal into a draft and never approves it automatically", async () => {
  jest.useFakeTimers();
  const pending = { ...review, availableActions: [], latestProposal: { ...review.latestProposal!, status: "PENDING" as const, low: null, high: null } };
  api.review.mockResolvedValueOnce(pending).mockResolvedValue(review);
  await renderPanel();
  await advance(2500);
  expect(api.review).toHaveBeenCalledTimes(2);
  expect(await screen.findByText(labels.status.DRAFT)).toBeTruthy();
  expect(screen.queryByText(labels.status.PENDING)).toBeNull();
  expect(screen.getByRole("button", { name: labels.approve })).toBeTruthy();
  expect(api.approve).not.toHaveBeenCalled();
});

test("shows generation failure details and permits only the backend retry action", async () => {
  review.latestProposal = { ...review.latestProposal!, status: "FAILED", failureReason: "No primary source supports the proposed range." };
  review.availableActions = ["PROPOSE"];
  await renderPanel();
  expect(screen.getByText(review.latestProposal.failureReason!)).toBeTruthy();
  expect(screen.queryByRole("button", { name: labels.approve })).toBeNull();
  api.propose.mockResolvedValue({ ...review, availableActions: [], latestProposal: { ...review.latestProposal, status: "PENDING" } });
  fireEvent.click(screen.getByRole("button", { name: labels.propose }));
  await waitFor(() => expect(api.propose).toHaveBeenCalledWith("I43"));
  expect(api.approve).not.toHaveBeenCalled();
});

test("explicit approval launches once for this FIGI and confirms the updated report", async () => {
  jest.useFakeTimers();
  api.approve.mockResolvedValue(approved());
  reload.mockResolvedValue(matchingReport());
  await renderPanel();
  const button = screen.getByRole("button", { name: labels.approve });
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => expect(api.recalculate).toHaveBeenCalledTimes(1));
  expect(api.approve).toHaveBeenCalledTimes(1);
  expect(api.approve).toHaveBeenCalledWith("I43", "draft-id");
  expect(api.recalculate).toHaveBeenCalledWith(job, "NVDA-FIGI");
  await advance(3000);
  await waitFor(() => expect(reload).toHaveBeenCalled());
  expect(screen.getAllByText(labels.recalculation.CONFIRMED).length).toBeGreaterThan(0);
});

test("a stale report stays unconfirmed after polling, and manual refresh shows the mismatch", async () => {
  jest.useFakeTimers();
  api.approve.mockResolvedValue(approved());
  await renderPanel();
  fireEvent.click(screen.getByRole("button", { name: labels.approve }));
  await advance(1);
  await advance(3000);
  expect(reload).toHaveBeenCalled();
  expect(screen.queryByText(labels.recalculation.CONFIRMED)).toBeNull();
  expect(screen.getByText(labels.recalculation.QUEUED)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: labels.refresh }));
  await waitFor(() => expect(screen.getByText(labels.reportMismatch)).toBeTruthy());
});

test("enqueues once using job configuration alone, and leaving the page does not discard the request", async () => {
  jest.useFakeTimers();
  api.approve.mockResolvedValue(approved());
  const rendered = await renderPanel();
  fireEvent.click(screen.getByRole("button", { name: labels.approve }));
  await waitFor(() => expect(api.recalculate).toHaveBeenCalledTimes(1));
  expect(api.recalculate).toHaveBeenCalledWith(job, "NVDA-FIGI");
  rendered.unmount();
  await advance(10000);
  expect(api.recalculate).toHaveBeenCalledTimes(1);
  expect(api.approve).toHaveBeenCalledTimes(1);
});

test.each(["figi", "range", "date", "source", "metric", "unavailable"])("report matching rejects a mismatched %s", (field) => {
  const report = matchingReport();
  const range = report.valuation.value!.industryFairValueRange!;
  if (field === "figi") report.context.figi = "OTHER-FIGI";
  if (field === "range") range.value!.multipleQuantiles!.low = 10;
  if (field === "date") range.value!.assumptions!.classificationAsOf = "2026-10-01";
  if (field === "source") range.value!.assumptions!.sourceUrls = "https://example.com/old";
  if (field === "metric") range.value!.modelCode = "PS";
  if (field === "unavailable") range.status = "UNVERIFIED";
  expect(reportMatchesProposal(report, "NVDA-FIGI", "I43", review.latestProposal!)).toBe(false);
});
