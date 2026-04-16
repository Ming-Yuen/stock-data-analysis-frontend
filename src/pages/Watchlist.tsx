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

export function WatchListPage({ menuTree }: WatchListPageProps) {
  const [pageSize] = useState(10);
  const [allData, setAllData] = useState<WatchItem[]>([]);
  const [hasMore] = useState(true);

  const { t, i18n } = useTranslation();

  // ✅ 1. 新增 Ref 用於防止 useEffect 重複執行
  const initializedRef = useRef(false);

  // 用 mutation：只在 Search 时打 API
  const stockSearch = useMutate<WatchlistEnquiryResponse, any>(apiConfig.getWatchList, undefined, {
    onSuccess: (resp) => {
      setAllData(resp.watchItems ?? []);
    },
  });

  const updateWatchList = useMutate<WatchlistEnquiryResponse, any>(apiConfig.updateWatchList);

  const { data: classificationResp } = useFetch<StockClassificationResponse>(apiConfig.getStockClassifications);
  
  // 把 API 回傳轉成 options
  const { industryOptions, categoryOptions, subCategoryOptions } = useMemo(() => {
    const setIndustry = new Set<string>();
    const setCategory = new Set<string>();
    const setSubCategory = new Set<string>();
  
    classificationResp?.stockClassificationTrees?.forEach((tree) => {
      if (tree.industry) {
        setIndustry.add(tree.industry);
      }
  
      tree.categories?.forEach((categoryNode) => {
        if (categoryNode.category) {
          setCategory.add(categoryNode.category);
        }
  
        categoryNode.subCategories?.forEach((subCategory) => {
          if (subCategory) {
            setSubCategory.add(subCategory);
          }
        });
      });
    });
  
    const toOptions = (values: Set<string>) =>
      Array.from(values).map((v) => ({ label: v, value: v }));
  
    return {
      industryOptions: toOptions(setIndustry),
      categoryOptions: toOptions(setCategory),
      subCategoryOptions: toOptions(setSubCategory),
    };
  }, [classificationResp]);

  const columns: Column[] = useMemo(
    () => [
      {id: "watched", type: "checkbox", label: t("Watched"), width: 140,
        onChange: (value, row) => {
          updateWatchList.mutate({
            figi: row.figi,
            watched: value,
          });
        },
      },
      { id: "symbol",       type:"text",    label: t("symbol"),         width: 200,   uppercase: true },
      { id: "industry",     type:"select",  label: t("industry"),       width: 200 ,  translateValue:true,  selectOptions: industryOptions},
      { id: "category",     type:"select",  label: t("category"),       width: 200,   translateValue: true, selectOptions: categoryOptions},
      { id: "subCategory",  type:"select",  label: t("SubCategory"),    width: 200,   translateValue: true, selectOptions: subCategoryOptions},
      { id: "quoteDate",    type: "date",   label: t("Quote Date"),     width: 200,   displayDateFormat: "yyyy-MM-dd" },
      { id: "closePrice",   type: "number", label: t("Close Price"),    width: 200 },
      { id: "pe",           type: "number", label: t("PE"),             width: 200 },
      { id: "rsi",          type: "number", label: t("RSI"),            width: 200 },
      { id: "cashPerShare", type: "number", label: t("Cash Per Share"), width: 200 },
      // { id: "upside", type: "number", label: "Upside (%)", width: 200 },
    ],
    [t, updateWatchList, industryOptions, subCategoryOptions]
  );

  const handleSearch = useCallback(
    (criteria: Record<string, any>) => {
      const payload = {
        page: 1,
        pageSize,
        criteria, // 来自 DynamicFormTable，已过滤“空值”
      };
      stockSearch.mutate(payload);
    },
    [pageSize, stockSearch]
  );

  // ✅ 2. 修改：使用 initializedRef 防止無限迴圈
  useEffect(() => {
    // 如果已經初始化過，直接返回，不再觸發 API
    if (initializedRef.current) return;

    // 傳入空物件 {} 代表沒有篩選條件，即載入預設列表
    handleSearch({});

    // 標記為已初始化
    initializedRef.current = true;
  }, [handleSearch]);

  return (
    <Box sx={{width: "100%", display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, }} >
      <DynamicFormTable pageKey={menuTree.name} title={menuTree.name} columns={columns} data={allData} loading={stockSearch.isPending} error={stockSearch.isError ? (stockSearch.error as any) : null} hasMore={hasMore} enableInfiniteScroll={true} onSearch={handleSearch} />
    </Box>
  );
}
