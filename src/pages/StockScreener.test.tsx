import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { StockScreenerPage } from "./StockScreener";
import { apiClient } from "../services/apiClient";

const mockNavigate = jest.fn();
jest.mock("@tanstack/react-query", () => ({ useQuery: jest.fn() }));
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }), { virtual: true });
jest.mock("../services/apiClient", () => ({ apiClient: { get: jest.fn(), post: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  (useQuery as jest.Mock).mockImplementation((options: any) => ({
    isFetching: false, isError: false,
    data: options.queryKey[0] === "stock-classifications" ? {
      classifications: [{ code: "I1", industry: "科技", sourcePlateCode: null }, { code: "I2", industry: "銀行", sourcePlateCode: null }],
      concepts: [{ code: "AI", name: "人工智能" }, { code: "CLOUD", name: "雲端" }],
    } : { items: [{ figi: "TEST-FIGI", symbol: "TEST", name: "測試公司", stockType: "CS", industryCode: "I1", industry: "科技",
      concepts: [{ code: "AI", name: "人工智能" }, { code: "CLOUD", name: "雲端" }],
      quoteDate: "2026-11-05", closePrice: 100, valuationDate: "2026-11-05", pe: null, pb: 2, ps: null, pfcf: null, evEbitda: null,
      status: "PARTIAL", reasonCode: "MISSING_INPUT" }], total: 1, page: 0, size: 50 },
  }));
  (apiClient.get as jest.Mock).mockResolvedValue({ data: { items: [], total: 0, page: 0, size: 50 } });
});

test("shows the whole-market screener with all concepts and no personal watchlist controls", () => {
  render(<StockScreenerPage />);
  expect(screen.getByText("人工智能、雲端")).toBeTruthy();
  expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "TEST" }));
  expect(mockNavigate).toHaveBeenCalledWith("/stockAnalysis/TEST-FIGI");
});

test("sends server-side filters using concept code and resets to zero-based first page", async () => {
  render(<StockScreenerPage />);
  fireEvent.change(screen.getByLabelText("股票代碼"), { target: { value: " aapl " } });
  fireEvent.mouseDown(screen.getByLabelText("概念"));
  fireEvent.click(screen.getByRole("option", { name: "人工智能" }));
  fireEvent.click(screen.getByRole("button", { name: "搜尋" }));
  const calls = (useQuery as jest.Mock).mock.calls.filter(([options]) => options.queryKey[0] === "stock-screen");
  await calls[calls.length - 1][0].queryFn();
  expect(apiClient.get).toHaveBeenLastCalledWith("stock/screen", { params: {
    symbol: "AAPL", industry: undefined, conceptCode: "AI", page: 0, size: 50,
  } });
});
