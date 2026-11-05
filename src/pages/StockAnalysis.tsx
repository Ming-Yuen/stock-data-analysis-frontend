import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, CircularProgress, Divider, FormControl, Grid, InputLabel, MenuItem, Paper, Select, Stack, Typography } from "@mui/material";
import { ArrowBack, ExpandMore, ShowChart } from "@mui/icons-material";
import { WatchItem } from "../services/types/dto/watchlist";
import { apiClient } from "../services/apiClient";
import { apiConfig } from "../apiConfig";
import { useTranslation } from "react-i18next";
import { AnalysisApiResponse, AnalysisHorizon, AnalysisReportData, AnalysisReportRequest, MetricResult, StockAnalysisReport } from "../services/types/dto/analysis";
import { FairValuePanel, IndustryMarketPanel, readableReason, readableState, TechnicalIndicatorsPanel } from "./AnalysisEvidencePanels";
import { FutuObservationPanels } from "./FutuObservationPanels";
import { formatHongKongDateTime } from "../utils/hongKongTime";
import { IndustryValuationProposalPanel } from "./IndustryValuationProposalPanel";

interface StockAnalysisPageProps { stock?: WatchItem; onClose?: () => void; }
const fmt = (value?: number | null, digits = 2) => value == null || !Number.isFinite(value) ? "—" : value.toFixed(digits);
const metric = <T,>(r?: MetricResult<T> | null): T | null => r?.status === "AVAILABLE" ? r.value : null;
const apiErrorMessage = (err: unknown, fallback: string) => {
  const candidate = err as { response?: { data?: AnalysisApiResponse<unknown> }; message?: string };
  return candidate.response?.data?.error?.code || candidate.response?.data?.message || candidate.message || fallback;
};

