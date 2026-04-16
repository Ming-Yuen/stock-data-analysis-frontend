import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
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

type StockClassificationTree = {
  industry: string;
  categories: {
    category: string;
    subCategories: string[];
  }[];
};

type Option = { label: string; value: string };

type SearchState = {
  industry: string;
  category: string;
  subCategory: string;
};

export function WatchListPage({ menuTree }: WatchListPageProps) {
  const [pageSize] = useState(10);
  const [allData, setAllData] = useState<WatchItem[]>([]);
  const [hasMore] = useState(true);

  const { t } = useTranslation();
  const initializedRef = useRef(false);

  const [rawClassificationData, setRawClassificationData] = useState<StockClassificationTree[]>([]);
  const [searchState, setSearchState] = useState<SearchState>({
    industry: "",
    category: "",
    subCategory: "",
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

  useEffect(() => {
    setRawClassificationData(classificationResp?.stockClassificationTrees ?? []);
  }, [classificationResp]);

  const industryOptions = useMemo<Option[]>(() => {
    const setIndustry = new Set<string>();
    rawClassificationData.forEach((tree) => {
      if (tree.industry) {
        setIndustry.add(tree.industry);
      }
    });
    return Array.from(setIndustry).map((v) => ({ label: v, value: v }));
  }, [rawClassificationData]);

  const categoryOptions = useMemo<Option[]>(() => {
    const setCategory = new Set<string>();

    rawClassificationData
      .filter((tree) => !searchState.industry || tree.industry === searchState.industry)
      .forEach((tree) => {
        tree.categories?.forEach((categoryNode) => {
          if (categoryNode.category) {
            setCategory.add(categoryNode.category);
          }
        });
      });

    return Array.from(setCategory).map((v) => ({ label: v, value: v }));
  }, [rawClassificationData, searchState.industry]);

  const subCategoryOptions = useMemo<Option[]>(() => {
    const setSubCategory = new Set<string>();

    rawClassificationData
      .filter((tree) => !searchState.industry || tree.industry === searchState.industry)
      .forEach((tree) => {
        tree.categories
          ?.filter(
            (categoryNode) =>
              !searchState.category || categoryNode.category === searchState.category
          )
          .forEach((categoryNode) => {
            categoryNode.subCategories?.forEach((subCategory) => {
              if (subCategory) {
                setSubCategory.add(subCategory);
              }
            });
          });
      });

    return Array.from(setSubCategory).map((v) => ({ label: v, value: v }));
  }, [rawClassificationData, searchState.industry, searchState.category]);

  const columns: Column[] = useMemo(
    () => [
      {
        id: "watched",
        type: "checkbox",
        label: t("Watched"),
        width: 140,
        onChange: (value, row) => {
          updateWatchList.mutate({
            figi: row.figi,
            watched: value,
          });
        },
      },
      {
        id: "symbol",
        type: "text",
        label: t("symbol"),
        width: 200,
        uppercase: true,
      },
      {
        id: "industry",
        type: "select",
        label: t("industry"),
        width: 200,
        translateValue: true,
        selectOptions: industryOptions,
      },
      {
        id: "category",
        type: "select",
        label: t("category"),
        width: 200,
        translateValue: true,
        selectOptions: categoryOptions,
      },
      {
        id: "subCategory",
        type: "select",
        label: t("SubCategory"),
        width: 200,
        translateValue: true,
        selectOptions: subCategoryOptions,
      },
      {
        id: "quoteDate",
        type: "date",
        label: t("Quote Date"),
        width: 200,
        displayDateFormat: "yyyy-MM-dd",
      },
      {
        id: "closePrice",
        type: "number",
        label: t("Close Price"),
        width: 200,
      },
      {
        id: "pe",
        type: "number",
        label: t("PE"),
        width: 200,
      },
      {
        id: "rsi",
        type: "number",
        label: t("RSI"),
        width: 200,
      },
      {
        id: "cashPerShare",
        type: "number",
        label: t("Cash Per Share"),
        width: 200,
      },
    ],
    [t, updateWatchList, industryOptions, categoryOptions, subCategoryOptions]
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
        industry: String(allValues.industry ?? ""),
        category: String(allValues.category ?? ""),
        subCategory: String(allValues.subCategory ?? ""),
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
        title={menuTree.name}
        columns={columns}
        data={allData}
        loading={stockSearch.isPending}
        error={stockSearch.isError ? (stockSearch.error as any) : null}
        hasMore={hasMore}
        enableInfiniteScroll={true}
        onSearch={handleSearch}
        onSearchFieldChange={handleSearchFieldChange}
      />
    </Box>
  );
}