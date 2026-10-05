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

export function StockAnalysisPage({ stock, onClose }: StockAnalysisPageProps) {
  const { t } = useTranslation();
  const analysis = useMemo(() => {
    const price = Number(stock.closePrice);
    const pe = Number(stock.pe);
    const peg = Number(stock.peg);
    const rsi = Number(stock.rsi);
    const cashPerShare = Number(stock.cashPerShare);
    const earningsPerShareTtm = stock.earningsPerShareTtm == null ? null : Number(stock.earningsPerShareTtm);
    const hasEps = earningsPerShareTtm != null && Number.isFinite(earningsPerShareTtm);
    const lossMaking = hasEps && earningsPerShareTtm <= 0;
    const eps = hasEps ? earningsPerShareTtm : null;
    const usableCashPerShare = Number.isFinite(cashPerShare) && cashPerShare > 0 ? cashPerShare : 0;
    const pegLooksInvalid = !Number.isFinite(peg) || peg <= 0 || Math.abs(peg - pe) < 0.01;

    // A deliberately conservative heuristic until growth forecasts are available.
    const targetPeLow = !pegLooksInvalid && peg <= 1.5 ? 15 : 12;
    const targetPeHigh = !pegLooksInvalid && peg <= 1.5 ? 22 : 18;
    const earningsValueLow = eps == null ? null : eps * targetPeLow;
    const earningsValueHigh = eps == null ? null : eps * targetPeHigh;
    const fairValueLow = earningsValueLow == null ? null : earningsValueLow + usableCashPerShare;
    const fairValueHigh = earningsValueHigh == null ? null : earningsValueHigh + usableCashPerShare;
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

    const momentum = !Number.isFinite(rsi)
      ? t("stockAnalysis.value.insufficientData")
      : rsi < 30
        ? t("stockAnalysis.momentum.oversold")
        : rsi > 70
          ? t("stockAnalysis.momentum.overbought")
          : t("stockAnalysis.momentum.neutral");

    return { eps, targetPeLow, targetPeHigh, earningsValueLow, earningsValueHigh, fairValueLow, fairValueHigh, buyLow, buyHigh, valuation, color, momentum, pegLooksInvalid, lossMaking };
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
            {reportPeriod} · {t("stockAnalysisDates.secFilingDate")} {stock.latestFilingDate || unavailable} · {t("stockAnalysisDates.snapshotAsOfDate")} {stock.fundamentalAsOfDate || unavailable}
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

      <Grid container spacing={2}>
        {[
          [t("stockAnalysis.metrics.closePrice"), formatNumber(stock.closePrice)],
          ["PE", analysis.lossMaking ? t("stockAnalysisValue.lossMaking") : formatNumber(stock.pe)],
          ["PEG", analysis.lossMaking ? t("stockAnalysisValue.lossMaking") : formatNumber(stock.peg)],
          ["RSI", formatNumber(stock.rsi)],
          [t("stockAnalysis.metrics.cashPerShare"), formatNumber(stock.cashPerShare)],
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
                    cash: formatNumber(stock.cashPerShare),
                  })}
            </Typography>
            {!analysis.lossMaking && analysis.pegLooksInvalid && (
              <Alert severity="warning" sx={{ mt: 2 }}>
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
                <Typography>{analysis.momentum}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">{t("stockAnalysis.cashBuffer")}</Typography>
                <Typography>
                  {t("stockAnalysis.cashBufferDescription", {
                    cash: formatNumber(stock.cashPerShare),
                    percentage: stock.closePrice > 0 && stock.cashPerShare != null ? `${formatNumber(stock.cashPerShare / stock.closePrice * 100, 1)}%` : "—",
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