export function StockAnalysisPage({ stock, onClose }: StockAnalysisPageProps) {
  const { t, i18n } = useTranslation();
  const { figi: routeFigi } = useParams<{ figi: string }>();
  const navigate = useNavigate();
  const figi = stock?.figi ?? routeFigi ?? "";
  const symbol = stock?.symbol ?? figi;
  const close = onClose ?? (() => navigate("/watchlist"));
  const [horizon, setHorizon] = useState<AnalysisHorizon>("SWING");

  const reportQuery = useQuery<AnalysisReportData>({
    queryKey: ["analysis-report", figi, horizon],
    enabled: Boolean(figi),
    queryFn: async () => {
      const request: AnalysisReportRequest = { figi, horizon };
      const { data } = await apiClient.post<AnalysisApiResponse<AnalysisReportData>>(apiConfig.analysisReport.url, request);
      if (!data.success || !data.data?.report) throw new Error(data.error?.code || data.message || "Analysis unavailable");
      return data.data;
    },
  });

  const report: StockAnalysisReport | null = reportQuery.data?.report ?? null;
  const loading = reportQuery.isLoading || (reportQuery.isFetching && report == null);
  const error = reportQuery.isError ? apiErrorMessage(reportQuery.error, "Analysis unavailable") : null;

  const view = useMemo(() => {
    if (!report) return null;
    const priceSeries = metric(report.normalizedPrice);
    const structure = metric(report.priceStructure);
    const tradePlans = metric(report.tradePlans);
    const confluence = metric(report.confluenceScenarios);
    const confluenceUnavailable = report.confluenceScenarios.status === "AVAILABLE" ? null : report.confluenceScenarios;
    const technicalReasons = [...(confluence?.reasons ?? []),
      ...report.tradePlans.reasons, ...(tradePlans?.reasons ?? [])];
    const plans = tradePlans?.plans ?? [];
    const plan = confluence?.preferredPlanId ? plans.find((candidate) => candidate.planId === confluence.preferredPlanId) ?? null : null;
    const currentPrice = tradePlans?.currentPrice ?? priceSeries?.bars?.[priceSeries.bars.length - 1]?.close ?? null;
    const levels = metric(report.supportResistance);
    const valuation = metric(report.valuation);
    const rr = plan ? metric(plan.riskReward) : null;
    const market = metric(report.marketContext);
    const priceDataThrough = tradePlans?.priceDataThrough ?? structure?.priceDataThrough ?? report.eligibility.priceDataThrough ?? null;
    const observationPlans = plans.filter((candidate) => candidate.planId !== plan?.planId);
    return { currentPrice, priceDataThrough, priceSeries, structure, levels, valuation, plan, observationPlans, rr, market, confluence, confluenceUnavailable, technicalReasons };
  }, [report]);

  return <Box sx={{ width: "100%" }}>
    <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>{symbol} {t("analysisReport.analysis")}</Typography>
        <Typography variant="body2" color="text.secondary">{t("analysisReport.backend")} · FIGI {figi}</Typography>
        {report && <Typography variant="caption" color="text.secondary">{t("analysisReport.analysisAsOf")}: <time dateTime={report.context.analysisAsOf}>{formatHongKongDateTime(report.context.analysisAsOf, i18n.resolvedLanguage ?? i18n.language)}</time> · {t("dashboard.hongKongTime")} · {t(`analysisReport.horizons.${report.context.horizon}`)}{view?.priceDataThrough ? ` · ${t("analysisReport.priceDataThrough")}: ${view.priceDataThrough}` : ""}{report.eligibility.fundamentalDataThrough ? ` · ${t("analysisReport.fundamentalDataThrough")}: ${report.eligibility.fundamentalDataThrough}` : ""}</Typography>}
      </Box>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <FormControl size="small" sx={{ minWidth: 180 }}><InputLabel>{t("analysisReport.horizon")}</InputLabel><Select label={t("analysisReport.horizon")} value={horizon} onChange={(e) => setHorizon(e.target.value as AnalysisHorizon)}><MenuItem value="SWING">{t("analysisReport.horizons.SWING")}</MenuItem><MenuItem value="POSITION">{t("analysisReport.horizons.POSITION")}</MenuItem></Select></FormControl>
        <Button startIcon={<ArrowBack />} variant="outlined" onClick={close}>{t("analysisReport.back")}</Button>
      </Stack>
    </Stack>

    {loading && <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}><CircularProgress size={28} /><Typography sx={{ mt: 1 }}>{t("analysisReport.loading")}</Typography></Paper>}
    {error && <Alert severity="error">{error}</Alert>}
    {!loading && !error && report && view && <>
      <Alert severity={report.eligibility.status === "ALLOWED" ? "success" : report.eligibility.status === "DEGRADED" ? "warning" : "error"} sx={{ mb: 2 }}>
        {t("analysisReport.eligibility")}: <b>{readableState(t, report.eligibility.status)}</b>{report.eligibility.reasons.length ? ` · ${report.eligibility.reasons.map((r) => readableReason(t, r)).join(" · ")}` : ""}
      </Alert>

      <Grid container spacing={2}>
        {[
          [t("analysisReport.latestClose"), fmt(view.currentPrice)],
          [t("analysisReport.marketDecision"), readableState(t, view.confluence?.marketDecision ?? view.confluenceUnavailable?.status)],
          [t("analysisReport.confidence"), readableState(t, view.confluence?.confidence ?? view.confluenceUnavailable?.status)],
          [t("analysisReport.evidenceScore"), fmt(view.confluence?.evidenceScore, 1)],
          ["RSI 14", fmt(view.market ? metric(view.market.momentum.rsi14) : null)],
          ["Market", view.market ? readableState(t, metric(view.market.market)?.regime ?? view.market.market.status) : "—"],
        ].map(([label, value]) => <Grid key={String(label)} size={{ xs: 6, md: 2 }}><Paper variant="outlined" sx={{ p: 2, height: "100%" }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="h6" sx={{ fontWeight: 700 }}>{value}</Typography></Paper></Grid>)}
      </Grid>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{t("analysisReport.scoreLimit")}</Typography>
      <Alert severity="info" sx={{ mt: 2 }}>
        {t("analysisReport.summary", {
          historical: metric(view.valuation?.fairValueRange)?.observation?.position
            ? t(`analysisReport.observations.${metric(view.valuation?.fairValueRange)?.observation?.position}`) : t("analysisReport.observationUnavailable"),
          peer: metric(view.valuation?.industryMarketReference?.priceRange)?.observation?.position
            ? t(`analysisReport.observations.${metric(view.valuation?.industryMarketReference?.priceRange)?.observation?.position}`) : t("analysisReport.observationUnavailable"),
          industry: metric(view.valuation?.industryFairValueRange)?.observation?.position
            ? t(`analysisReport.observations.${metric(view.valuation?.industryFairValueRange)?.observation?.position}`) : t("analysisReport.observationUnavailable"),
          technical: view.confluenceUnavailable?.reasons?.length
            ? view.confluenceUnavailable.reasons.map((reason) => readableReason(t, reason)).join(" · ")
            : view.plan ? readableState(t, view.confluence?.marketDecision) : t("analysisReport.noPreferredPlan"),
        })}
      </Alert>

      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid size={{ xs: 12, md: 6 }} sx={{ order: 2 }}><Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
          <Stack direction="row" spacing={1} alignItems="center"><ShowChart color="primary" /><Typography variant="h6" sx={{ fontWeight: 700 }}>{t("analysisReport.technicalTradePlan")}</Typography>{view.plan && <Chip size="small" label={readableState(t, view.plan.status)} />}</Stack>
          <Divider sx={{ my: 2 }} />
          {!!view.technicalReasons.length && <Alert severity="info" sx={{ mb: 2 }}><Stack spacing={0.5}>
            {Array.from(new Set(view.technicalReasons.map((reason) => readableReason(t, reason)))).map((message) =>
              <Typography key={message} variant="body2">{message}</Typography>)}
          </Stack></Alert>}
          <Box component="section" aria-label={t("analysisReport.preferredTechnicalPlan")}>
          {!view.plan ? <Typography color="text.secondary">{view.confluence?.preferredPlanId ? t("analysisReport.preferredPlanMissing") : t("analysisReport.noPreferredPlan")}</Typography> : <Stack spacing={1}>
            <Typography>{t("analysisReport.technicalEntry")}: <b>{view.plan.entryRange ? `${fmt(view.plan.entryRange.lower)} – ${fmt(view.plan.entryRange.upper)}` : "—"}</b></Typography>
            <Typography>{t("analysisReport.entryMethod")}: <b>{readableState(t, view.plan.entryMethod)}</b></Typography>
            <Typography>{t("analysisReport.trigger")}: <b>{view.plan.trigger ?? "—"}</b></Typography>
            <Typography>{t("analysisReport.protectiveStop")}: <b>{fmt(view.plan.stop?.protectivePrice)}</b></Typography>
            <Typography>{t("analysisReport.closeInvalidation")}: <b>{fmt(view.plan.stop?.closeThreshold)}</b></Typography>
            {view.plan.stop?.closeThreshold != null && view.plan.stop.requiredCloses != null && view.plan.stop.requiredCloses > 0 && view.plan.stop.evaluationTimeframe && <Typography variant="body2" color="text.secondary">{t("analysisReport.invalidationConfirmation", { closes: view.plan.stop.requiredCloses, timeframe: readableState(t, view.plan.stop.evaluationTimeframe) })}</Typography>}
            <Typography>{t("analysisReport.profitTargets")}: <b>{view.plan.targets.map((target) => `${fmt(target.price)} (${fmt(target.weight * 100, 0)}%)`).join(" / ") || "—"}</b></Typography>
            <Typography>{t("analysisReport.netRR")}: <b>{fmt(view.rr?.netRR)}</b></Typography>
            {view.plan.validThroughSession && <Typography>{t("analysisReport.entryValidThrough")}: {view.plan.validThroughSession}</Typography>}
            {!!view.plan.reasons.length && <Alert severity="info">{view.plan.reasons.map((r) => readableReason(t, r)).join(" · ")}</Alert>}
          </Stack>}
          </Box>
          {!!view.observationPlans.length && <Accordion disableGutters elevation={0} sx={{ mt: 2, border: "1px solid", borderColor: "divider" }}>
            <AccordionSummary expandIcon={<ExpandMore />}><Typography>{t("analysisReport.otherObservationPlans")}</Typography></AccordionSummary>
            <AccordionDetails><Box component="section" aria-label={t("analysisReport.otherObservationPlans")}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t("analysisReport.observationPlansLimit")}</Typography>
              <Stack spacing={2} divider={<Divider />}>{view.observationPlans.map((candidate, index) => <Stack key={candidate.planId} spacing={0.5}>
                <Typography sx={{ fontWeight: 700 }}>{t("analysisReport.observationPlanNumber", { number: index + 1 })} · {readableState(t, candidate.status)}</Typography>
                <Typography>{t("analysisReport.technicalEntry")}: <b>{candidate.entryRange ? `${fmt(candidate.entryRange.lower)} – ${fmt(candidate.entryRange.upper)}` : "—"}</b></Typography>
                <Typography>{t("analysisReport.protectiveStop")}: <b>{fmt(candidate.stop?.protectivePrice)}</b></Typography>
                <Typography>{t("analysisReport.closeInvalidation")}: <b>{fmt(candidate.stop?.closeThreshold)}</b></Typography>
                {candidate.stop?.closeThreshold != null && candidate.stop.requiredCloses != null && candidate.stop.requiredCloses > 0 && candidate.stop.evaluationTimeframe && <Typography variant="body2" color="text.secondary">{t("analysisReport.invalidationConfirmation", { closes: candidate.stop.requiredCloses, timeframe: readableState(t, candidate.stop.evaluationTimeframe) })}</Typography>}
                <Typography>{t("analysisReport.profitTargets")}: <b>{candidate.targets?.map((target) => `${fmt(target.price)} (${fmt(target.weight * 100, 0)}%)`).join(" / ") || "—"}</b></Typography>
                <Typography>{t("analysisReport.netRR")}: {fmt(metric(candidate.riskReward)?.netRR)}</Typography>
                <Typography variant="body2" color="text.secondary">{candidate.reasons?.map((reason) => readableReason(t, reason)).join(" · ") || t("analysisReport.notSelectedAsPreferred")}</Typography>
              </Stack>)}</Stack>
            </Box></AccordionDetails>
          </Accordion>}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>{t("analysisReport.technicalPlanLimit")}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{t("analysisReport.costAssumptions")}</Typography>
        </Paper></Grid>

        <Grid size={{ xs: 12, md: 6 }} sx={{ order: 1 }}><Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
          {[
            { key: "historicalFairValue", result: view.valuation?.fairValueRange, kind: "historical" as const },
            { key: "peerReferenceValue", result: view.valuation?.industryMarketReference?.priceRange, kind: "peer" as const },
            { key: "industryFairValue", result: view.valuation?.industryFairValueRange, kind: "scenario" as const },
          ].map((range, index) => {
            return <Box key={range.key}>
              {index > 0 && <Divider sx={{ my: 2 }} />}
              <FairValuePanel title={t(`analysisReport.${range.key}`)} result={range.result} fallbackStatus={report.valuation.status} fallbackReasons={report.valuation.reasons} kind={range.kind} peerReference={range.kind === "peer" ? view.valuation?.industryMarketReference : null} />
              {range.kind === "scenario" && <IndustryValuationProposalPanel
                key={`${figi}:${view.valuation?.industryMarketReference?.industryCode ?? ""}`}
                figi={figi} industryCode={view.valuation?.industryMarketReference?.industryCode}
                reloadReport={async () => (await reportQuery.refetch()).data?.report ?? null} />}
            </Box>;
          })}
        </Paper></Grid>
      </Grid>

      <IndustryMarketPanel reference={view.valuation?.industryMarketReference} />
      {report.futuObservations && <FutuObservationPanels observations={report.futuObservations} />}
      {view.structure?.timeframes?.length ? <Paper variant="outlined" sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{t("analysisReport.timeframes")}</Typography><Divider sx={{ my: 2 }} />
        <Grid container spacing={2}>{view.structure.timeframes.map((tf) => <Grid key={tf.timeframe} size={{ xs: 12, md: 4 }}>
          <Typography sx={{ fontWeight: 700 }}>{readableState(t, tf.timeframe)}</Typography>
          <Typography>{t("analysisReport.trend")}: {readableState(t, metric(tf.majorTrend)?.state ?? tf.majorTrend.status)}</Typography>
          <Typography>ATR14: {fmt(metric(tf.atr14)?.atr)} ({fmt(metric(tf.atr14)?.atrPercent)}%)</Typography>
        </Grid>)}</Grid>
      </Paper> : null}
      <TechnicalIndicatorsPanel detail={view.market?.momentumDetail} dataThrough={view.priceDataThrough} momentum={view.market?.momentum} />

      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid size={{ xs: 12, md: 12 }}><Paper variant="outlined" sx={{ p: 3, height: "100%" }}><Typography variant="h6" sx={{ fontWeight: 700 }}>{t("analysisReport.levels")}</Typography><Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">{t("analysisReport.support")}</Typography>{view.levels?.supports?.length ? view.levels.supports.slice(0, 3).map((zone) => <Typography key={zone.id}>{fmt(zone.lower)}–{fmt(zone.upper)} [{t(`analysisReport.strengths.${zone.strengthLabel}`)}] · {readableState(t, zone.timeframe)} · {t("analysisReport.testCount", { count: zone.testCount })}{zone.lastTestAt ? ` · ${zone.lastTestAt}` : ""}</Typography>) : <Typography>—</Typography>}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>{t("analysisReport.resistance")}</Typography>{view.levels?.resistances?.length ? view.levels.resistances.slice(0, 3).map((zone) => <Typography key={zone.id}>{fmt(zone.lower)}–{fmt(zone.upper)} [{t(`analysisReport.strengths.${zone.strengthLabel}`)}] · {readableState(t, zone.timeframe)} · {t("analysisReport.testCount", { count: zone.testCount })}{zone.lastTestAt ? ` · ${zone.lastTestAt}` : ""}</Typography>) : <Typography>—</Typography>}
        </Paper></Grid>
      </Grid>

      {view.confluence?.scenarios?.length ? <Paper variant="outlined" sx={{ p: 3, mt: 2 }}><Typography variant="h6" sx={{ fontWeight: 700 }}>{t("analysisReport.scenarios")}</Typography><Divider sx={{ my: 2 }} /><Grid container spacing={2}>{view.confluence.scenarios.map((scenario) => <Grid key={scenario.id ?? scenario.type} size={{ xs: 12, md: 4 }}><Typography sx={{ fontWeight: 700 }}>{scenario.type}</Typography><Typography>{t("analysisReport.trigger")}: {scenario.trigger ?? "—"}</Typography><Typography>Target: {fmt(scenario.targetPrice)}</Typography><Typography>Invalidation: {fmt(scenario.invalidationPrice)}</Typography><Typography variant="caption" color="text.secondary">{scenario.rationale}</Typography></Grid>)}</Grid></Paper> : null}

      <Alert severity="info" sx={{ mt: 2 }}>{t("analysisReport.backendOnly")}</Alert>
    </>}
  </Box>;
}
