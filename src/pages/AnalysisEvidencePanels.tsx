import React from "react";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Chip, Divider, Link, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";
import { AnalysisReason, FairValueRange, IndustryMarketReference, MetricResult, MetricStatus, MomentumAnalysis, MomentumVolume } from "../services/types/dto/analysis";

const number = (value?: number | null) => value == null || !Number.isFinite(value) ? "—" : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
export const readableState = (t: TFunction, code?: string | null) => code
  ? t(`analysisReport.states.${code}`, { defaultValue: t("analysisReport.stateUnknown") }) : t("analysisReport.stateUnknown");
export const readableReason = (t: TFunction, reason: AnalysisReason) => t(`analysisReport.reasons.${reason.code}`,
  { ...reason.params, defaultValue: reason.message || t("analysisReport.unavailableExplanation") });

function Sources({ value }: { value: unknown }) {
  const { t } = useTranslation();
  if (typeof value !== "string") return null;
  const urls = value.split(/\s+/).filter((candidate) => {
    try { const url = new URL(candidate); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password; }
    catch { return false; }
  });
  return <Stack spacing={0.5}>{urls.map((url, index) => <Link key={url} href={url} target="_blank" rel="noopener noreferrer">
    {t("analysisReport.source")} {index + 1} · {new URL(url).hostname}
  </Link>)}</Stack>;
}

export function FairValuePanel({ title, result, fallbackStatus, fallbackReasons, industry = false }: {
  title: string; result?: MetricResult<FairValueRange> | null; fallbackStatus: MetricStatus; fallbackReasons: AnalysisReason[]; industry?: boolean;
}) {
  const { t } = useTranslation();
  const value = result?.status === "AVAILABLE" ? result.value : null;
  const status = result?.status ?? (fallbackStatus === "AVAILABLE" ? "INSUFFICIENT_DATA" : fallbackStatus);
  const reasons = result?.reasons?.length ? result.reasons : fallbackReasons;
  const assumptions = value?.assumptions ?? {};
  const observation = value?.observation;
  return <Box component="section" aria-label={title}>
    <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
    <Stack spacing={1} sx={{ mt: 2 }}>
      {value ? <>
        <Typography>{t("analysisReport.valuationModel")}: <b>{value.modelCode}</b></Typography>
        <Typography>{t("analysisReport.fairValueRange")}: <b>{number(value.low)} – {number(value.high)} USD</b></Typography>
        <Typography>{t(`analysisReport.${industry ? "rangeMidpoint" : "fairValueCentral"}`)}: <b>{number(value.central)}</b></Typography>
        {observation ? <Alert severity={observation.position === "BELOW_RANGE" ? "info" : observation.position === "ABOVE_RANGE" ? "warning" : "success"}>
          <Typography sx={{ fontWeight: 700 }}>{t(`analysisReport.observations.${observation.position}`)}</Typography>
          <Typography variant="body2">{t("analysisReport.observationPrice")}: {number(observation.currentPrice)} USD</Typography>
          <Typography variant="body2">{t("analysisReport.buyBelow")}: {number(observation.buyBelow)} USD</Typography>
          <Typography variant="body2">{t("analysisReport.sellAbove")}: {number(observation.sellAbove)} USD</Typography>
        </Alert> : <Typography color="text.secondary">{t("analysisReport.observationUnavailable")}</Typography>}
        <Typography variant="body2" color="text.secondary">{t("analysisReport.observationLimit")}</Typography>
        <Accordion disableGutters elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
          <AccordionSummary expandIcon={<ExpandMore />}><Typography>{t("analysisReport.calculationEvidence")}</Typography></AccordionSummary>
          <AccordionDetails><Stack spacing={1}>
            <Typography>{t("analysisReport.formula")}: {t(`analysisReport.formulas.${value.modelCode}`, { defaultValue: t("analysisReport.formulaUnavailable") })}</Typography>
            <Typography>{t("analysisReport.denominator")}: {number(value.denominatorValue)}</Typography>
            {typeof assumptions.denominatorConvention === "string" && <Typography>{t("analysisReport.denominatorConvention")}: {t(`analysisReport.conventions.${assumptions.denominatorConvention}`, { defaultValue: assumptions.denominatorConvention })}</Typography>}
            {["totalDebt", "cashLikeAssets", "sharesOutstanding"].filter((key) => typeof assumptions[key] === "number").map((key) =>
              <Typography key={key}>{t(`analysisReport.${key}`)}: {number(assumptions[key] as number)}</Typography>)}
            {!!Object.keys(value.multipleQuantiles ?? {}).length && <Box>
              <Typography variant="body2">{t("analysisReport.multipleInputs")}</Typography>
              {Object.entries(value.multipleQuantiles ?? {}).map(([key, multiple]) => <Typography key={key} variant="body2">
                {t(`analysisReport.quantiles.${key}`, { defaultValue: key })}: {number(multiple)}×
              </Typography>)}
            </Box>}
            {typeof assumptions.classificationCode === "string" && <Typography>{t("analysisReport.industryCode")}: {assumptions.classificationCode}</Typography>}
            {typeof assumptions.classificationAsOf === "string" && <Typography>{t("analysisReport.assessedAsOf")}: {assumptions.classificationAsOf}</Typography>}
            <Sources value={assumptions.sourceUrls} />
            <Typography variant="body2" color="text.secondary">{industry ? t("analysisReport.industryFairValueDescription") : t("analysisReport.historicalMethodDescription")}</Typography>
            {value.evidenceRefs?.length ? <Box><Typography variant="caption">{t("analysisReport.evidenceReferences")}</Typography>
              <Typography variant="caption" component="div" sx={{ overflowWrap: "anywhere" }}>{value.evidenceRefs.join(" · ")}</Typography></Box> : null}
          </Stack></AccordionDetails>
        </Accordion>
      </> : <>
        <Typography color="text.secondary">{t("analysisReport.metricStatus")}: {readableState(t, status)}</Typography>
        <Typography color="text.secondary">{reasons?.map((reason) => readableReason(t, reason)).join(" · ") || t("analysisReport.fairValueUnavailable")}</Typography>
        {!!reasons?.length && <Box component="details"><Typography component="summary" variant="caption">{t("analysisReport.reasonDetails")}</Typography><Typography variant="caption">{reasons.map((reason) => reason.code).join(" · ")}</Typography></Box>}
      </>}
    </Stack>
  </Box>;
}

