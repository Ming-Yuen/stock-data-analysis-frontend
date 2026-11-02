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
  { code: "I1", industry: "Hardware" },
  { code: "I2", industry: "Software" },
  { code: "I3", industry: "Banks" },
];
const concepts = [{ code: "C1", name: "Cloud" }, { code: "C2", name: "AI" }, { code: "C10", name: "Finance" }];
const stockSearch = jest.fn();
const update = { mutate: jest.fn() };
const dictionaryResponse = { data: { classifications, concepts } };
const emptyDictionaryResponse = { data: { classifications: [], concepts: [] } };
const criteriaResponse = { data: { disabledFields: [] }, isLoading: false };
let onStockSuccess: (response: unknown) => void;
let stockConcepts = concepts.slice(0, 2);
const search = {
  mutate: (payload: unknown) => {
    stockSearch(payload);
    onStockSuccess({ watchItems: [{ figi: "AAPL-FIGI", symbol: "AAPL", watched: true,
      industry: "Hardware", concepts: stockConcepts }] });
  },
  isPending: false,
  isError: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  stockConcepts = concepts.slice(0, 2);
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

test("shows all stock concepts and submits independent concept code and industry", () => {
  renderPage();
  expect(screen.getByRole("cell", { name: "Cloud, AI" })).toBeTruthy();
  expect(screen.getByRole("cell", { name: "Hardware" })).toBeTruthy();
  for (const field of ["sector", "valuationIndustry", "industryGroup", "subIndustry"]) {
    expect(screen.queryByText(`watchlist.columns.${field}`)).toBeNull();
  }
  choose("conceptCode", "Cloud");
  choose("industry", "Hardware");
  fireEvent.click(screen.getByRole("button", { name: "common.search" }));
  expect(stockSearch).toHaveBeenLastCalledWith({ page: 1, pageSize: 10,
    criteria: { conceptCode: "C1", industry: "Hardware" } });
  expect(screen.getByRole("cell", { name: "Cloud, AI" })).toBeTruthy();
});

test("changing a concept preserves the industry and does not restrict industry options", () => {
  renderPage();
  choose("conceptCode", "Cloud");
  choose("industry", "Hardware");
  choose("conceptCode", "AI");
  fireEvent.click(screen.getByRole("button", { name: "common.search" }));
  expect(stockSearch).toHaveBeenLastCalledWith(expect.objectContaining({ criteria: { conceptCode: "C2", industry: "Hardware" } }));
  fireEvent.mouseDown(filter("industry"));
  expect(screen.getByRole("option", { name: "Banks" })).toBeTruthy();
  expect(screen.getByRole("option", { name: "Hardware" })).toBeTruthy();
  expect(screen.getByRole("option", { name: "Software" })).toBeTruthy();
});

test("an empty dictionary does not create classification options from stock rows", () => {
  (useFetch as jest.Mock).mockImplementation((endpoint) => endpoint === apiConfig.getStockClassifications
    ? emptyDictionaryResponse : criteriaResponse);
  renderPage();
  fireEvent.mouseDown(filter("industry"));
  expect(screen.queryByRole("option", { name: "Hardware" })).toBeNull();
  fireEvent.click(screen.getByRole("option", { name: "All" }));
  fireEvent.mouseDown(filter("conceptCode"));
  expect(screen.queryByRole("option", { name: "Cloud" })).toBeNull();
  expect(screen.queryByRole("option", { name: "AI" })).toBeNull();
});

test("a concept filter matches a stock's second concept", () => {
  renderPage();
  choose("conceptCode", "AI");
  expect(screen.getByRole("cell", { name: "AAPL" })).toBeTruthy();
});

test("concept filters use an exact code rather than a code prefix", () => {
  stockConcepts = [concepts[2]];
  renderPage();
  choose("conceptCode", "Cloud");
  expect(screen.queryByRole("cell", { name: "AAPL" })).toBeNull();
  choose("conceptCode", "Finance");
  expect(screen.getByRole("cell", { name: "AAPL" })).toBeTruthy();
});
