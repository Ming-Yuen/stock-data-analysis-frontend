import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DataUploadPage } from "./DataUpload";
import { apiClient } from "../services/apiClient";

jest.mock("../services/apiClient", () => ({ apiClient: { post: jest.fn(), get: jest.fn() } }));
jest.mock("react-i18next", () => {
  const translations: Record<string, string> = { "upload.types.STOCK_INDUSTRY": "Stock industry update" };
  const t = (key: string, options?: { defaultValue?: string }) => translations[key] ?? options?.defaultValue ?? key;
  return { useTranslation: () => ({ t }) };
});
const mockInvalidateQueries = jest.fn();
const mockQueryClient = { invalidateQueries: mockInvalidateQueries };
jest.mock("@tanstack/react-query", () => ({ useQueryClient: () => mockQueryClient }));

const id = "11111111-1111-4111-8111-111111111111";
const completed = { id, fileName: "stocks.csv", status: "COMPLETED", result: { totalRows: 2, updated: 1, unchanged: 0,
  createdIndustries: 1, missingIndustry: 1, unmatched: 0, ambiguous: 0,
  issues: [{ row: 3, symbol: "BBB", reason: "MISSING_INDUSTRY" }] } };
beforeEach(() => {
  jest.clearAllMocks(); localStorage.clear();
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: { randomUUID: () => id } });
  (apiClient.get as jest.Mock).mockImplementation((url: string) => Promise.resolve({
    data: url === "upload/types" ? ["STOCK_INDUSTRY"] : completed,
  }));
  (apiClient.post as jest.Mock).mockResolvedValue({ data: { id, fileName: "stocks.csv", status: "PENDING", result: null } });
});
afterEach(() => jest.useRealTimers());
function chooseFile() {
  const file = new File(["Symbol,Name,Industry\nAAA,Alpha,Software"], "stocks.csv", { type: "text/csv" });
  fireEvent.change(screen.getByLabelText("upload.selectFile"), { target: { files: [file] } });
  return file;
}

async function waitForTypes() {
  await waitFor(() => expect(screen.getByRole("combobox").getAttribute("aria-disabled")).toBeNull());
}

test("uses only backend handler types and submits the returned value", async () => {
  (apiClient.get as jest.Mock).mockImplementation((url: string) => Promise.resolve({
    data: url === "upload/types" ? ["OTHER_UPLOAD"] : completed,
  }));
  render(<DataUploadPage />);
  await waitForTypes();
  fireEvent.mouseDown(screen.getByRole("combobox"));
  expect(await screen.findByRole("option", { name: "OTHER_UPLOAD" })).toBeTruthy();
  expect(screen.queryByRole("option", { name: "Stock industry update" })).toBeNull();
  fireEvent.click(screen.getByRole("option", { name: "OTHER_UPLOAD" }));
  chooseFile();
  fireEvent.click(screen.getByRole("button", { name: "upload.submit" }));
  await screen.findByText("upload.completed");
  const body = (apiClient.post as jest.Mock).mock.calls[0][1] as FormData;
  expect(body.get("type")).toBe("OTHER_UPLOAD");
});

test("submits a task ID and shows results from status polling", async () => {
  render(<DataUploadPage />);
  expect((screen.getByRole("button", { name: "upload.submit" }) as HTMLButtonElement).disabled).toBe(true);
  const file = chooseFile();
  await waitForTypes();
  expect(screen.getByText("Stock industry update")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "upload.submit" }));
  await screen.findByText("upload.completed");
  const body = (apiClient.post as jest.Mock).mock.calls[0][1] as FormData;
  expect(body.get("type")).toBe("STOCK_INDUSTRY"); expect(body.get("file")).toBe(file); expect(body.get("id")).toBe(id);
  expect(screen.getByText("BBB")).toBeTruthy(); expect(mockInvalidateQueries).toHaveBeenCalled();
});

