import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Alert, Box, Button, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { apiClient } from "../services/apiClient";
import { Financials, FinancialValue, ValuationResult } from "../services/types/dto/valuation";
import { formatHongKongDateTime } from "../utils/hongKongTime";
import { formatNumber, metricLabel, reasonLabel, statusLabel } from "./AnalysisPanels";

export function SeriesChart({ title, points }: { title: string; points: Array<{ date: string; value: number | null }> }) {
  const ordered = [...points].filter(point => Number.isFinite(Date.parse(point.date))).sort((a, b) => a.date.localeCompare(b.date));
  const valid = ordered.filter(point => point.value != null && Number.isFinite(point.value));
  if (valid.length < 2) return <Typography color="text.secondary" sx={{ my: 2 }}>可用歷史資料不足，暫時無法繪製{title}。</Typography>;
  const minX = Date.parse(valid[0].date), maxX = Date.parse(valid[valid.length - 1].date);
  const values = valid.map(point => point.value as number);
  const minY = Math.min(...values), maxY = Math.max(...values), spanY = maxY - minY || Math.abs(maxY) * 0.01 || 1;
  const x = (date: string) => 70 + (Date.parse(date) - minX) / (maxX - minX || 1) * 650;
  const y = (value: number) => 175 - (value - minY) / spanY * 145;
  let connected = false;
  const path = ordered.map(point => {
    if (point.value == null || !Number.isFinite(point.value)) { connected = false; return ""; }
    const command = connected ? "L" : "M";
    connected = true;
    return command + x(point.date) + "," + y(point.value);
  }).join(" ");
  return <Box sx={{ width: "100%", overflowX: "auto", my: 1 }}>
    <svg role="img" aria-label={title} viewBox="0 0 750 215" style={{ width: "100%", minWidth: 360, maxHeight: 300 }}>
      <title>{title}</title>
      <line x1="70" x2="720" y1="175" y2="175" stroke="#b6c0cf" />
      <line x1="70" x2="720" y1="30" y2="30" stroke="#e1e6ed" />
      <text x="62" y="35" textAnchor="end" fontSize="11" fill="currentColor">{formatNumber(maxY)}</text>
      <text x="62" y="180" textAnchor="end" fontSize="11" fill="currentColor">{formatNumber(minY)}</text>
      <path d={path} fill="none" stroke="#1976d2" strokeWidth="2" />
      {valid.map(point => <circle key={point.date} cx={x(point.date)} cy={y(point.value as number)} r="2.5" fill="#1976d2">
        <title>{point.date + "：" + formatNumber(point.value)}</title>
      </circle>)}
      <text x="70" y="205" fontSize="11" fill="currentColor">{valid[0].date}</text>
      <text x="720" y="205" textAnchor="end" fontSize="11" fill="currentColor">{valid[valid.length - 1].date}</text>
    </svg>
  </Box>;
}

const financialLabels: Array<[keyof Financials, string, "money" | "perShare" | "shares"]> = [
  ["revenueTtm", "TTM 營業收入", "money"], ["netIncomeCommonTtm", "TTM 普通股淨利", "money"],
  ["epsTtm", "TTM 每股盈利", "perShare"], ["operatingCashFlowTtm", "TTM 營運現金流", "money"],
  ["capitalExpenditureTtm", "TTM 資本支出", "money"], ["freeCashFlowTtm", "TTM 自由現金流", "money"],
  ["ebitdaTtm", "TTM EBITDA", "money"], ["commonEquity", "普通股權益", "money"],
  ["sharesOutstanding", "已發行股數", "shares"], ["bookValuePerShare", "每股帳面值", "perShare"],
  ["totalDebt", "有息債務", "money"], ["cashLikeAssets", "現金及可計入的投資", "money"],
  ["preferredEquity", "優先股權益", "money"], ["noncontrollingInterest", "非控制權益", "money"],
];

