import React from "react";
import { Accordion, AccordionDetails, AccordionSummary, Box, Divider, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";
import { AnalysisReason, MetricResult, MomentumAnalysis, MomentumVolume } from "../services/types/dto/analysis";
import { ValuationReference } from "../services/types/dto/valuation";

export const formatNumber = (value?: number | null, digits = 2) => value == null || !Number.isFinite(value)
  ? "—" : value.toLocaleString("zh-HK", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const number = formatNumber;
const statusLabels: Record<string, string> = {
  AVAILABLE: "可用", PARTIAL: "部分可用", STALE: "資料過期", INSUFFICIENT_DATA: "資料不足",
  UNVERIFIED: "尚未確認", NOT_APPLICABLE: "不適用", UNAVAILABLE: "暫不可用", UNRESOLVED: "資料待補",
};
export const statusLabel = (code?: string | null) => code ? statusLabels[code] ?? code : "尚未計算";
export const readableState = (t: TFunction, code?: string | null) => code
  ? t("analysisReport.states." + code, { defaultValue: statusLabel(code) }) : "—";
export const readableReason = (t: TFunction, reason: AnalysisReason) => t("analysisReport.reasons." + reason.code,
  { ...reason.params, defaultValue: reason.message || reason.code });
export const reasonLabel = (t: TFunction, code?: string | null) => {
  if (!code) return "沒有可用資料";
  const fallback = code === "NON_POSITIVE_FCF" ? "自由現金流非正，P/FCF 不適用（N.M.）"
    : code === "NON_POSITIVE_EPS" ? "每股盈利非正（虧損或零盈利），PE 不適用（N.M.）" : code;
  return t("analysisReport.reasons." + code, { defaultValue: fallback });
};
const metricLabels: Record<string, string> = {
  pe: "P/E", pb: "P/B", ps: "P/S", pfcf: "P/FCF", evEbitda: "EV/EBITDA",
  PE: "P/E", PB: "P/B", PS: "P/S", PFCF: "P/FCF", EV_EBITDA: "EV/EBITDA",
};
export const metricLabel = (code?: string | null) => code ? metricLabels[code] ?? code : "—";

export function ValuationReferencePanel({ title, description, reference, currency }: {
  title: string; description: string; reference: ValuationReference | null | undefined; currency: string | null | undefined;
}) {
  const { t } = useTranslation();
  const available = reference?.status === "AVAILABLE";
  const assumption = reference?.kind === "INDUSTRY_ASSUMPTION";
  return <Paper component="section" aria-label={title} variant="outlined" sx={{ p: 2.5, height: "100%" }}>
    <Typography variant="h6" fontWeight={700}>{title}</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>{description}</Typography>
    <Stack spacing={0.7}>
      <Typography>狀態：{statusLabel(reference?.status)}</Typography>
      <Typography>指標：{metricLabel(reference?.metricCode)}</Typography>
      {available && reference ? <>
        <Typography>{assumption ? "假設倍數" : "市場倍數區間"}：<b>{formatNumber(reference.multipleLow)}–{formatNumber(reference.multipleHigh)} 倍</b></Typography>
        {!assumption && <Typography>市場中位數：{formatNumber(reference.multipleMedian)} 倍 · 樣本數：{reference.sampleCount ?? "—"}</Typography>}
        <Typography>{assumption ? "假設價格區間" : "價格參考區間"}：<b>{formatNumber(reference.priceLow)}–{formatNumber(reference.priceHigh)}</b> {currency ?? ""}</Typography>
        {reference.priceLow == null || reference.priceHigh == null ? <Typography variant="body2" color="text.secondary">倍數可用，但價格換算條件不足；不以零補值。</Typography> : null}
      </> : <Typography color="text.secondary">{reasonLabel(t, reference?.reasonCode)}</Typography>}
      <Typography variant="caption" color="text.secondary">{assumption
        ? "這是經確認的產業假設情境，不是市場實際成交估值。"
        : "這是實際市場資料的比較基準，不等同內在價值或買賣指令。"}</Typography>
    </Stack>
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
