import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Chip, CircularProgress, Divider, FormControl, Grid, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography } from "@mui/material";
import { ArrowBack, ShowChart } from "@mui/icons-material";
import { WatchItem } from "../services/types/dto/watchlist";
import { apiClient } from "../services/apiClient";
import { apiConfig } from "../apiConfig";
import { useTranslation } from "react-i18next";
import { AccountRiskContext, AnalysisApiResponse, AnalysisHorizon, AnalysisReportData, AnalysisReportRequest, MetricResult, PositionDto, PositionSelectionKind, StockAnalysisReport } from "../services/types/dto/analysis";

interface StockAnalysisPageProps { stock?: WatchItem; onClose?: () => void; }
interface PositionFormState { quantity: string; averageCost: string; manualStop: string; basisRef: string; thesis: string; }
interface AccountFormState { equity: string; availableCash: string; portfolioRiskAmount: string; riskBudgetPercent: string; maxPortfolioRiskPercent: string; maxPositionWeightPercent: string; quantityStep: string; }
interface PositionSavePayload { quantity: number; averageCost: number | null; currency: string; horizon: AnalysisHorizon; effectiveAt: string; basisRef: string; manualStop: number | null; thesis: string | null; }
interface PositionSaveCommand { figi: string; position: PositionDto | null; body: PositionSavePayload; }
const EMPTY_POSITION_FORM: PositionFormState = { quantity: "", averageCost: "", manualStop: "", basisRef: "", thesis: "" };
const EMPTY_ACCOUNT_FORM: AccountFormState = { equity: "", availableCash: "", portfolioRiskAmount: "0", riskBudgetPercent: "1", maxPortfolioRiskPercent: "6", maxPositionWeightPercent: "20", quantityStep: "1" };
const fmt = (value?: number | null, digits = 2) => value == null || !Number.isFinite(value) ? "—" : value.toFixed(digits);
const metric = <T,>(r?: MetricResult<T> | null): T | null => r?.status === "AVAILABLE" ? r.value : null;
const endpoint = (template: string, key: string, value: string) => template.replace(`:${key}`, encodeURIComponent(value));
const finiteOrNull = (text: string): number | null => {
  if (!text.trim()) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
};
const apiErrorMessage = (err: unknown, fallback: string) => {
  const candidate = err as { response?: { data?: AnalysisApiResponse<unknown> }; message?: string };
  return candidate.response?.data?.error?.code || candidate.response?.data?.message || candidate.message || fallback;
};