export function FinancialsPanel({ financials }: { financials: Financials | null }) {
  const { t } = useTranslation();
  return <Paper component="section" aria-label="估值使用的財務數據" variant="outlined" sx={{ p: 2.5, mt: 2 }}>
    <Typography variant="h6" fontWeight={700}>估值使用的財務數據</Typography>
    <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>所有數值與期間由後端計算；缺失與不適用的資料保持空缺，不以零補值。</Typography>
    {!financials ? <Typography sx={{ mt: 2 }}>尚無財務數據</Typography> : <TableContainer sx={{ mt: 1 }}>
      <Table size="small">
        <TableHead><TableRow>{["指標", "數值", "單位", "財務期間", "可用時間（香港）", "狀態／計算口徑"].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
        <TableBody>{financialLabels.map(([key, label, unit]) => {
          const value = financials[key] as FinancialValue | undefined;
          return <TableRow key={key}>
            <TableCell sx={{ whiteSpace: "nowrap" }}>{label}</TableCell>
            <TableCell align="right">{value?.status === "AVAILABLE" ? formatNumber(value.value) : "—"}</TableCell>
            <TableCell>{unit === "shares" ? "股" : financials.reportingCurrency ? financials.reportingCurrency + (unit === "perShare" ? "／股" : "") : "—"}</TableCell>
            <TableCell sx={{ whiteSpace: "nowrap" }}>{value?.periodStart && value.periodEnd && value.periodStart !== value.periodEnd
              ? value.periodStart + " 至 " + value.periodEnd : value?.periodEnd ?? "—"}</TableCell>
            <TableCell>{value?.availableAt ? formatHongKongDateTime(value.availableAt, "zh-HK") : "—"}</TableCell>
            <TableCell>{statusLabel(value?.status)}
              {value?.status !== "AVAILABLE" && <Typography variant="caption" display="block">{reasonLabel(t, value?.reasonCode)}</Typography>}
              {value?.calculation && <Typography variant="caption" display="block" color="text.secondary">{value.calculation}</Typography>}
            </TableCell>
          </TableRow>;
        })}</TableBody>
      </Table>
    </TableContainer>}
  </Paper>;
}

export function ValuationHistoryPanel({ figi, initial }: { figi: string; initial: ValuationResult[] }) {
  const sortedInitial = useMemo(() => [...initial].sort((a, b) => a.valuationDate.localeCompare(b.valuationDate)), [initial]);
  const [metric, setMetric] = useState<keyof ValuationResult["metrics"]>("pe");
  const [draft, setDraft] = useState({ from: sortedInitial[0]?.valuationDate ?? "", through: sortedInitial[sortedInitial.length - 1]?.valuationDate ?? "" });
  const [range, setRange] = useState<{ from: string; through: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const history = useQuery<ValuationResult[]>({
    queryKey: ["valuation-history", figi, range],
    enabled: range != null,
    queryFn: async () => (await apiClient.get<ValuationResult[]>("valuation/" + encodeURIComponent(figi) + "/history", {
      params: { ...range, frequency: "MONTH_END" },
    })).data,
  });
  const rows = [...(range ? history.data ?? [] : initial)].sort((a, b) => a.valuationDate.localeCompare(b.valuationDate));
  const metricCodes = Object.keys(rows[0]?.metrics ?? initial[0]?.metrics ?? {}) as Array<keyof ValuationResult["metrics"]>;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.from || !draft.through || draft.from > draft.through) { setError("請選擇有效的開始及結束日期。"); return; }
    setError(null);
    setRange({ ...draft });
  };
  return <Paper component="section" aria-label="歷史估值" variant="outlined" sx={{ p: 2.5, mt: 2 }}>
    <Typography variant="h6" fontWeight={700}>歷史估值</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>讀取已計算的歷史結果；查詢日期區間時使用月末樣本，不在畫面重算財務或補造缺失值。</Typography>
    <Stack component="form" onSubmit={submit} direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ my: 2 }}>
      <TextField label="開始日期" type="date" size="small" value={draft.from} InputLabelProps={{ shrink: true }} onChange={event => setDraft({ ...draft, from: event.target.value })} />
      <TextField label="結束日期" type="date" size="small" value={draft.through} InputLabelProps={{ shrink: true }} onChange={event => setDraft({ ...draft, through: event.target.value })} />
      <Button type="submit" variant="outlined" disabled={history.isFetching}>查詢歷史</Button>
      {metricCodes.length > 0 && <FormControl size="small" sx={{ minWidth: 130 }}>
        <InputLabel id="history-metric-label">圖表指標</InputLabel>
        <Select labelId="history-metric-label" label="圖表指標" value={metric} onChange={event => setMetric(event.target.value as keyof ValuationResult["metrics"])}>
          {metricCodes.map(code => <MenuItem key={code} value={code}>{metricLabel(code)}</MenuItem>)}
        </Select>
      </FormControl>}
    </Stack>
    {error && <Alert severity="warning">{error}</Alert>}
    {history.isError && <Alert severity="error">歷史估值載入失敗：{(history.error as Error).message}</Alert>}
    {history.isFetching ? <Typography>正在載入歷史估值…</Typography> : <>
      <SeriesChart title={metricLabel(metric) + " 歷史走勢"} points={rows.map(row => ({ date: row.valuationDate, value: row.metrics[metric]?.status === "AVAILABLE" ? row.metrics[metric].value : null }))} />
      <TableContainer sx={{ maxHeight: 320 }}><Table size="small" stickyHeader aria-label="歷史估值數據">
        <TableHead><TableRow>{["估值日", "股價", "P/E", "P/B", "P/S", "P/FCF", "EV/EBITDA", "狀態"].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
        <TableBody>{[...rows].reverse().map(row => <TableRow key={row.valuationDate}>
          <TableCell>{row.valuationDate}</TableCell><TableCell align="right">{formatNumber(row.price)} {row.currency ?? ""}</TableCell>
          {(["pe", "pb", "ps", "pfcf", "evEbitda"] as const).map(code => <TableCell key={code} align="right" title={row.metrics[code]?.reasonCode ?? undefined}>{row.metrics[code]?.status === "AVAILABLE" ? formatNumber(row.metrics[code].value) : "—"}</TableCell>)}
          <TableCell title={row.reasonCode ?? undefined}>{statusLabel(row.status)}</TableCell>
        </TableRow>)}</TableBody>
      </Table></TableContainer>
    </>}
  </Paper>;
}
