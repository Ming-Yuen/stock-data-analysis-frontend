import { apiClient } from "./apiClient";
import { industryValuationApi } from "./industryValuationApi";

jest.mock("./apiClient", () => ({ apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn() } }));
beforeEach(() => {
  jest.clearAllMocks();
  (apiClient.get as jest.Mock).mockResolvedValue({ data: {} });
  (apiClient.post as jest.Mock).mockResolvedValue({ data: {} });
  (apiClient.put as jest.Mock).mockResolvedValue({ data: {} });
});

test("uses synchronous proposal response without proposal IDs or polling", async () => {
  await industryValuationApi.propose("I43");
  expect(apiClient.post).toHaveBeenCalledWith("industry-valuation/I43/proposals", undefined, { timeout: 0 });
});

test("saves only the explicitly confirmed config with concurrency baseline", async () => {
  const input = { baseEffectiveAt: "2026-11-01T00:00:00Z", modelCode: "PE", primaryMetric: "PE",
    assumedMultipleLow: 15, assumedMultipleHigh: 25, rationale: "人工確認", sourceUrl: null };
  await industryValuationApi.save("I43", input);
  expect(apiClient.put).toHaveBeenCalledWith("industry-valuation/I43/config", input);
});

test("recalculates one stock and one date without a watchlist or schedule parameter", async () => {
  await industryValuationApi.recalculate("TEST-FIGI", "2026-11-05");
  expect(apiClient.post).toHaveBeenCalledWith("valuation/recalculate", { figi: "TEST-FIGI", from: "2026-11-05", through: "2026-11-05" });
});
