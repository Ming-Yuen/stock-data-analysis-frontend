import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Alert, Box, Button, CircularProgress, Divider, Grid, Paper, Stack, TextField, Typography } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { apiClient } from "../services/apiClient";
import { apiConfig } from "../apiConfig";
import { AnalysisReportRequest, MetricResult, StockAnalysisReport } from "../services/types/dto/analysis";
import { formatNumber, metricLabel, readableReason, readableState, reasonLabel, statusLabel, TechnicalIndicatorsPanel, ValuationReferencePanel } from "./AnalysisPanels";
import { FinancialsPanel, SeriesChart, ValuationHistoryPanel } from "./ValuationPanels";
import { FutuObservationPanels } from "./FutuObservationPanels";
import { IndustryValuationProposalPanel } from "./IndustryValuationProposalPanel";
import { formatHongKongDateTime } from "../utils/hongKongTime";

const valueOf = <T,>(result?: MetricResult<T> | null): T | null => result?.status === "AVAILABLE" ? result.value : null;

export function StockAnalysisPage() {
  const { t } = useTranslation();
  const { figi = "" } = useParams<{ figi: string }>();
  const navigate = useNavigate();
  const [dateInput, setDateInput] = useState("");
  const [valuationDate, setValuationDate] = useState("");
  const reportQuery = useQuery<StockAnalysisReport>({
    queryKey: ["analysis-report", figi, valuationDate],
    enabled: Boolean(figi),
    queryFn: async () => {
      const request: AnalysisReportRequest = { figi, ...(valuationDate ? { valuationDate } : {}) };
      return (await apiClient.post<StockAnalysisReport>(apiConfig.analysisReport.url, request)).data;
    },
  });
  const report = reportQuery.data;
  const valuation = report?.valuation;
  const structure = valueOf(report?.priceStructure);
  const market = valueOf(report?.marketContext);
  const levels = valueOf(report?.supportResistance);
  const tradePlans = valueOf(report?.tradePlans);
  const dailyBars = structure?.timeframes?.find(timeframe => timeframe.timeframe === "DAILY")?.bars ?? [];
  const error = reportQuery.error as { response?: { data?: { message?: string } }; message?: string } | null;

  return <Box sx={{ width: "100%", minWidth: 0 }}>
    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={2} sx={{ mb: 2 }}>
      <Box>
        <Typography variant="h5" fontWeight={800}>{report?.symbol ?? figi} · 股票分析</Typography>
        <Typography color="text.secondary">{report?.name ?? ""} · FIGI {figi}</Typography>
        {report && <Typography variant="caption" color="text.secondary">估值日：{report.valuationDate}
          {valuation?.analysisAsOf ? " · 分析切點（香港）：" + formatHongKongDateTime(valuation.analysisAsOf, "zh-HK") : ""}
          {valuation?.calculatedAt ? " · 計算時間（香港）：" + formatHongKongDateTime(valuation.calculatedAt, "zh-HK") : ""}
        </Typography>}
      </Box>
      <Stack component="form" direction="row" spacing={1} useFlexGap flexWrap="wrap" onSubmit={event => { event.preventDefault(); setValuationDate(dateInput); }}>
        <TextField label="估值日期（留空為最新）" type="date" size="small" value={dateInput} InputLabelProps={{ shrink: true }} onChange={event => setDateInput(event.target.value)} />
        <Button type="submit" variant="contained" disabled={reportQuery.isFetching}>查詢</Button>
        <Button startIcon={<ArrowBack />} variant="outlined" onClick={() => navigate("/stockAnalysis")}>股票篩選</Button>
      </Stack>
    </Stack>
    {reportQuery.isFetching && <Stack direction="row" spacing={1} alignItems="center" sx={{ my: 2 }}><CircularProgress size={22} /><Typography>正在載入分析…</Typography></Stack>}
    {reportQuery.isError && <Alert severity="error">{error?.response?.data?.message || error?.message || "股票分析載入失敗。"}</Alert>}
    {report && <>
      {valuation?.sharesObservedAt && valuation.analysisAsOf
        && Date.parse(valuation.sharesObservedAt) > Date.parse(valuation.analysisAsOf) && <Alert severity="info" sx={{ mb: 2 }}>
        收市估算使用收市後取得的股數。股數取得時間（香港）：{formatHongKongDateTime(valuation.sharesObservedAt, "zh-HK")}。
      </Alert>}
      {valuation?.status !== "AVAILABLE" && <Alert severity="info" sx={{ mb: 2 }}>
        估值狀態：{statusLabel(valuation?.status)} · {reasonLabel(t, valuation?.reasonCode)}。個別可用指標仍會顯示。
      </Alert>}
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 2 }}><Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
          <Typography variant="caption" color="text.secondary">估值使用股價</Typography>
          <Typography variant="h6">{formatNumber(valuation?.price)} {valuation?.currency ?? ""}</Typography>
        </Paper></Grid>
        {Object.entries(valuation?.metrics ?? {}).map(([code, result]) => <Grid key={code} size={{ xs: 6, md: 2 }}>
          <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
            <Typography variant="caption" color="text.secondary">{metricLabel(code)}</Typography>
            <Typography variant="h6">{result.status === "AVAILABLE" ? formatNumber(result.value) : "—"}</Typography>
              {result.financialSource === "SEC" && <Typography variant="caption" color="text.secondary">
                SEC 財務{result.periodEnd && ` · ${result.periodStart ? `${result.periodStart}～` : ""}${result.periodEnd}`}
              </Typography>}
            {result.status !== "AVAILABLE" && <Typography variant="caption" color="text.secondary">{statusLabel(result.status)} · {reasonLabel(t, result.reasonCode)}</Typography>}
          </Paper>
        </Grid>)}
      </Grid>
      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid size={{ xs: 12, lg: 4 }}><ValuationReferencePanel title="歷史市場估值參考" description="比較這隻股票過去實際市場給予的估值倍數。" reference={valuation?.historicalReference} currency={valuation?.currency} /></Grid>
        <Grid size={{ xs: 12, lg: 4 }}><ValuationReferencePanel title="同業市場估值參考" description="比較可比公司的實際市場倍數；樣本不足時不產生替代值。" reference={valuation?.peerReference} currency={valuation?.currency} /></Grid>
        <Grid size={{ xs: 12, lg: 4 }}><ValuationReferencePanel title="產業估值假設" description="以人工確認的產業模型及倍數建立假設情境，與實際市場參考分開。" reference={valuation?.industryAssumption} currency={valuation?.currency} /></Grid>
      </Grid>
      <IndustryValuationProposalPanel key={figi + ":" + (valuation?.industryCode ?? "")} industryCode={valuation?.industryCode} figi={figi} valuationDate={report.valuationDate}
        reloadReport={async () => (await reportQuery.refetch()).data ?? null} />
      <FinancialsPanel financials={report.financials} />
      <ValuationHistoryPanel key={figi + ":" + report.valuationDate} figi={figi} initial={report.history ?? []} />
      {dailyBars.length > 0 && <Paper variant="outlined" sx={{ p: 2.5, mt: 2 }}>
        <Typography variant="h6" fontWeight={700}>股價走勢</Typography>
        <Typography variant="body2" color="text.secondary">資料截至：{structure?.priceDataThrough ?? "—"}</Typography>
        <SeriesChart title="每日收盤價" points={dailyBars.map(bar => ({ date: bar.sessionDate, value: bar.close }))} />
      </Paper>}
      {report.futuObservations && <FutuObservationPanels observations={report.futuObservations} />}
      <TechnicalIndicatorsPanel detail={market?.momentumDetail} dataThrough={structure?.priceDataThrough} momentum={market?.momentum} />
      <Paper component="section" aria-label="價格結構與支撐阻力" variant="outlined" sx={{ p: 2.5, mt: 2 }}>
        <Typography variant="h6" fontWeight={700}>價格結構與支撐阻力</Typography>
        <Grid container spacing={2} sx={{ my: 1 }}>{(structure?.timeframes ?? []).map(timeframe => <Grid key={timeframe.timeframe} size={{ xs: 12, md: 4 }}>
          <Typography fontWeight={700}>{readableState(t, timeframe.timeframe)}</Typography>
          <Typography>趨勢：{readableState(t, valueOf(timeframe.majorTrend)?.state ?? timeframe.majorTrend.status)}</Typography>
          <Typography>ATR14：{formatNumber(valueOf(timeframe.atr14)?.atr)}</Typography>
        </Grid>)}</Grid>
        <Divider sx={{ my: 1 }} />
        <Typography>支撐區：{levels?.supports?.length ? levels.supports.map(zone => formatNumber(zone.lower) + "–" + formatNumber(zone.upper) + "（" + readableState(t, zone.timeframe) + "）").join("、") : "—"}</Typography>
        <Typography>阻力區：{levels?.resistances?.length ? levels.resistances.map(zone => formatNumber(zone.lower) + "–" + formatNumber(zone.upper) + "（" + readableState(t, zone.timeframe) + "）").join("、") : "—"}</Typography>
        {!levels && report.supportResistance?.reasons?.map((reason, index) => <Typography key={index} variant="body2" color="text.secondary">{readableReason(t, reason)}</Typography>)}
      </Paper>
      <Paper component="section" aria-label="技術觀察方案" variant="outlined" sx={{ p: 2.5, mt: 2 }}>
        <Typography variant="h6" fontWeight={700}>技術觀察方案</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>進場條件、止損與目標由後端技術分析提供，與估值參考分開；並非成交保證。</Typography>
        {tradePlans && !tradePlans.contextEvaluated && <Alert severity="info" sx={{ mb: 1 }}>市場環境判斷尚未完成，以下僅作技術觀察。</Alert>}
        {tradePlans?.plans?.length ? <Grid container spacing={2}>{tradePlans.plans.map(plan => <Grid key={plan.planId} size={{ xs: 12, md: 6 }}>
          <Stack spacing={0.6} sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
            <Typography fontWeight={700}>{readableState(t, plan.setupType)} · {readableState(t, plan.status)}</Typography>
            <Typography>進場區間：{plan.entryRange ? formatNumber(plan.entryRange.lower) + "–" + formatNumber(plan.entryRange.upper) : "—"}</Typography>
            <Typography>觸發條件：{plan.trigger ?? "—"}</Typography>
            <Typography>保護止損：{formatNumber(plan.stop?.protectivePrice)} · 收盤失效價：{formatNumber(plan.stop?.closeThreshold)}</Typography>
            {plan.stop?.requiredCloses != null && plan.stop?.evaluationTimeframe && <Typography variant="body2" color="text.secondary">失效確認：連續 {plan.stop.requiredCloses} 個{readableState(t, plan.stop.evaluationTimeframe)}收盤。</Typography>}
            <Typography>目標：{plan.targets?.map(target => formatNumber(target.price)).join("／") || "—"}</Typography>
            <Typography>淨風險回報：{formatNumber(valueOf(plan.riskReward)?.netRR)}</Typography>
            {plan.validThroughSession && <Typography variant="body2">有效交易日：{plan.validThroughSession}</Typography>}
            {plan.reasons?.map((reason, index) => <Typography key={index} variant="body2" color="text.secondary">{readableReason(t, reason)}</Typography>)}
          </Stack>
        </Grid>)}</Grid> : <Typography color="text.secondary">{report.tradePlans?.reasons?.map(reason => readableReason(t, reason)).join("；") || "暫無可用技術方案。"}</Typography>}
      </Paper>
      {!!report.reasons?.length && <Alert severity="info" sx={{ mt: 2 }}>{report.reasons.map(reason => readableReason(t, reason)).join("；")}</Alert>}
    </>}
  </Box>;
}
