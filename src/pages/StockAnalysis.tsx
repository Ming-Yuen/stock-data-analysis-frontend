import React, { useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { ArrowBack, ShowChart } from "@mui/icons-material";
import { WatchItem } from "../services/types/dto/watchlist";
import { useTranslation } from "react-i18next";

interface StockAnalysisPageProps {
  stock: WatchItem;
  onClose: () => void;
}

const formatNumber = (value?: number | null, digits = 2) =>
  value == null || !Number.isFinite(value) ? "—" : value.toFixed(digits);

const finiteNumber = (value?: number | null) =>
  value != null && Number.isFinite(Number(value)) ? Number(value) : null;

const momentumLevelKey = (rsi: number) => {
  if (rsi < 30) return "oversold";
  if (rsi < 45) return "weak";
  if (rsi <= 55) return "neutral";
  if (rsi <= 70) return "strong";
  return "overbought";
};

export function StockAnalysisPage({ stock, onClose }: StockAnalysisPageProps) {
  const { t } = useTranslation();
  const analysis = useMemo(() => {
    const price = Number(stock.closePrice);
    const pe = Number(stock.pe);
    const peg = Number(stock.peg);
    const rsi7 = finiteNumber(stock.rsi7);
    const rsi14 = finiteNumber(stock.rsi14);
    const rsi21 = finiteNumber(stock.rsi21);
    const valuationNetCashPerShare = stock.netCashForValuationPerShare == null
      ? null
      : Number(stock.netCashForValuationPerShare);
    const earningsPerShareTtm = stock.earningsPerShareTtm == null ? null : Number(stock.earningsPerShareTtm);
    const hasEps = earningsPerShareTtm != null && Number.isFinite(earningsPerShareTtm);
    const lossMaking = hasEps && earningsPerShareTtm <= 0;
    const eps = hasEps ? earningsPerShareTtm : null;
    const usableNetCashPerShare = valuationNetCashPerShare != null && Number.isFinite(valuationNetCashPerShare)
      ? valuationNetCashPerShare
      : null;
    const pegLooksInvalid = !Number.isFinite(peg) || peg <= 0 || Math.abs(peg - pe) < 0.01;

    // A deliberately conservative heuristic until growth forecasts are available.
    const targetPeLow = !pegLooksInvalid && peg <= 1.5 ? 15 : 12;
    const targetPeHigh = !pegLooksInvalid && peg <= 1.5 ? 22 : 18;
    const earningsValueLow = eps == null ? null : eps * targetPeLow;
    const earningsValueHigh = eps == null ? null : eps * targetPeHigh;
    const fairValueLow = earningsValueLow == null || usableNetCashPerShare == null
      ? null
      : earningsValueLow + usableNetCashPerShare;
    const fairValueHigh = earningsValueHigh == null || usableNetCashPerShare == null
      ? null
      : earningsValueHigh + usableNetCashPerShare;
    const buyLow = fairValueLow == null ? null : fairValueLow * 0.8;
    const buyHigh = fairValueLow;

    let valuation = lossMaking
      ? t("stockAnalysis.valuation.lossMaking")
      : t("stockAnalysis.value.insufficientData");
    let color: "success" | "warning" | "error" | "default" = "default";
    if (buyHigh != null && fairValueHigh != null) {
      if (price <= buyHigh) {
        valuation = t("stockAnalysis.valuation.buyZone");
        color = "success";
      } else if (price <= fairValueHigh) {
        valuation = t("stockAnalysis.valuation.fairValue");
        color = "warning";
      } else {
        valuation = t("stockAnalysis.valuation.overvalued");
        color = "error";
      }
    }

    let momentumKey = "neutral";
    if (rsi7 == null || rsi14 == null || rsi21 == null) {
      momentumKey = "insufficient";
    } else if (rsi7 < 30 && rsi21 >= 50) {
      momentumKey = "shortOversoldTrendHealthy";
    } else if (rsi7 > 70 && rsi21 >= 45 && rsi21 <= 70) {
      momentumKey = "shortOverboughtTrendHealthy";
    } else if (rsi14 < 30) {
      momentumKey = "broadlyOversold";
    } else if (rsi14 > 70) {
      momentumKey = "broadlyOverbought";
    } else if (rsi7 < rsi14 && rsi14 < rsi21) {
      momentumKey = "weakening";
    } else if (rsi7 > rsi14 && rsi14 > rsi21) {
      momentumKey = "strengthening";
    }
    const momentum = t(`stockMomentum.summary.${momentumKey}`);

    return { eps, targetPeLow, targetPeHigh, earningsValueLow, earningsValueHigh, fairValueLow, fairValueHigh, buyLow, buyHigh, valuation, color, momentum, pegLooksInvalid, lossMaking, rsi7, rsi14, rsi21 };
  }, [stock, t]);

  const unavailable = t("stockAnalysis.value.unavailable");
  const translatedClassification = [stock.industry, stock.category, stock.subCategory]
    .filter((value): value is string => Boolean(value))
    .map((value) => t(value, { defaultValue: value }));
  const reportPeriod = stock.fiscalYear && stock.fiscalPeriod
    ? t(`stockAnalysisDates.reportPeriod.${stock.fiscalPeriod}`, {
        year: stock.fiscalYear,
        defaultValue: t("stockAnalysisDates.reportPeriod.unknown", { year: stock.fiscalYear, period: stock.fiscalPeriod }),
      })
    : t("stockAnalysisDates.reportPeriod.latest");

  return (
    <Box sx={{ width: "100%" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {t("stockAnalysis.title", { symbol: stock.symbol })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {stock.industry ? t(stock.industry, { defaultValue: stock.industry }) : "—"} · {stock.category ? t(stock.category, { defaultValue: stock.category }) : "—"} · {t("stockAnalysisDates.tradingDate")} {stock.quoteDate || "—"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {reportPeriod} · {t("stockAnalysisDates.secFilingDate")} {stock.latestFilingDate || unavailable} · {t("stockAnalysisExtra.financialPeriodEnd")} {stock.fundamentalAsOfDate || unavailable}
          </Typography>
          {stock.nextEarningsDate && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              {t("stockAnalysisDates.nextEarningsDate")} {stock.nextEarningsDate}
            </Typography>
          )}
        </Box>
        <Button startIcon={<ArrowBack />} variant="outlined" onClick={onClose}>
          {t("stockAnalysis.backToWatchlist")}
        </Button>
      </Stack>

      {stock.postFilingEventTitle && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography sx={{ fontWeight: 700 }}>
            {stock.postFilingEventDate ? `${stock.postFilingEventDate} · ` : ""}
            {t("stockAnalysisExtra.postFilingEvent.title", {
              form: stock.postFilingEventSubtype || "SEC",
            })}
          </Typography>
          <Typography variant="body2">{t("stockAnalysisExtra.postFilingEvent.description")}</Typography>
        </Alert>
      )}

      <Grid container spacing={2}>
        {[
          [t("stockAnalysis.metrics.closePrice"), formatNumber(stock.closePrice)],
          ["PE", analysis.lossMaking ? t("stockAnalysisValue.lossMaking") : formatNumber(stock.pe)],
          ["PEG", analysis.lossMaking ? t("stockAnalysisValue.lossMaking") : formatNumber(stock.peg)],
          [t("stockAnalysis.metrics.cashPerShare"), formatNumber(stock.cashPerShare)],
          [t("stockAnalysis.metrics.cashLikeAssetsPerShare"), formatNumber(stock.cashLikeAssetsPerShare)],
          [t("stockAnalysisExtra.debtPerShare"), formatNumber(stock.debtPerShare)],
          [t("stockAnalysis.metrics.netCashPerShare"), formatNumber(stock.netCashPerShare)],
          [t("stockAnalysis.metrics.netCashForValuationPerShare"), formatNumber(stock.netCashForValuationPerShare)],
          [t("stockAnalysis.metrics.ttmEps"), formatNumber(analysis.eps)],
        ].map(([label, value]) => (
          <Grid key={label} size={{ xs: 6, md: 2 }}>
            <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
              <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 700 }}>{value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {stock.epsCalculationMethod && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          {t("stockAnalysisExtra.epsCalculationMethod")}: {t(
            `stockAnalysisExtra.epsCalculationMethods.${stock.epsCalculationMethod}`,
            { defaultValue: stock.epsCalculationMethod }
          )}
        </Typography>
      )}

      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <ShowChart color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{t("stockAnalysis.valuationSection")}</Typography>
              <Chip label={analysis.valuation} color={analysis.color} size="small" />
            </Stack>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" color="text.secondary">{t("stockAnalysis.buyRange")}</Typography>
                <Typography variant="h4" color="success.main" sx={{ fontWeight: 800, mt: 0.5 }}>
                  {analysis.buyLow == null
                    ? t(analysis.lossMaking ? "stockAnalysis.value.peNotApplicable" : "stockAnalysis.value.insufficientData")
                    : `${formatNumber(analysis.buyLow)} – ${formatNumber(analysis.buyHigh)}`}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" color="text.secondary">{t("stockAnalysis.cashAdjustedFairValue")}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
                  {analysis.fairValueLow == null
                    ? t(analysis.lossMaking ? "stockAnalysis.value.peNotApplicable" : "stockAnalysis.value.insufficientData")
                    : `${formatNumber(analysis.fairValueLow)} – ${formatNumber(analysis.fairValueHigh)}`}
                </Typography>
              </Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary">
              {analysis.lossMaking
                ? t("stockAnalysis.lossMakingDescription", { eps: formatNumber(analysis.eps) })
                : t("stockAnalysis.calculationDescription", {
                    low: analysis.targetPeLow,
                    high: analysis.targetPeHigh,
                    netCash: formatNumber(stock.netCashForValuationPerShare),
                  })}
            </Typography>
            {!analysis.lossMaking && analysis.pegLooksInvalid && (
              <Alert severity="info" sx={{ mt: 2 }}>
                {t("stockAnalysis.pegWarning")}
              </Alert>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{t("stockAnalysis.supportingAssessment")}</Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary">{t("stockAnalysis.rsiMomentum")}</Typography>
                <Stack spacing={0.75} sx={{ mt: 0.75 }}>
                  {[
                    ["RSI (7D)", analysis.rsi7, "shortTerm"],
                    ["RSI (14D)", analysis.rsi14, "standard"],
                    ["RSI (21D)", analysis.rsi21, "mediumTerm"],
                  ].map(([label, value, horizon]) => (
                    <Stack key={String(label)} direction="row" justifyContent="space-between" spacing={2}>
                      <Typography>{label}</Typography>
                      <Typography sx={{ fontWeight: 700 }}>
                        {formatNumber(value as number | null)} · {value != null
                          ? t(`stockMomentum.level.${momentumLevelKey(value as number)}`)
                          : t("stockAnalysis.value.insufficientData")} · {t(`stockMomentum.horizon.${horizon}`)}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
                <Alert severity="info" sx={{ mt: 1.5 }}>{analysis.momentum}</Alert>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">{t("stockAnalysis.cashBuffer")}</Typography>
                <Typography>
                  {t("stockAnalysis.cashBufferDescription", {
                    cash: formatNumber(stock.cashLikeAssetsPerShare),
                    debt: formatNumber(stock.debtPerShare),
                    netCash: formatNumber(stock.netCashForValuationPerShare),
                    percentage: stock.closePrice > 0 && stock.netCashForValuationPerShare != null ? `${formatNumber(stock.netCashForValuationPerShare / stock.closePrice * 100, 1)}%` : "—",
                  })}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">{t("stockAnalysis.classification")}</Typography>
                <Typography>{translatedClassification.join(" / ") || "—"}</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mt: 2 }}>
        {t("stockAnalysis.disclaimer")}
      </Alert>
    </Box>
  );
}
