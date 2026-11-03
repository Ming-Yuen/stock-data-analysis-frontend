import { apiClient } from "./apiClient";
import { industryValuationApi } from "./industryValuationApi";
import { Job } from "./types/dto/batch";
import { apiConfig } from "../apiConfig";

jest.mock("./apiClient", () => ({ apiClient: { get: jest.fn(), post: jest.fn() } }));

beforeEach(() => jest.clearAllMocks());

test("uses the job returned by the backend and targets only the current FIGI", async () => {
  (apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true } });
  await industryValuationApi.recalculate({ taskCode: "BACKEND_TASK", taskGroup: "SCHEDULE", jobParams: { figis: "OTHER", fullUniverse: true } } as unknown as Job, "CURRENT-FIGI");
  expect(apiClient.post).toHaveBeenCalledWith(apiConfig.launchJobList.url, {
    taskCode: "BACKEND_TASK", taskGroup: "SCHEDULE", jobParams: { figis: "CURRENT-FIGI" },
  });
});

test("reads the direct proposal response and sends approval only to the explicitly selected proposal", async () => {
  const review = { industryCode: "I43", availableActions: [] };
  (apiClient.get as jest.Mock).mockResolvedValue({ data: review });
  expect(await industryValuationApi.review("I43")).toBe(review);
  expect(apiClient.post).not.toHaveBeenCalled();
  const approval = { review, recalculationRequired: true, recalculationTaskCode: "BACKEND_TASK" };
  (apiClient.post as jest.Mock).mockResolvedValue({ data: approval });
  expect(await industryValuationApi.approve("I43", "draft-id")).toBe(approval);
  expect(apiClient.post).toHaveBeenCalledWith("industry-valuation/I43/proposals/draft-id/approve");
});