export function IndustryMarketPanel({ reference }: { reference?: IndustryMarketReference | null }) {
  const { t } = useTranslation();
  return <Paper variant="outlined" sx={{ p: 3, mt: 2 }}>
    <Typography variant="h6" sx={{ fontWeight: 700 }}>{t("analysisReport.industryMarket")}</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>{t("analysisReport.industryMarketDescription")}</Typography>
    {reference ? <>
      <Typography>{t("analysisReport.valuationIndustry")}: {reference.valuationIndustry || "—"}</Typography>
      <Typography>{t("analysisReport.primaryMetric")}: {reference.primaryValuationMetric ?? "—"}</Typography>
      <Typography>{t("analysisReport.marketAsOf")}: {reference.marketAsOf ?? "—"}</Typography>
      {reference.status === "AVAILABLE" ? <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
        {[["P/E", reference.peMedian], ["P/B", reference.pbMedian], ["P/S", reference.psMedian], ["EV/EBITDA", reference.evEbitdaMedian]].map(([label, value]) =>
          <Chip key={String(label)} variant="outlined" label={`${label}: ${number(value as number | null)}×`} />)}
      </Stack> : <Typography color="text.secondary">{readableState(t, reference.status)} · {t(`analysisReport.reasons.${reference.reasonCode}`, { defaultValue: t("analysisReport.marketReferenceUnavailable") })}</Typography>}
    </> : <Typography color="text.secondary">{t("analysisReport.marketReferenceUnavailable")}</Typography>}
  </Paper>;
}