test("a timed out POST keeps polling the known ID and can still show success", async () => {
  (apiClient.post as jest.Mock).mockRejectedValue(new Error("timeout"));
  render(<DataUploadPage />); chooseFile();
  await waitForTypes();
  fireEvent.click(screen.getByRole("button", { name: "upload.submit" }));
  await screen.findByText("upload.completed");
  expect(localStorage.getItem("stock-industry-upload-job")).toBe(id);
  expect(apiClient.get).toHaveBeenCalledWith(`upload/${id}`);
});

test("refresh resumes a persisted task without uploading again", async () => {
  localStorage.setItem("stock-industry-upload-job", id);
  render(<DataUploadPage />);
  await screen.findByText("upload.completed");
  expect(apiClient.post).not.toHaveBeenCalled();
});

test("a restarted backend shows failed and allows manual resubmission", async () => {
  localStorage.setItem("stock-industry-upload-job", id);
  (apiClient.get as jest.Mock).mockImplementation((url: string) => Promise.resolve({ data: url === "upload/types"
    ? ["STOCK_INDUSTRY"] : { id, fileName: "stocks.csv", status: "FAILED", error: "BACKEND_RESTARTED", result: null } }));
  render(<DataUploadPage />);
  await screen.findByText("upload.restarted");
  await waitForTypes();
  expect(screen.queryByText("upload.completed")).toBeNull();
  chooseFile(); expect((screen.getByRole("button", { name: "upload.submit" }) as HTMLButtonElement).disabled).toBe(false);
});

test("does not allow a second submission while background processing continues", async () => {
  localStorage.setItem("stock-industry-upload-job", id);
  (apiClient.get as jest.Mock).mockImplementation((url: string) => Promise.resolve({ data: url === "upload/types"
    ? ["STOCK_INDUSTRY"] : { id, fileName: "stocks.csv", status: "PROCESSING", result: null } }));
  render(<DataUploadPage />);
  await screen.findByText(/upload.states.PROCESSING/);
  expect((screen.getByRole("button", { name: "upload.submit" }) as HTMLButtonElement).disabled).toBe(true);
});

test("rejects a non CSV file before calling the server", async () => {
  render(<DataUploadPage />);
  await waitForTypes();
  fireEvent.change(screen.getByLabelText("upload.selectFile"), { target: { files: [new File(["x"], "bad.zip")] } });
  expect(screen.getByText("upload.invalidFile")).toBeTruthy(); expect(apiClient.post).not.toHaveBeenCalled();
});

test("keeps submission disabled while handler types are loading", () => {
  (apiClient.get as jest.Mock).mockReturnValue(new Promise(() => {}));
  render(<DataUploadPage />);
  chooseFile();
  expect(screen.getByText("upload.typesLoading")).toBeTruthy();
  expect((screen.getByRole("button", { name: "upload.submit" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "upload.submit" }));
  expect(apiClient.post).not.toHaveBeenCalled();
});

test("an empty backend list provides no hard-coded fallback and prevents submission", async () => {
  (apiClient.get as jest.Mock).mockResolvedValue({ data: [] });
  render(<DataUploadPage />);
  chooseFile();
  await screen.findByText("upload.typesEmpty");
  expect(screen.getByRole("combobox").getAttribute("aria-disabled")).toBe("true");
  expect(screen.queryByText("Stock industry update")).toBeNull();
  expect((screen.getByRole("button", { name: "upload.submit" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "upload.submit" }));
  expect(apiClient.post).not.toHaveBeenCalled();
});

test("a type lookup failure prevents submission but keeps the persisted job visible", async () => {
  localStorage.setItem("stock-industry-upload-job", id);
  (apiClient.get as jest.Mock).mockImplementation((url: string) => url === "upload/types"
    ? Promise.reject(new Error("unavailable")) : Promise.resolve({ data: completed }));
  render(<DataUploadPage />);
  chooseFile();
  await screen.findByText("upload.typesFailed");
  await screen.findByText("upload.completed");
  expect(screen.queryByText("Stock industry update")).toBeNull();
  expect((screen.getByRole("button", { name: "upload.submit" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "upload.submit" }));
  expect(apiClient.post).not.toHaveBeenCalled();
});
