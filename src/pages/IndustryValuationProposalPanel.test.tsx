import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IndustryValuationProposalPanel } from "./IndustryValuationProposalPanel";
import { industryValuationApi } from "../services/industryValuationApi";
import { IndustryValuationReview } from "../services/types/dto/industryValuation";

jest.mock("@tanstack/react-query", () => ({ useQuery: jest.fn(), useQueryClient: jest.fn() }));
jest.mock("../services/industryValuationApi", () => ({ industryValuationApi: { propose: jest.fn(), save: jest.fn(), recalculate: jest.fn() } }));
let review: IndustryValuationReview;
const reload = jest.fn();
const invalidate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  review = { industryCode: "I43", industry: "半導體", current: {
    effectiveAt: "2026-11-01T00:00:00Z", modelCode: "PE", primaryMetric: "PE", assumedMultipleLow: 10, assumedMultipleHigh: 20,
    rationale: "既有假設", sourceUrl: null,
  }, supportedMetrics: { PE: ["PE"], CASH_FLOW: ["PFCF"] }, canPropose: true };
  (useQuery as jest.Mock).mockImplementation(() => ({ data: review, isLoading: false, isError: false, refetch: jest.fn() }));
  invalidate.mockResolvedValue(undefined);
  (useQueryClient as jest.Mock).mockReturnValue({ setQueryData: jest.fn(), invalidateQueries: invalidate });
  (industryValuationApi.propose as jest.Mock).mockResolvedValue({
    modelCode: "PE", primaryMetric: "PE", assumedMultipleLow: 15, assumedMultipleHigh: 25, asOf: "2026-11-06",
    rationale: "待人工確認的假設", sources: [{ url: "https://example.test/research", title: "來源", publishedDate: "2026-11-05", evidence: "資料摘要" }],
  });
  (industryValuationApi.save as jest.Mock).mockResolvedValue(review);
  (industryValuationApi.recalculate as jest.Mock).mockResolvedValue([]);
  reload.mockResolvedValue(null);
});

test("keeps AI draft in the page and does not save or recalculate without confirmation", async () => {
  render(<IndustryValuationProposalPanel industryCode="I43" figi="TEST" valuationDate="2026-11-05" reloadReport={reload} />);
  fireEvent.click(screen.getByRole("button", { name: "產生 AI 草稿" }));
  await screen.findByDisplayValue("待人工確認的假設");
  expect(industryValuationApi.propose).toHaveBeenCalledWith("I43");
  expect(industryValuationApi.save).not.toHaveBeenCalled();
  expect(industryValuationApi.recalculate).not.toHaveBeenCalled();
});

test("saves a first model configuration without inventing multiples", async () => {
  review = { ...review, current: null, canPropose: false };
  render(<IndustryValuationProposalPanel industryCode="I43" figi="TEST" reloadReport={reload} />);
  fireEvent.click(screen.getByRole("button", { name: "手動設定" }));
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "模型" }));
  fireEvent.click(screen.getByRole("option", { name: "PE" }));
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "主要指標" }));
  fireEvent.click(screen.getByRole("option", { name: "P/E" }));
  fireEvent.click(screen.getByRole("button", { name: "確認保存正式設定" }));
  await waitFor(() => expect(industryValuationApi.save).toHaveBeenCalledWith("I43", {
    baseEffectiveAt: null, modelCode: "PE", primaryMetric: "PE",
    assumedMultipleLow: null, assumedMultipleHigh: null, rationale: null, sourceUrl: null,
  }));
  expect(industryValuationApi.propose).not.toHaveBeenCalled();
  expect(industryValuationApi.recalculate).not.toHaveBeenCalled();
});

test.each(["假設倍數下限", "假設倍數上限"])("rejects a partial range when %s alone is empty", label => {
  render(<IndustryValuationProposalPanel industryCode="I43" figi="TEST" reloadReport={reload} />);
  fireEvent.click(screen.getByRole("button", { name: "手動設定" }));
  fireEvent.change(screen.getByLabelText(label), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "確認保存正式設定" }));
  expect(screen.getByText("倍數上下限須同時留空，或同時填寫有效正數區間。")).toBeTruthy();
  expect(industryValuationApi.save).not.toHaveBeenCalled();
});

test.each([
  { rationale: "", sourceUrl: "https://example.test/research" },
  { rationale: "人工確認的假設", sourceUrl: "" },
  { rationale: "人工確認的假設", sourceUrl: "ftp://example.test/research" },
])("requires a rationale and HTTP source for nonempty multiples: $sourceUrl / $rationale", input => {
  review = { ...review, current: { ...review.current!, ...input } };
  render(<IndustryValuationProposalPanel industryCode="I43" figi="TEST" reloadReport={reload} />);
  fireEvent.click(screen.getByRole("button", { name: "手動設定" }));
  fireEvent.click(screen.getByRole("button", { name: "確認保存正式設定" }));
  expect(industryValuationApi.save).not.toHaveBeenCalled();
});

test("preserves the draft baseEffectiveAt even when current config refreshes", async () => {
  const view = render(<IndustryValuationProposalPanel industryCode="I43" figi="TEST" reloadReport={reload} />);
  fireEvent.click(screen.getByRole("button", { name: "產生 AI 草稿" }));
  await screen.findByDisplayValue("待人工確認的假設");
  review = { ...review, current: { ...review.current!, effectiveAt: "2026-11-06T00:00:00Z" } };
  view.rerender(<IndustryValuationProposalPanel industryCode="I43" figi="TEST" reloadReport={reload} />);
  fireEvent.click(screen.getByRole("button", { name: "確認保存正式設定" }));
  await waitFor(() => expect(industryValuationApi.save).toHaveBeenCalledWith("I43", {
    baseEffectiveAt: "2026-11-01T00:00:00Z", modelCode: "PE", primaryMetric: "PE", assumedMultipleLow: 15, assumedMultipleHigh: 25,
    rationale: "待人工確認的假設", sourceUrl: "https://example.test/research",
  }));
  expect(industryValuationApi.recalculate).not.toHaveBeenCalled();
});

test.each([
  { industryCode: undefined, failed: false },
  { industryCode: "I43", failed: true },
])("allows first recalculation without an industry review: $industryCode / $failed", async ({ industryCode, failed }) => {
  (useQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, isError: failed, error: failed ? new Error("REVIEW_UNAVAILABLE") : null });
  render(<IndustryValuationProposalPanel industryCode={industryCode} figi="TEST" valuationDate="2026-11-05" reloadReport={reload} />);
  expect(industryValuationApi.recalculate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "重算此股估值" }));
  await waitFor(() => expect(industryValuationApi.recalculate).toHaveBeenCalledWith("TEST", "2026-11-05"));
  await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  expect(industryValuationApi.save).not.toHaveBeenCalled();
});

test("only recalculates the explicitly selected stock and valuation date", async () => {
  render(<IndustryValuationProposalPanel industryCode="I43" figi="TEST" valuationDate="2026-11-05" reloadReport={reload} />);
  fireEvent.click(screen.getByRole("button", { name: "重算此股估值" }));
  await waitFor(() => expect(industryValuationApi.recalculate).toHaveBeenCalledWith("TEST", "2026-11-05"));
  await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["valuation-history", "TEST"] });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["stock-screen"] });
});
