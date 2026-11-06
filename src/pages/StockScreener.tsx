import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Alert, Box, Button, CircularProgress, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from "@mui/material";
import { apiClient } from "../services/apiClient";
import { apiConfig } from "../apiConfig";
import { StockClassificationResponse, StockScreenResponse } from "../services/types/dto/stock";
import { formatNumber, statusLabel } from "./AnalysisPanels";

const emptyFilters = { symbol: "", industry: "", conceptCode: "" };
const pageSize = 50;

export function StockScreenerPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(0);
  const classifications = useQuery<StockClassificationResponse>({
    queryKey: ["stock-classifications"],
    queryFn: async () => (await apiClient.post<StockClassificationResponse>(apiConfig.getStockClassifications.url, {})).data,
  });
  const stocks = useQuery<StockScreenResponse>({
    queryKey: ["stock-screen", filters, page],
    queryFn: async () => (await apiClient.get<StockScreenResponse>(apiConfig.getStockScreen.url, {
      params: { symbol: filters.symbol || undefined, industry: filters.industry || undefined,
        conceptCode: filters.conceptCode || undefined, page, size: pageSize },
    })).data,
  });
  const industries = useMemo(() => Array.from(new Set((classifications.data?.classifications ?? [])
    .map(row => row.industry).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [classifications.data]);
  const concepts = classifications.data?.concepts ?? [];
  const apply = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(0);
    setFilters({ ...draft, symbol: draft.symbol.trim().toUpperCase() });
  };

  return <Box sx={{ width: "100%", minWidth: 0 }}>
    <Typography variant="h5" fontWeight={800}>美股篩選</Typography>
    <Typography color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>全市場股票資料；按股票代碼、產業及概念篩選。點選股票代碼或雙擊資料列開啟分析。</Typography>
    <Paper component="form" variant="outlined" onSubmit={apply} sx={{ p: 2, mb: 2 }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
        <TextField label="股票代碼" size="small" value={draft.symbol} onChange={event => setDraft({ ...draft, symbol: event.target.value })} />
        <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
          <InputLabel id="stock-industry-label">產業</InputLabel>
          <Select labelId="stock-industry-label" label="產業" value={draft.industry} onChange={event => setDraft({ ...draft, industry: event.target.value })}>
            <MenuItem value="">全部產業</MenuItem>
            {industries.map(industry => <MenuItem key={industry} value={industry}>{industry}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
          <InputLabel id="stock-concept-label">概念</InputLabel>
          <Select labelId="stock-concept-label" label="概念" value={draft.conceptCode} onChange={event => setDraft({ ...draft, conceptCode: event.target.value })}>
            <MenuItem value="">全部概念</MenuItem>
            {concepts.map(concept => <MenuItem key={concept.code} value={concept.code}>{concept.name}</MenuItem>)}
          </Select>
        </FormControl>
        <Button type="submit" variant="contained" disabled={stocks.isFetching}>搜尋</Button>
        <Button onClick={() => { setDraft(emptyFilters); setFilters(emptyFilters); setPage(0); }}>重設</Button>
      </Stack>
    </Paper>
    {classifications.isError && <Alert severity="warning" sx={{ mb: 2 }}>分類選項載入失敗，仍可按股票代碼搜尋。</Alert>}
    {stocks.isError && <Alert severity="error" sx={{ mb: 2 }}>股票資料載入失敗：{(stocks.error as Error).message}</Alert>}
    <Paper variant="outlined">
      {stocks.isFetching && <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 2 }}><CircularProgress size={18} /><Typography>正在載入股票…</Typography></Stack>}
      <TableContainer sx={{ maxHeight: "65vh" }}>
        <Table size="small" stickyHeader aria-label="全市場股票篩選">
          <TableHead><TableRow>
            {["股票", "名稱", "產業", "概念", "收盤日", "收盤價", "估值日", "P/E", "P/B", "P/S", "P/FCF", "EV/EBITDA", "狀態"].map(label => <TableCell key={label} sx={{ whiteSpace: "nowrap" }}>{label}</TableCell>)}
          </TableRow></TableHead>
          <TableBody>
            {(stocks.data?.items ?? []).map(row => <TableRow hover key={row.figi} onDoubleClick={() => navigate("/stockAnalysis/" + encodeURIComponent(row.figi))}>
              <TableCell><Button size="small" onClick={() => navigate("/stockAnalysis/" + encodeURIComponent(row.figi))}>{row.symbol}</Button></TableCell>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.industry ?? "—"}</TableCell>
              <TableCell sx={{ minWidth: 180 }}>{row.concepts?.map(concept => concept.name).join("、") || "—"}</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>{row.quoteDate ?? "—"}</TableCell>
              <TableCell align="right">{formatNumber(row.closePrice)}</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>{row.valuationDate ?? "—"}</TableCell>
              {[row.pe, row.pb, row.ps, row.pfcf, row.evEbitda].map((value, index) => <TableCell align="right" key={index}>{formatNumber(value)}</TableCell>)}
              <TableCell title={row.reasonCode ?? undefined} sx={{ whiteSpace: "nowrap" }}>{statusLabel(row.status)}</TableCell>
            </TableRow>)}
            {!stocks.isFetching && !stocks.isError && !stocks.data?.items.length && <TableRow><TableCell colSpan={13} align="center">沒有符合條件的股票</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination component="div" count={stocks.data?.total ?? -1} page={page} rowsPerPage={pageSize} rowsPerPageOptions={[pageSize]}
        onPageChange={(_event, nextPage) => setPage(nextPage)} labelRowsPerPage="每頁"
        labelDisplayedRows={({ from, to, count }) => from + "–" + to + (count < 0 ? "，總數載入中" : "／" + count)} />
    </Paper>
  </Box>;
}
