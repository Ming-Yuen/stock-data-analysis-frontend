import React from "react";
import { Box, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { FutuMorningstarObservation, FutuObservations, FutuValuationDetail, MetricResult } from "../services/types/dto/analysis";
import { readableReason } from "./AnalysisEvidencePanels";
import { formatHongKongDateTime } from "../utils/hongKongTime";

const namespace = "analysisReport.futu";
const number = (value?: number | null) => value == null || !Number.isFinite(value)
  ? "—" : value.toLocaleString(undefined, { maximumSignificantDigits: 12 });
const multiple = (value?: number | null) => value == null || !Number.isFinite(value) ? "—" : `${number(value)}×`;
const percent = (value?: number | null) => value == null || !Number.isFinite(value) ? "—" : `${number(value)}%`;
const date = (value?: string | null) => value ? <time dateTime={value}>{value}</time> : "—";

function ObservationSection<T>({ kind, result, renderValue }: {
  kind: "valuation" | "earnings" | "valuationDetail" | "morningstar";
  result: MetricResult<T>;
  renderValue: (value: T, label: string) => React.ReactNode;
}) {
  const { t } = useTranslation();
  const title = t(`${namespace}.${kind}.title`);
  const lastKnownLabel = t(`${namespace}.lastKnown`);
  const lastKnown = result.lastKnown == null ? null : renderValue(result.lastKnown, `${title} · ${lastKnownLabel}`);
  return <Paper component="section" aria-label={title} variant="outlined" sx={{ p: 3, mt: 2 }}>
    <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
    <Stack spacing={1} sx={{ mt: 1 }}>
      <Typography variant="body2" color="text.secondary">{t(`${namespace}.${kind}.description`)}</Typography>
      <Typography variant="body2" color="text.secondary">
        {t("analysisReport.metricStatus")}: {t(`analysisReport.states.${result.status}`, { defaultValue: result.status })}
      </Typography>
      {result.reasons.map((reason, index) => <Typography key={`${reason.code}-${index}`} variant="body2" color="text.secondary">
        {readableReason(t, reason)}
      </Typography>)}
      {result.status === "AVAILABLE" && result.value != null && renderValue(result.value, title)}
      {lastKnown && <>
        <Typography variant="subtitle2" color="text.secondary">{lastKnownLabel}</Typography>
        {lastKnown}
      </>}
    </Stack>
  </Paper>;
}

function ObservationPanel<T>({ kind, result, columns, renderRow }: {
  kind: "valuation" | "earnings";
  result: MetricResult<T[]>;
  columns: string[];
  renderRow: (row: T) => { key: string; cells: React.ReactNode[] };
}) {
  const { t } = useTranslation();
  const renderTable = (rows: T[], label: string) => rows.length > 0 && <Box sx={{ overflowX: "auto" }}>
    <Table size="small" aria-label={label}>
      <TableHead><TableRow>{columns.map(column =>
        <TableCell key={column}>
          {t(`${namespace}.columns.${column}`)}
          {column === "observedAt" && ` (${t("dashboard.hongKongTime")})`}
        </TableCell>
      )}</TableRow></TableHead>
      <TableBody>{rows.map(row => {
        const { key, cells } = renderRow(row);
        return <TableRow key={key}>{cells.map((cell, index) =>
          <TableCell key={columns[index]} sx={{ whiteSpace: "nowrap" }}>{cell}</TableCell>
        )}</TableRow>;
      })}</TableBody>
    </Table>
  </Box>;

  return <ObservationSection kind={kind} result={result} renderValue={renderTable} />;
}

function ObservationFields({ fields }: { fields: Array<[string, React.ReactNode]> }) {
  const { t } = useTranslation();
  return <Box component="dl" sx={{
    display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: 2, m: 0,
  }}>
    {fields.map(([field, value]) => <Box key={field}>
      <Typography component="dt" variant="caption" color="text.secondary">
        {t(`${namespace}.columns.${field}`)}
        {(field === "observedAt" || field === "sourceUpdatedAt") && ` (${t("dashboard.hongKongTime")})`}
      </Typography>
      <Typography component="dd" variant="body2" sx={{ m: 0 }}>{value}</Typography>
    </Box>)}
  </Box>;
}

export function FutuObservationPanels({ observations }: { observations: FutuObservations }) {
  const { t, i18n } = useTranslation();
  const code = (group: string, value?: string | null) => value
    ? t(`${namespace}.${group}.${value}`, { defaultValue: value }) : "—";
  const status = (value: string) => t(`analysisReport.states.${value}`, { defaultValue: value });
  const observedAt = (value?: string | null) => value
    ? <time dateTime={value}>{formatHongKongDateTime(value, i18n.resolvedLanguage ?? i18n.language)}</time> : "—";

  const renderValuationDetail = (row: FutuValuationDetail) => <>
    <ObservationFields fields={[
      ["providerSymbol", row.providerSymbol], ["metric", code("metrics", row.metric)],
      ["value", multiple(row.currentValue)], ["forwardValue", multiple(row.forwardValue)],
      ["valuationPercentile", percent(row.valuationPercentile)], ["averageValue", multiple(row.averageValue)],
      ["avgMinus1Stddev", multiple(row.avgMinus1Stddev)], ["avgPlus1Stddev", multiple(row.avgPlus1Stddev)],
      ["historicalMonths", number(row.historicalMonths)], ["historyFrom", date(row.historyFrom)], ["historyThrough", date(row.historyThrough)],
      ["q25", multiple(row.q25)], ["median", multiple(row.median)], ["q75", multiple(row.q75)],
      ["plateName", row.plateName || "—"], ["plateAverage", multiple(row.plateAverage)],
      ["plateRank", row.plateRank == null ? "—" : t(`${namespace}.valuationDetail.plateRankValue`, {
        rank: number(row.plateRank), total: number(row.plateRankCount),
      })],
      ["sourceUpdatedAt", observedAt(row.sourceUpdatedAt)], ["observedAt", observedAt(row.observedAt)],
    ]} />
    {row.peers && row.peers.length > 0 && <Box sx={{ overflowX: "auto" }}>
      <Typography variant="subtitle2">{t(`${namespace}.valuationDetail.peers`)}</Typography>
      <Table size="small" aria-label={t(`${namespace}.valuationDetail.peers`)}>
        <TableHead><TableRow>
          <TableCell>{t(`${namespace}.columns.providerSymbol`)}</TableCell>
          <TableCell>{t(`${namespace}.columns.value`)}</TableCell>
        </TableRow></TableHead>
        <TableBody>{row.peers.map(peer => <TableRow key={peer.symbol}>
          <TableCell>{peer.symbol}</TableCell><TableCell>{multiple(peer.value)}</TableCell>
        </TableRow>)}</TableBody>
      </Table>
    </Box>}
  </>;
  const renderMorningstar = (row: FutuMorningstarObservation) => <ObservationFields fields={[
    ["providerSymbol", row.providerSymbol], ["fairValue", number(row.fairValue)],
    ["ratingType", code("ratingTypes", row.ratingType)], ["starRating", number(row.starRating)],
    ["uncertainty", code("uncertaintyLevels", row.uncertainty)],
    ["sourceUpdatedAt", observedAt(row.sourceUpdatedAt)], ["observedAt", observedAt(row.observedAt)],
  ]} />;

  return <>
    <ObservationPanel kind="valuation" result={observations.valuations}
      columns={["metric", "value", "forwardValue", "providerSymbol", "plateCode", "observedAt", "status"]}
      renderRow={row => ({
        key: `${row.plateCode}|${row.metric}|${row.observedAt}`,
        cells: [
          code("metrics", row.metric), row.status === "AVAILABLE" ? multiple(row.value) : "—",
          row.status === "AVAILABLE" ? multiple(row.forwardValue) : "—", row.providerSymbol,
          row.plateCode, observedAt(row.observedAt), status(row.status),
        ],
      })} />
    {observations.valuationDetail && <ObservationSection kind="valuationDetail" result={observations.valuationDetail}
      renderValue={renderValuationDetail} />}
    {observations.morningstar && <ObservationSection kind="morningstar" result={observations.morningstar}
      renderValue={renderMorningstar} />}
    <ObservationPanel kind="earnings" result={observations.earnings}
      columns={["metric", "expectedValue", "fiscalPeriod", "periodType", "earningsDate", "publishType", "providerSymbol", "observedAt", "status"]}
      renderRow={row => ({
        key: `${row.providerSymbol}|${row.fiscalPeriod}|${row.periodType}|${row.metric}|${row.earningsDate}`,
        cells: [
          code("metrics", row.metric),
          row.status === "AVAILABLE" && row.value != null ? [number(row.value), row.currency].filter(Boolean).join(" ") : "—",
          row.fiscalPeriod || "—", code("periodTypes", row.periodType), date(row.earningsDate), code("publishTypes", row.publishType),
          row.providerSymbol, observedAt(row.observedAt), status(row.status),
        ],
      })} />
  </>;
}
