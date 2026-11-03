import React from "react";
import { Box, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { FutuObservations, MetricResult } from "../services/types/dto/analysis";
import { readableReason } from "./AnalysisEvidencePanels";
import { formatHongKongDateTime } from "../utils/hongKongTime";

const namespace = "analysisReport.futu";
const number = (value?: number | null) => value == null || !Number.isFinite(value)
  ? "—" : value.toLocaleString(undefined, { maximumSignificantDigits: 12 });
const multiple = (value?: number | null) => value == null || !Number.isFinite(value) ? "—" : `${number(value)}×`;
const date = (value?: string | null) => value ? <time dateTime={value}>{value}</time> : "—";

function ObservationPanel<T>({ kind, result, columns, renderRow }: {
  kind: "valuation" | "earnings";
  result: MetricResult<T[]>;
  columns: string[];
  renderRow: (row: T) => { key: string; cells: React.ReactNode[] };
}) {
  const { t } = useTranslation();
  const title = t(`${namespace}.${kind}.title`);
  const renderTable = (rows: T[], label: string) => <Box sx={{ overflowX: "auto" }}>
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
      {result.status === "AVAILABLE" && !!result.value?.length && renderTable(result.value, title)}
      {!!result.lastKnown?.length && <>
        <Typography variant="subtitle2" color="text.secondary">{t(`${namespace}.lastKnown`)}</Typography>
        {renderTable(result.lastKnown, `${title} · ${t(`${namespace}.lastKnown`)}`)}
      </>}
    </Stack>
  </Paper>;
}

export function FutuObservationPanels({ observations }: { observations: FutuObservations }) {
  const { t, i18n } = useTranslation();
  const code = (group: string, value?: string | null) => value
    ? t(`${namespace}.${group}.${value}`, { defaultValue: value }) : "—";
  const status = (value: string) => t(`analysisReport.states.${value}`, { defaultValue: value });
  const observedAt = (value?: string | null) => value
    ? <time dateTime={value}>{formatHongKongDateTime(value, i18n.resolvedLanguage ?? i18n.language)}</time> : "—";

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