const COMMON_INDICATORS = ["RSI14", "MACD", "MACD_SIGNAL", "MACD_HISTOGRAM", "SMA20", "SMA50", "SMA200", "ATR14"];
export function TechnicalIndicatorsPanel({ detail, dataThrough, momentum }: { detail?: MomentumAnalysis | null; dataThrough?: string | null; momentum?: MomentumVolume | null }) {
  const { t } = useTranslation();
  const entries = Object.entries(detail?.indicators ?? {});
  const renderRows = (rows: Array<[string, MetricResult<number>]>) => <Table size="small">
    <TableHead><TableRow>{["indicator", "indicatorValue", "interpretation"].map((key) => <TableCell key={key}>{t(`analysisReport.${key}`)}</TableCell>)}</TableRow></TableHead>
    <TableBody>{rows.map(([code, result]) => {
      const interpretation = detail?.interpretations?.[code];
      return <TableRow key={code}>
        <TableCell sx={{ minWidth: 150 }}><Typography variant="body2" sx={{ fontWeight: 700 }}>{t(`analysisReport.indicatorNames.${code}`, { defaultValue: code })}</Typography>
          <Typography variant="caption" color="text.secondary">{t(`analysisReport.indicatorDefinitions.${code}`, { defaultValue: t("analysisReport.technicalDefinition") })}</Typography>
          {interpretation?.params.period != null && <Typography variant="caption" display="block">{t("analysisReport.period")}: {interpretation.params.period}</Typography>}
          {interpretation?.params.requiredBars != null && <Typography variant="caption" display="block">{t("analysisReport.priceBars")}: {interpretation.params.availableBars ?? "—"} / {interpretation.params.requiredBars}</Typography>}
        </TableCell>
        <TableCell>{result.status === "AVAILABLE" ? <>{number(result.value)} {interpretation?.params.unit ? t(`analysisReport.units.${interpretation.params.unit}`, { defaultValue: String(interpretation.params.unit) }) : ""}</> : readableState(t, result.status)}</TableCell>
        <TableCell><Typography variant="body2">{result.status === "AVAILABLE" && interpretation?.status === "AVAILABLE"
          ? t(`analysisReport.interpretations.${interpretation.code}`, { ...interpretation.params, defaultValue: t("analysisReport.interpretationUnavailable") })
          : result.status === "AVAILABLE" ? t("analysisReport.interpretationUnavailable")
            : result.reasons.map((reason) => readableReason(t, reason)).join(" · ") || t("analysisReport.unavailableExplanation")}</Typography>
        </TableCell>
      </TableRow>;
    })}</TableBody>
  </Table>;
  return <Paper variant="outlined" sx={{ p: 3, mt: 2 }}>
    <Typography variant="h6" sx={{ fontWeight: 700 }}>{t("analysisReport.technicalIndicators")}</Typography>
    <Typography variant="body2" color="text.secondary">{t("analysisReport.priceDataThrough")}: {dataThrough ?? "—"} · {t("analysisReport.indicatorTimeframe")}</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>{t("analysisReport.indicatorLimit")}</Typography>
    <Divider sx={{ my: 2 }} />
    {entries.length ? <Box sx={{ overflowX: "auto" }}>
      {renderRows(entries.filter(([code]) => COMMON_INDICATORS.includes(code)))}
      <Accordion disableGutters elevation={0}>
        <AccordionSummary expandIcon={<ExpandMore />}><Typography>{t("analysisReport.moreIndicators")}</Typography></AccordionSummary>
        <AccordionDetails sx={{ px: 0 }}>{renderRows(entries.filter(([code]) => !COMMON_INDICATORS.includes(code)))}</AccordionDetails>
      </Accordion>
    </Box> : <Typography color="text.secondary">{t("analysisReport.indicatorsUnavailable")}</Typography>}
    {momentum && <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
      {[["volumeVs20Day", momentum.volumeVs20Day, "×"], ["return20", momentum.return20, "%"], ["return60", momentum.return60, "%"], ["drawdownFrom252High", momentum.drawdownFrom252High, "%"]].map(([key, source, unit]) => {
        const result = source as MetricResult<number>;
        return <Box key={String(key)}><Typography variant="caption">{t(`analysisReport.${key}`)}</Typography>
          <Typography>{result?.status === "AVAILABLE" && result.value != null
            ? unit === "%" ? result.value.toLocaleString(undefined, { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }) : `${number(result.value)}${unit}`
            : readableState(t, result?.status)}</Typography></Box>;
      })}
    </Stack>}
  </Paper>;
}
