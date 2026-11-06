import React from "react";
import { Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { FutuObservations } from "../services/types/dto/analysis";
import { formatNumber } from "./AnalysisPanels";
import { formatHongKongDateTime } from "../utils/hongKongTime";

export function FutuObservationPanels({ observations }: { observations: FutuObservations }) {
  const valuation = observations.valuation;
  return <Paper component="section" aria-label="富途市場觀察" variant="outlined" sx={{ p: 2.5, mt: 2 }}>
    <Typography variant="h6" fontWeight={700}>富途市場觀察</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>供應商估值與盈利預期分開呈現，不替代 SEC 已公布的財務數據。</Typography>
    {valuation ? <>
      <Typography variant="body2" sx={{ my: 1 }}>觀察日期：{valuation.observationDate} · 取得時間（香港）：{formatHongKongDateTime(valuation.observedAt, "zh-HK")}</Typography>
      <Stack direction="row" spacing={3} useFlexGap flexWrap="wrap">
        {([["P/E", valuation.pe], ["P/B", valuation.pb], ["P/S", valuation.ps], ["預期 P/E", valuation.forwardPe], ["預期 P/S", valuation.forwardPs]] as const)
          .map(([label, value]) => <Typography key={label}>{label}：{formatNumber(value)}</Typography>)}
      </Stack>
    </> : <Typography color="text.secondary" sx={{ my: 2 }}>尚無供應商估值觀察。</Typography>}
    <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 2 }}>盈利預期</Typography>
    {observations.earnings?.length ? <TableContainer><Table size="small" aria-label="盈利預期">
      <TableHead><TableRow>{["財政期間", "期間類型", "起迄日", "預期 EPS", "預期營收", "幣別", "觀察日期", "來源"].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
      <TableBody>{observations.earnings.map((row, index) => <TableRow key={row.fiscalPeriod + ":" + row.periodType + ":" + row.observationDate + ":" + index}>
        <TableCell>{row.fiscalPeriod}</TableCell><TableCell>{row.periodType}</TableCell>
        <TableCell>{row.periodStart && row.periodEnd ? row.periodStart + " 至 " + row.periodEnd : row.periodEnd ?? "—"}</TableCell>
        <TableCell align="right">{formatNumber(row.eps)}</TableCell><TableCell align="right">{formatNumber(row.revenue)}</TableCell>
        <TableCell>{row.currency ?? "—"}</TableCell><TableCell>{row.observationDate}</TableCell><TableCell>{row.source}</TableCell>
      </TableRow>)}</TableBody>
    </Table></TableContainer> : <Typography color="text.secondary">尚無盈利預期。</Typography>}
  </Paper>;
}
