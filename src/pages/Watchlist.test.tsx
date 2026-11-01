import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { apiConfig } from "../apiConfig";
import { useFetch, useMutate } from "../hooks/api/useApi";
import { WatchListPage } from "./Watchlist";

jest.mock("../hooks/api/useApi", () => ({ useFetch: jest.fn(), useMutate: jest.fn() }));
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("../components/DynamicFormTable/hooks/useInfiniteScroll", () => ({
  useInfiniteScroll: () => ({ lastElementRef: () => undefined }),
}));

const classifications = [
  { code: "HARDWARE", sector: "Technology", valuationIndustry: "Hardware" },
  { code: "SOFTWARE", sector: "Technology", valuationIndustry: "Software" },
  { code: "BANKS", sector: "Financials", valuationIndustry: "Banks" },
];
const stockSearch = jest.fn();
const update = { mutate: jest.fn() };
const dictionaryResponse = { data: { classifications } };
const emptyDictionaryResponse = { data: { classifications: [] } };
const criteriaResponse = { data: { disabledFields: [] }, isLoading: false };
let onStockSuccess: (response: unknown) => void;
const search = {
  mutate: (payload: unknown) => {
    stockSearch(payload);
    onStockSuccess({ watchItems: [{ figi: "AAPL-FIGI", symbol: "AAPL", watched: true, ...classifications[0] }] });
  },
  isPending: false,
  isError: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  (useFetch as jest.Mock).mockImplementation((endpoint) => endpoint === apiConfig.getStockClassifications
    ? dictionaryResponse : criteriaResponse);
  (useMutate as jest.Mock).mockImplementation((endpoint, _params, options) => {
    if (endpoint === apiConfig.getWatchList) {
      onStockSuccess = options.onSuccess;
      return search;
    }
    return update;
  });
});

function filter(field: string) {
  const label = screen.getAllByText(`watchlist.columns.${field}`)[0];
  return within(label.parentElement!.parentElement!).getByRole("combobox");
}

function choose(field: string, option: string) {
  fireEvent.mouseDown(filter(field));
  fireEvent.click(screen.getByRole("option", { name: option }));
}

function renderPage() {
  render(<WatchListPage menuTree={{ menuId: "watchlist", name: "watchlist", path: "/watchlist" }} />);
}

test("shows sector and valuation industry and submits only those classification criteria", () => {
  renderPage();
  expect(screen.getByRole("cell", { name: "Technology" })).toBeTruthy();
  expect(screen.getByRole("cell", { name: "Hardware" })).toBeTruthy();
  for (const field of ["industryGroup", "industry", "subIndustry"]) {
    expect(screen.queryByText(`watchlist.columns.${field}`)).toBeNull();
  }
  choose("sector", "Technology");
  choose("valuationIndustry", "Hardware");
  fireEvent.click(screen.getByRole("button", { name: "common.search" }));
  expect(stockSearch).toHaveBeenLastCalledWith({ page: 1, pageSize: 10,
    criteria: { sector: "Technology", valuationIndustry: "Hardware" } });
});

test("changing sector clears valuation industry and restricts its options", () => {
  renderPage();
  choose("sector", "Technology");
  choose("valuationIndustry", "Hardware");
  choose("sector", "Financials");
  fireEvent.click(screen.getByRole("button", { name: "common.search" }));
  expect(stockSearch).toHaveBeenLastCalledWith(expect.objectContaining({ criteria: { sector: "Financials" } }));
  fireEvent.mouseDown(filter("valuationIndustry"));
  expect(screen.getByRole("option", { name: "Banks" })).toBeTruthy();
  expect(screen.queryByRole("option", { name: "Hardware" })).toBeNull();
  expect(screen.queryByRole("option", { name: "Software" })).toBeNull();
});

test("an empty dictionary does not create classification options from stock rows", () => {
  (useFetch as jest.Mock).mockImplementation((endpoint) => endpoint === apiConfig.getStockClassifications
    ? emptyDictionaryResponse : criteriaResponse);
  renderPage();
  fireEvent.mouseDown(filter("valuationIndustry"));
  expect(screen.queryByRole("option", { name: "Hardware" })).toBeNull();
});
