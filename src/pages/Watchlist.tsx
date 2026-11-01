import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import { useFetch, useMutate } from "../hooks/api/useApi";
import { apiConfig } from "../apiConfig";
import { Column } from "../components/DynamicFormTable/DynamicFormTable.types";
import DynamicFormTable from "../components/DynamicFormTable/DynamicFormTable";
import { MenuTree } from "../services/types/dto/menu";
import { WatchItem, WatchlistEnquiryResponse } from "../services/types/dto/watchlist";
import { useTranslation } from "react-i18next";
import { StockClassificationResponse } from "../services/types/dto/stock";

interface WatchListPageProps {
  menuTree: MenuTree;
}

type Option = { label: string; value: string };

type SearchState = {
  sector: string;
  valuationIndustry: string;
};

export function WatchListPage({ menuTree }: WatchListPageProps) {
  const [pageSize] = useState(10);
  const [allData, setAllData] = useState<WatchItem[]>([]);

  const { t } = useTranslation();
  const navigate = useNavigate();
  const initializedRef = useRef(false);

  const [searchState, setSearchState] = useState<SearchState>({
    sector: "",
    valuationIndustry: "",
  });

  const stockSearch = useMutate<WatchlistEnquiryResponse, any>(
    apiConfig.getWatchList,
    undefined,
    {
      onSuccess: (resp) => {
        setAllData(resp.watchItems ?? []);
      },
    }
  );

  const updateWatchList = useMutate<WatchlistEnquiryResponse, any>(
    apiConfig.updateWatchList
  );

  const { data: classificationResp } = useFetch<StockClassificationResponse>(
    apiConfig.getStockClassifications
  );

  const classificationOptions = useMemo(() => {
    const dictionary = classificationResp?.classifications ?? [];
    const optionsFor = (field: keyof SearchState, parents: (keyof SearchState)[]): Option[] => {
      const names = dictionary
        .filter((row) => parents.every((parent) => !searchState[parent] || row[parent] === searchState[parent]))
        .map((row) => row[field])
        .filter(Boolean);
      return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
        .map((name) => ({ label: name, value: name }));
    };
    return {
      sector: optionsFor("sector", []),
      valuationIndustry: optionsFor("valuationIndustry", ["sector"]),
    };
  }, [classificationResp, searchState]);

  const columns: Column[] = useMemo(
    () => [
      { id: "watched", type: "checkbox", label: t("watchlist.columns.watched"), width: 140,
        onChange: (value, row) => {
          updateWatchList.mutate({
            figi: row.figi,
            watched: value,
          });
        },
      },
      { id: "symbol", type: "text", label: t("watchlist.columns.symbol"), width: 200, uppercase: true, },
      { id: "stockType", type: "select", label: t("watchlist.columns.stockType"), width: 200, uppercase: true, },
      { id: "sector", type: "select", label: t("watchlist.columns.sector"), width: 200, selectOptions: classificationOptions.sector, },
      { id: "valuationIndustry", type: "select", label: t("watchlist.columns.valuationIndustry"), width: 200, selectOptions: classificationOptions.valuationIndustry, },
      { id: "quoteDate", type: "date", label: t("watchlist.columns.quoteDate"), width: 200, displayDateFormat: "yyyy-MM-dd", },
      { id: "closePrice", type: "number", label: t("watchlist.columns.closePrice"), width: 200, },
      { id: "pe", type: "number", label: t("watchlist.columns.pe"), width: 200, },
      { id: "rsi14", type: "number", label: "RSI (14D)", width: 200, },
      { id: "cashPerShare", type: "number", label: t("watchlist.columns.cashPerShare"), width: 200, },
    ],
    [t, updateWatchList, classificationOptions]
  );

  const handleSearch = useCallback(
    (criteria: Record<string, any>) => {
      const payload = {
        page: 1,
        pageSize,
        criteria,
      };
      stockSearch.mutate(payload);
    },
    [pageSize, stockSearch]
  );

  const handleSearchFieldChange = useCallback(
    (fieldId: string, value: any, allValues: Record<string, any>) => {
      setSearchState({
        sector: String(allValues.sector ?? ""),
        valuationIndustry: String(allValues.valuationIndustry ?? ""),
      });
    },
    []
  );

  useEffect(() => {
    if (initializedRef.current) return;
    handleSearch({});
    initializedRef.current = true;
  }, [handleSearch]);

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: 0,
      }}
    >
      <DynamicFormTable
        pageKey={menuTree.name}
        columns={columns}
        data={allData}
        loading={stockSearch.isPending}
        error={stockSearch.isError ? (stockSearch.error as any) : null}
        enableInfiniteScroll={false}
        onSearch={handleSearch}
        onSearchFieldChange={handleSearchFieldChange}
        onRowDoubleClick={(row) => navigate(`/stockAnalysis/${encodeURIComponent((row as WatchItem).figi)}`)}
      />
    </Box>
  );
}