export function StockAnalysisPage({ stock, onClose }: StockAnalysisPageProps) {
  const { t } = useTranslation();
  const { figi: routeFigi } = useParams<{ figi: string }>();
  const navigate = useNavigate();
  const figi = stock?.figi ?? routeFigi ?? "";
  const symbol = stock?.symbol ?? figi;
  const close = onClose ?? (() => navigate("/watchlist"));
  const queryClient = useQueryClient();
  const [horizon, setHorizon] = useState<AnalysisHorizon>("SWING");
  const [positionKind, setPositionKind] = useState<PositionSelectionKind>("UNKNOWN");
  const [positionForm, setPositionForm] = useState<PositionFormState>(EMPTY_POSITION_FORM);
  const [positionMessage, setPositionMessage] = useState<string | null>(null);
  const [accountForm, setAccountForm] = useState<AccountFormState>(EMPTY_ACCOUNT_FORM);
  const [accountRisk, setAccountRisk] = useState<AccountRiskContext | null>(null);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);

  const positionQuery = useQuery<PositionDto | null>({
    queryKey: ["analysis-position", figi],
    enabled: Boolean(figi),
    queryFn: async () => {
      const { data } = await apiClient.get<AnalysisApiResponse<PositionDto[]>>(apiConfig.analysisPositions.url, { params: { includeClosed: true } });
      if (!data.success) throw new Error(data.error?.code || data.message || "POSITION_READ_FAILED");
      return data.data?.find((item) => item.figi === figi) ?? null;
    },
  });
  const currentPosition = positionQuery.data ?? null;

  useEffect(() => {
    setPositionKind("UNKNOWN");
    setPositionForm(EMPTY_POSITION_FORM);
    setPositionMessage(null);
  }, [figi]);

  useEffect(() => {
    if (positionQuery.data === undefined) return;
    const found = positionQuery.data;
    setPositionForm(found ? {
      quantity: String(found.quantity), averageCost: found.averageCost == null ? "" : String(found.averageCost),
      manualStop: found.manualStop == null ? "" : String(found.manualStop), basisRef: found.basisRef, thesis: found.thesis ?? "",
    } : EMPTY_POSITION_FORM);
  }, [positionQuery.data, figi]);

  useEffect(() => {
    if (positionQuery.isError) setPositionMessage(apiErrorMessage(positionQuery.error, "POSITION_READ_FAILED"));
  }, [positionQuery.isError, positionQuery.error]);

  const reportQuery = useQuery<AnalysisReportData>({
    queryKey: ["analysis-report", figi, horizon, positionKind, accountRisk, currentPosition?.version ?? null],
    enabled: Boolean(figi),
    queryFn: async () => {
      const request: AnalysisReportRequest = { figi, horizon, positionSelection: { kind: positionKind }, accountRisk };
      const { data } = await apiClient.post<AnalysisApiResponse<AnalysisReportData>>(apiConfig.analysisReport.url, request);
      if (!data.success || !data.data?.report) throw new Error(data.error?.code || data.message || "Analysis unavailable");
      return data.data;
    },
  });

  const report: StockAnalysisReport | null = reportQuery.data?.report ?? null;
  const loading = reportQuery.isLoading || (reportQuery.isFetching && report == null);
  const error = reportQuery.isError ? apiErrorMessage(reportQuery.error, "Analysis unavailable") : null;

  useEffect(() => {
    const currentBasis = metric(report?.normalizedPrice)?.priceBasis?.basisId;
    if (!currentPosition && currentBasis) setPositionForm((prev) => prev.basisRef ? prev : { ...prev, basisRef: currentBasis });
  }, [report, currentPosition]);

  const view = useMemo(() => {
    if (!report) return null;
    const priceSeries = metric(report.normalizedPrice);
    const structure = metric(report.priceStructure);
    const tradePlans = metric(report.tradePlans);
    const confluence = metric(report.confluenceScenarios);
    const plans = tradePlans?.plans ?? [];
    const plan = confluence?.preferredPlanId ? plans.find((candidate) => candidate.planId === confluence.preferredPlanId) ?? null : null;
    const currentPrice = tradePlans?.currentPrice ?? priceSeries?.bars?.[priceSeries.bars.length - 1]?.close ?? null;
    const levels = metric(report.supportResistance);
    const valuation = metric(report.valuation);
    const fairValue = valuation ? metric(valuation.fairValueRange) : null;
    const rr = plan ? metric(plan.riskReward) : null;
    const market = metric(report.marketContext);
    const position = metric(report.positionDecision);
    const priceDataThrough = tradePlans?.priceDataThrough ?? structure?.priceDataThrough ?? report.eligibility.priceDataThrough ?? null;
    return { currentPrice, priceDataThrough, priceSeries, structure, levels, valuation, fairValue, plan, rr, market, confluence, position };
  }, [report]);

  const applyAccountRisk = () => {
    const equity = finiteOrNull(accountForm.equity);
    const availableCash = finiteOrNull(accountForm.availableCash);
    const portfolioRiskAmount = finiteOrNull(accountForm.portfolioRiskAmount);
    const riskBudgetPercent = finiteOrNull(accountForm.riskBudgetPercent);
    const maxPortfolioRiskPercent = finiteOrNull(accountForm.maxPortfolioRiskPercent);
    const maxPositionWeightPercent = finiteOrNull(accountForm.maxPositionWeightPercent);
    const quantityStep = finiteOrNull(accountForm.quantityStep);
    const valid = equity != null && equity > 0 && availableCash != null && availableCash >= 0 && availableCash <= equity
      && portfolioRiskAmount != null && portfolioRiskAmount >= 0
      && riskBudgetPercent != null && riskBudgetPercent > 0 && riskBudgetPercent <= 100
      && maxPortfolioRiskPercent != null && maxPortfolioRiskPercent > 0 && maxPortfolioRiskPercent <= 100
      && maxPositionWeightPercent != null && maxPositionWeightPercent > 0 && maxPositionWeightPercent <= 100
      && quantityStep != null && quantityStep > 0;
    if (!valid) { setAccountMessage(t("analysisReport.invalidAccountInput")); return; }
    setAccountRisk({ currency: "USD", asOf: new Date().toISOString(), equity, availableCash, portfolioRiskAmount,
      riskBudgetFraction: riskBudgetPercent / 100, maxPortfolioRiskFraction: maxPortfolioRiskPercent / 100,
      maxPositionWeightFraction: maxPositionWeightPercent / 100, quantityStep, complete: true, provenance: "USER_DECLARED" });
    setAccountMessage(t("analysisReport.accountApplied"));
  };

  const clearAccountRisk = () => { setAccountRisk(null); setAccountMessage(null); };

  const positionMutation = useMutation<PositionDto, Error, PositionSaveCommand>({
    mutationFn: async ({ figi: commandFigi, position, body }) => {
      try {
        const response = position
          ? await apiClient.put<AnalysisApiResponse<PositionDto>>(endpoint(apiConfig.updatePosition.url, "positionId", position.id), { expectedVersion: Number(position.version), ...body })
          : await apiClient.post<AnalysisApiResponse<PositionDto>>(apiConfig.createPosition.url, { figi: commandFigi, ...body });
        if (!response.data.success || !response.data.data) throw new Error(response.data.error?.code || response.data.message || "POSITION_SAVE_FAILED");
        return response.data.data;
      } catch (err: unknown) {
        throw new Error(apiErrorMessage(err, "POSITION_SAVE_FAILED"));
      }
    },
    onSuccess: (saved, command) => {
      queryClient.setQueryData(["analysis-position", saved.figi], saved);
      queryClient.invalidateQueries({ queryKey: ["analysis-report", saved.figi] });
      if (command.figi === figi && saved.figi === figi) {
        setPositionMessage(t("analysisReport.positionSaved"));
        setPositionKind("CURRENT");
      }
    },
    onError: (err, command) => { if (command.figi === figi) setPositionMessage(err.message || "POSITION_SAVE_FAILED"); },
  });

  const savePosition = () => {
    if (!report || !view) return;
    setPositionMessage(null);
    const quantity = finiteOrNull(positionForm.quantity);
    const averageCost = finiteOrNull(positionForm.averageCost);
    const manualStop = finiteOrNull(positionForm.manualStop);
    if (quantity == null || quantity < 0 || (quantity > 0 && (averageCost == null || averageCost <= 0)) || (manualStop != null && manualStop <= 0)) {
      setPositionMessage("INVALID_POSITION_INPUT"); return;
    }
    const basisRef = positionForm.basisRef.trim();
    if (!basisRef) { setPositionMessage("POSITION_BASIS_REQUIRED"); return; }
    const body = {
      quantity, averageCost: quantity === 0 ? null : averageCost, currency: "USD", horizon,
      effectiveAt: new Date().toISOString(), basisRef, manualStop, thesis: positionForm.thesis.trim() || null,
    };
    if (!positionQuery.isFetched || positionQuery.isFetching) { setPositionMessage("POSITION_NOT_READY"); return; }
    positionMutation.mutate({ figi, position: currentPosition, body });
  };
  const savingPosition = positionMutation.isPending;

  return <Box sx={{ width: "100%" }}>
    <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>{symbol} {t("analysisReport.analysis")}</Typography>
        <Typography variant="body2" color="text.secondary">{t("analysisReport.backend")} · FIGI {figi}</Typography>
        {report && <Typography variant="caption" color="text.secondary">As of {report.context.analysisAsOf} · {report.context.horizon}{view?.priceDataThrough ? ` · ${t("analysisReport.priceDataThrough")}: ${view.priceDataThrough}` : ""}</Typography>}
      </Box>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <FormControl size="small" sx={{ minWidth: 120 }}><InputLabel>{t("analysisReport.horizon")}</InputLabel><Select label={t("analysisReport.horizon")} value={horizon} onChange={(e) => setHorizon(e.target.value as AnalysisHorizon)}><MenuItem value="SWING">SWING</MenuItem><MenuItem value="POSITION">POSITION</MenuItem></Select></FormControl>
        <FormControl size="small" sx={{ minWidth: 170 }}><InputLabel>{t("analysisReport.position")}</InputLabel><Select label={t("analysisReport.position")} value={positionKind} onChange={(e) => setPositionKind(e.target.value as PositionSelectionKind)}><MenuItem value="UNKNOWN">{t("analysisReport.unknown")}</MenuItem><MenuItem value="CURRENT" disabled={!currentPosition}>{t("analysisReport.currentManual")}</MenuItem><MenuItem value="EXPLICIT_NONE">{t("analysisReport.explicitNone")}</MenuItem></Select></FormControl>
        <Button startIcon={<ArrowBack />} variant="outlined" onClick={close}>{t("analysisReport.back")}</Button>
      </Stack>
    </Stack>

    {loading && <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}><CircularProgress size={28} /><Typography sx={{ mt: 1 }}>{t("analysisReport.loading")}</Typography></Paper>}
    {error && <Alert severity="error">{error}</Alert>}
    {!loading && !error && report && view && <>
      <Alert severity={report.eligibility.status === "ALLOWED" ? "success" : report.eligibility.status === "DEGRADED" ? "warning" : "error"} sx={{ mb: 2 }}>
        {t("analysisReport.eligibility")}: <b>{report.eligibility.status}</b>{report.eligibility.reasons.length ? ` · ${report.eligibility.reasons.map((r) => r.code).join(", ")}` : ""}
      </Alert>

      <Grid container spacing={2}>
        {[
          [t("analysisReport.latestClose"), fmt(view.currentPrice)],
          [t("analysisReport.marketDecision"), view.confluence?.marketDecision ?? "—"],
          [t("analysisReport.confidence"), view.confluence?.confidence ?? "—"],
          [t("analysisReport.evidenceScore"), fmt(view.confluence?.evidenceScore, 1)],
          ["RSI 14", fmt(view.market ? metric(view.market.momentum.rsi14) : null)],
          ["Market", view.market ? metric(view.market.market)?.regime ?? view.market.market.status : "—"],
        ].map(([label, value]) => <Grid key={String(label)} size={{ xs: 6, md: 2 }}><Paper variant="outlined" sx={{ p: 2, height: "100%" }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="h6" sx={{ fontWeight: 700 }}>{value}</Typography></Paper></Grid>)}
      </Grid>

      {view.structure?.timeframes?.length ? <Paper variant="outlined" sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{t("analysisReport.timeframes")}</Typography><Divider sx={{ my: 2 }} />
        <Grid container spacing={2}>{view.structure.timeframes.map((tf) => <Grid key={tf.timeframe} size={{ xs: 12, md: 4 }}>
          <Typography sx={{ fontWeight: 700 }}>{tf.timeframe}</Typography>
          <Typography>{t("analysisReport.trend")}: {metric(tf.majorTrend)?.state ?? tf.majorTrend.status}</Typography>
          <Typography>ATR14: {fmt(metric(tf.atr14)?.atr)} ({fmt(metric(tf.atr14)?.atrPercent)}%)</Typography>
        </Grid>)}</Grid>
      </Paper> : null}

      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid size={{ xs: 12, md: 6 }}><Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
          <Stack direction="row" spacing={1} alignItems="center"><ShowChart color="primary" /><Typography variant="h6" sx={{ fontWeight: 700 }}>{t("analysisReport.tradePlan")}</Typography>{view.plan && <Chip size="small" label={view.plan.status} />}</Stack>
          <Divider sx={{ my: 2 }} />
          {!view.plan ? <Typography color="text.secondary">{view.confluence?.preferredPlanId ? t("analysisReport.preferredPlanMissing") : t("analysisReport.noPreferredPlan")}</Typography> : <Stack spacing={1}>
            <Typography>Plan: <b>{view.plan.planId}</b></Typography>
            <Typography>Entry: <b>{view.plan.entryRange ? `${fmt(view.plan.entryRange.lower)} – ${fmt(view.plan.entryRange.upper)}` : "—"}</b></Typography>
            <Typography>{t("analysisReport.entryMethod")}: <b>{view.plan.entryMethod ?? "—"}</b></Typography>
            <Typography>{t("analysisReport.trigger")}: <b>{view.plan.trigger ?? "—"}</b></Typography>
            <Typography>Stop: <b>{fmt(view.plan.stop?.protectivePrice)}</b></Typography>
            <Typography>Targets: <b>{view.plan.targets.map((target) => `${fmt(target.price)} (${fmt(target.weight * 100, 0)}%)`).join(" / ") || "—"}</b></Typography>
            <Typography>Net RR: <b>{fmt(view.rr?.netRR)}</b></Typography>
            {!!view.plan.reasons.length && <Alert severity="info">{view.plan.reasons.map((r) => r.code).join(" · ")}</Alert>}
          </Stack>}
        </Paper></Grid>

        <Grid size={{ xs: 12, md: 6 }}><Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{t("analysisReport.valuation")}</Typography><Divider sx={{ my: 2 }} />
          {view.fairValue ? <Stack spacing={1}><Typography>Model: <b>{view.fairValue.modelCode}</b></Typography><Typography>Fair value: <b>{fmt(view.fairValue.low)} – {fmt(view.fairValue.high)}</b></Typography><Typography>Central: <b>{fmt(view.fairValue.central)}</b></Typography></Stack>
            : <Typography color="text.secondary">{report.valuation.status === "AVAILABLE" ? view.valuation?.fairValueRange?.reasons?.[0]?.code ?? "Fair value unavailable" : report.valuation.reasons?.[0]?.code ?? report.valuation.status}</Typography>}
        </Paper></Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid size={{ xs: 12, md: 6 }}><Paper variant="outlined" sx={{ p: 3, height: "100%" }}><Typography variant="h6" sx={{ fontWeight: 700 }}>{t("analysisReport.levels")}</Typography><Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">Support</Typography>{view.levels?.supports?.slice(0, 3).map((zone) => <Typography key={zone.id}>{fmt(zone.lower)}–{fmt(zone.upper)} [{zone.strengthLabel}] · {zone.timeframe} · tests {zone.testCount}{zone.lastTestAt ? ` · ${zone.lastTestAt}` : ""}</Typography>) ?? <Typography>—</Typography>}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Resistance</Typography>{view.levels?.resistances?.slice(0, 3).map((zone) => <Typography key={zone.id}>{fmt(zone.lower)}–{fmt(zone.upper)} [{zone.strengthLabel}] · {zone.timeframe} · tests {zone.testCount}{zone.lastTestAt ? ` · ${zone.lastTestAt}` : ""}</Typography>) ?? <Typography>—</Typography>}
        </Paper></Grid>
        <Grid size={{ xs: 12, md: 6 }}><Paper variant="outlined" sx={{ p: 3, height: "100%" }}><Typography variant="h6" sx={{ fontWeight: 700 }}>{t("analysisReport.positionDecision")}</Typography><Divider sx={{ my: 2 }} />
          {view.position ? <><Typography variant="h4" sx={{ fontWeight: 800 }}>{view.position.action}</Typography><Typography color="text.secondary">{view.position.primaryReason}</Typography>{view.position.suggestedQuantity != null && <Typography sx={{ mt: 1 }}>Suggested quantity: {fmt(view.position.suggestedQuantity, 4)}</Typography>}</>
            : <Typography color="text.secondary">{report.positionDecision.reasons?.[0]?.code ?? report.positionDecision.status}</Typography>}
        </Paper></Grid>
      </Grid>

      {view.confluence?.scenarios?.length ? <Paper variant="outlined" sx={{ p: 3, mt: 2 }}><Typography variant="h6" sx={{ fontWeight: 700 }}>{t("analysisReport.scenarios")}</Typography><Divider sx={{ my: 2 }} /><Grid container spacing={2}>{view.confluence.scenarios.map((scenario) => <Grid key={scenario.id ?? scenario.type} size={{ xs: 12, md: 4 }}><Typography sx={{ fontWeight: 700 }}>{scenario.type}</Typography><Typography>{t("analysisReport.trigger")}: {scenario.trigger ?? "—"}</Typography><Typography>Target: {fmt(scenario.targetPrice)}</Typography><Typography>Invalidation: {fmt(scenario.invalidationPrice)}</Typography><Typography variant="caption" color="text.secondary">{scenario.rationale}</Typography></Grid>)}</Grid></Paper> : null}

      <Paper variant="outlined" sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{t("analysisReport.accountRisk")}</Typography><Divider sx={{ my: 2 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t("analysisReport.accountOptional")}</Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth label={t("analysisReport.equity")} value={accountForm.equity} onChange={(e) => setAccountForm({ ...accountForm, equity: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth label={t("analysisReport.availableCash")} value={accountForm.availableCash} onChange={(e) => setAccountForm({ ...accountForm, availableCash: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth label={t("analysisReport.portfolioRisk")} value={accountForm.portfolioRiskAmount} onChange={(e) => setAccountForm({ ...accountForm, portfolioRiskAmount: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, md: 1.5 }}><TextField fullWidth label={t("analysisReport.riskBudget")} value={accountForm.riskBudgetPercent} onChange={(e) => setAccountForm({ ...accountForm, riskBudgetPercent: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, md: 1.5 }}><TextField fullWidth label={t("analysisReport.maxPortfolioRisk")} value={accountForm.maxPortfolioRiskPercent} onChange={(e) => setAccountForm({ ...accountForm, maxPortfolioRiskPercent: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, md: 1.5 }}><TextField fullWidth label={t("analysisReport.maxPositionWeight")} value={accountForm.maxPositionWeightPercent} onChange={(e) => setAccountForm({ ...accountForm, maxPositionWeightPercent: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, md: 1.5 }}><TextField fullWidth label={t("analysisReport.quantityStep")} value={accountForm.quantityStep} onChange={(e) => setAccountForm({ ...accountForm, quantityStep: e.target.value })} /></Grid>
        </Grid>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}><Button variant="contained" onClick={applyAccountRisk}>{t("analysisReport.applyAccount")}</Button><Button variant="outlined" onClick={clearAccountRisk}>{t("analysisReport.clearAccount")}</Button>{accountRisk && <Chip size="small" label="USER_DECLARED" />}</Stack>
        {accountMessage && <Alert severity={accountRisk ? "success" : "info"} sx={{ mt: 2 }}>{accountMessage}</Alert>}
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{t("analysisReport.positionForm")}</Typography><Divider sx={{ my: 2 }} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth label={t("analysisReport.quantity")} value={positionForm.quantity} onChange={(e) => setPositionForm({ ...positionForm, quantity: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth label={t("analysisReport.averageCost")} value={positionForm.averageCost} onChange={(e) => setPositionForm({ ...positionForm, averageCost: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth label={t("analysisReport.manualStop")} value={positionForm.manualStop} onChange={(e) => setPositionForm({ ...positionForm, manualStop: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="Basis" value={positionForm.basisRef} onChange={(e) => setPositionForm({ ...positionForm, basisRef: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label={t("analysisReport.thesis")} value={positionForm.thesis} onChange={(e) => setPositionForm({ ...positionForm, thesis: e.target.value })} /></Grid>
        </Grid>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}><Button variant="contained" disabled={savingPosition || !positionQuery.isFetched || positionQuery.isFetching} onClick={savePosition}>{savingPosition ? t("analysisReport.saving") : t("analysisReport.savePosition")}</Button>{currentPosition && <Chip size="small" label={`${currentPosition.status} · v${currentPosition.version}`} />}</Stack>
        {positionMessage && <Alert severity={positionMessage === t("analysisReport.positionSaved") ? "success" : "info"} sx={{ mt: 2 }}>{positionMessage}</Alert>}
      </Paper>

      <Alert severity="info" sx={{ mt: 2 }}>{t("analysisReport.backendOnly")}</Alert>
    </>}
  </Box>;
}
