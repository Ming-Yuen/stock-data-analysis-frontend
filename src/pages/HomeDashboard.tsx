import React from "react";
import { Box, Paper, Typography, Stack, Divider, Chip } from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  WarningAmber,
  EventNote,
  ShowChart,
  North,
  South,
  InfoOutlined,
  Schedule,
  Language,
  Timeline,
  BarChart,
} from "@mui/icons-material";
import MetricCard from "../components/MetricCard";
import { useFetch } from "../hooks/api/useApi";
import { DashboardResponse } from "../types/overview";
import { apiConfig } from "../apiConfig";
import { useTranslation } from "react-i18next";

const getEventColor = (level: string): "error" | "warning" | "default" => {
  if (level === "HIGH") return "error";
  if (level === "MEDIUM") return "warning";
  return "default";
};

const getTrendColor = (trend: string) =>
  trend === "up" ? "success.main" : trend === "down" ? "error.main" : "text.secondary";

const getDeviationColor = (value: string) =>
  value.startsWith("+") ? "success.main" : value.startsWith("-") ? "error.main" : "text.secondary";

const getVolumeRatioColor = (value: string) => {
  const numeric = parseFloat(value.replace("x", ""));
  if (numeric > 1.2) return "success.main";
  if (numeric < 1.0) return "error.main";
  return "text.primary";
};

const HomeDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading, isError, error } = useFetch<DashboardResponse>(apiConfig.overview_dashboard, {});

  if (isLoading) {
    return (
      <Paper
        elevation={0}
        sx={{ p: 3, borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider" }}
      >
        <Typography sx={{ fontSize: 14, color: "text.secondary" }}>{t("dashboard.loading")}</Typography>
      </Paper>
    );
  }

  if (isError || !data) {
    return (
      <Paper
        elevation={0}
        sx={{ p: 3, borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider" }}
      >
        <Typography sx={{ fontSize: 14, color: "error.main" }}>
          {t("dashboard.loadError")}{error instanceof Error ? `: ${error.message}` : ""}
        </Typography>
      </Paper>
    );
  }

  const {
    snapshotMeta,
    tapeRows,
    indexRows,
    etfRows,
    alerts,
    events,
    signalRows,
    fearGreedComponents,
    marketSummary,
    executionBias,
  } = data;

  const fearGreedSignal = signalRows.find((item) => item.code === "FEAR_GREED");
  const vixSignal = signalRows.find((item) => item.code === "VIX");
  const putCallSignal = signalRows.find((item) => item.code === "PUT_CALL");
  const breadthSignal = signalRows.find((item) => item.code === "MARKET_BREADTH");
  const translateMessage = (message: { code: string; params: Record<string, string | number> }) =>
    t(`dashboard.messages.${message.code}`, message.params);

  return (
    <Stack spacing={2}>
      <Paper
        elevation={0}
        sx={{ px: 2, py: 1.25, borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider" }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} justifyContent="space-between">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Schedule sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
              {t("dashboard.updatedAt")}：{snapshotMeta.updateTime} ／ {t("dashboard.marketDate")}：{snapshotMeta.marketDate}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Language sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>{t("dashboard.dataSource")}：</Typography>
            {snapshotMeta.sources.map((source) => (
              <Chip key={source} label={t(`dashboard.source.${source}`)} size="small" variant="outlined" />
            ))}
          </Box>
        </Stack>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          px: 2,
          py: 1.25,
          borderRadius: 2,
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          overflowX: "auto",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 3, minWidth: 900 }}>
          {tapeRows.map((item) => (
            <Box key={item.symbol} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.secondary" }}>{item.symbol}</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: "text.primary" }}>{item.value}</Typography>
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: item.positive ? "success.main" : "error.main",
                }}
              >
                {item.change}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 9 }}>
          <Stack spacing={2}>
            <Paper
              elevation={0}
              sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider" }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 2,
                  flexWrap: "wrap",
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "text.secondary",
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                    }}
                  >
                    {t("dashboard.section.marketStatus")}
                  </Typography>
                  <Typography sx={{ fontSize: 30, lineHeight: 1.2, fontWeight: 800, color: "text.primary", mt: 0.5 }}>
                    {t(`dashboard.marketSummary.${marketSummary.titleCode}`)}
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: "text.secondary", mt: 1, maxWidth: 780 }}>
                    {translateMessage(marketSummary.description)}
                  </Typography>
                </Box>
                <Chip label={translateMessage(marketSummary.tag)} size="small" variant="outlined" />
              </Box>
            </Paper>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <MetricCard
                  title={t("dashboard.signal.FEAR_GREED")}
                  value={fearGreedSignal?.value ?? "--"}
                  status={fearGreedSignal ? t(`dashboard.sentiment.${fearGreedSignal.statusCode}`) : "--"}
                  trend="up"
                  change=""
                  subtitle={`${t("dashboard.sourceLabel")}：${fearGreedSignal ? t(`dashboard.source.${fearGreedSignal.sourceCode}`) : "--"}`}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <MetricCard
                  title={t("dashboard.signal.VIX")}
                  value={vixSignal?.value ?? "--"}
                  status={vixSignal ? t(`dashboard.sentiment.${vixSignal.statusCode}`) : "--"}
                  trend="down"
                  change=""
                  subtitle={`${t("dashboard.sourceLabel")}：${vixSignal ? t(`dashboard.source.${vixSignal.sourceCode}`) : "--"}`}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <MetricCard
                  title={t("dashboard.signal.PUT_CALL")}
                  value={putCallSignal?.value ?? "--"}
                  status={putCallSignal ? t(`dashboard.sentiment.${putCallSignal.statusCode}`) : "--"}
                  trend="neutral"
                  change=""
                  subtitle={`${t("dashboard.sourceLabel")}：${putCallSignal ? t(`dashboard.source.${putCallSignal.sourceCode}`) : "--"}`}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <MetricCard
                  title={t("dashboard.signal.MARKET_BREADTH")}
                  value={breadthSignal?.value ?? "--"}
                  status={breadthSignal ? t(`dashboard.sentiment.${breadthSignal.statusCode}`) : "--"}
                  trend="up"
                  change=""
                  subtitle={`${t("dashboard.sourceLabel")}：${breadthSignal ? t(`dashboard.source.${breadthSignal.sourceCode}`) : "--"}`}
                />
              </Grid>
            </Grid>

            <Paper
              elevation={0}
              sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider" }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                <ShowChart fontSize="small" />
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: "text.primary" }}>{t("dashboard.section.indexObservation")}</Typography>
              </Box>
              <Grid container spacing={1.2}>
                {indexRows.map((item) => (
                  <Grid key={item.symbol} size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "background.default", border: 1, borderColor: "divider" }}>
                      <Stack spacing={0.6}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                            {t(`dashboard.index.${item.nameCode}`)}（{item.symbol}）
                          </Typography>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: getTrendColor(item.trend) }}>
                            {item.day}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: 22, fontWeight: 800, color: "text.primary" }}>{item.value}</Typography>
                        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{t(`dashboard.indexNote.${item.noteCode}`)}</Typography>
                      </Stack>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>

            <Paper
              elevation={0}
              sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider" }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                <InfoOutlined fontSize="small" />
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: "text.primary" }}>{t("dashboard.section.fearGreedFactors")}</Typography>
              </Box>
              <Grid container spacing={1.2}>
                {fearGreedComponents.map((item) => (
                  <Grid key={item.code} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: "background.default",
                        border: 1,
                        borderColor: "divider",
                        height: "100%",
                      }}
                    >
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary", mb: 0.6 }}>
                        {t(`dashboard.factor.${item.code}`)}
                      </Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.secondary", mb: 0.6 }}>
                        {t("dashboard.currentAssessment")}：{t(`dashboard.sentiment.${item.statusCode}`)}
                      </Typography>
                      <Typography sx={{ fontSize: 12, lineHeight: 1.55, color: "text.secondary" }}>
                        {t("dashboard.indexValue", { value: item.value ?? "--" })}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>

            <Paper
              elevation={0}
              sx={{ borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider", overflow: "hidden" }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: 1,
                  borderColor: "divider",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <ShowChart fontSize="small" />
                  <Typography sx={{ fontSize: 16, fontWeight: 700, color: "text.primary" }}>{t("dashboard.section.etfObservation")}</Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{t("dashboard.etfSubtitle")}</Typography>
              </Box>

              <Box sx={{ overflowX: "auto" }}>
                <Box sx={{ minWidth: 1360 }}>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "90px 100px 100px 80px 140px 120px 120px 180px 110px 100px",
                      px: 2,
                      py: 1.2,
                      bgcolor: "action.hover",
                      color: "text.secondary",
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                    }}
                  >
                    <Box>{t("dashboard.table.symbol")}</Box>
                    <Box>{t("dashboard.table.price")}</Box>
                    <Box>{t("dashboard.table.dailyChange")}</Box>
                    <Box>RSI</Box>
                    <Box>{t("dashboard.table.assessment")}</Box>
                    <Box>{t("dashboard.table.ma20Distance")}</Box>
                    <Box>{t("dashboard.table.volumeRatio5d")}</Box>
                    <Box>{t("dashboard.table.note")}</Box>
                    <Box>{t("dashboard.table.source")}</Box>
                    <Box>{t("dashboard.table.time")}</Box>
                  </Box>
                  <Divider />
                  {etfRows.map((row) => (
                    <React.Fragment key={row.ticker}>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "90px 100px 100px 80px 140px 120px 120px 180px 110px 100px",
                          px: 2,
                          py: 1.5,
                          alignItems: "center",
                          fontSize: 14,
                        }}
                      >
                        <Box sx={{ fontWeight: 800, color: "text.primary" }}>{row.ticker}</Box>
                        <Box sx={{ color: "text.primary", fontWeight: 600 }}>{row.price}</Box>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            color: row.day.startsWith("-") ? "error.main" : "success.main",
                            fontWeight: 700,
                          }}
                        >
                          {row.day.startsWith("-") ? <South sx={{ fontSize: 15 }} /> : <North sx={{ fontSize: 15 }} />}
                          {row.day}
                        </Box>
                        <Box sx={{ color: "text.primary", fontWeight: 600 }}>{row.rsi}</Box>
                        <Box>
                          <Chip label={t(`dashboard.bias.${row.biasCode}`)} size="small" variant="outlined" />
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            color: getDeviationColor(row.ma20Deviation),
                            fontWeight: 700,
                          }}
                        >
                          <Timeline sx={{ fontSize: 15 }} />
                          {row.ma20Deviation}
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            color: getVolumeRatioColor(row.volumeRatio5d),
                            fontWeight: 700,
                          }}
                        >
                          <BarChart sx={{ fontSize: 15 }} />
                          {row.volumeRatio5d}
                        </Box>
                        <Box sx={{ color: "text.secondary" }}>{t(`dashboard.etfNote.${row.noteCode}`)}</Box>
                        <Box sx={{ color: "text.secondary" }}>{t(`dashboard.source.${row.sourceCode}`)}</Box>
                        <Box sx={{ color: "text.secondary" }}>{row.time}</Box>
                      </Box>
                      <Divider />
                    </React.Fragment>
                  ))}
                </Box>
              </Box>
            </Paper>

            <Paper
              elevation={0}
              sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider" }}
            >
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: "text.primary", mb: 1.5 }}>
                {t("dashboard.section.priceVolumeRules")}
              </Typography>
              <Grid container spacing={1.2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "background.default", border: 1, borderColor: "divider", height: "100%" }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary", mb: 0.8 }}>{t("dashboard.rules.maTitle")}</Typography>
                    <Typography sx={{ fontSize: 12, lineHeight: 1.55, color: "text.secondary" }}>
                      {t("dashboard.rules.maDescription")}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "background.default", border: 1, borderColor: "divider", height: "100%" }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary", mb: 0.8 }}>{t("dashboard.rules.volumeTitle")}</Typography>
                    <Typography sx={{ fontSize: 12, lineHeight: 1.55, color: "text.secondary" }}>
                      {t("dashboard.rules.volumeDescription")}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "background.default", border: 1, borderColor: "divider", height: "100%" }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary", mb: 0.8 }}>{t("dashboard.rules.combinationTitle")}</Typography>
                    <Typography sx={{ fontSize: 12, lineHeight: 1.55, color: "text.secondary" }}>
                      {t("dashboard.rules.combinationDescription")}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            <Paper
              elevation={0}
              sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider" }}
            >
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: "text.primary", mb: 1.5 }}>{t("dashboard.section.signalMatrix")}</Typography>
              <Grid container spacing={1.2}>
                {signalRows.map((item) => (
                  <Grid key={item.code} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "background.default", border: 1, borderColor: "divider" }}>
                      <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 0.4 }}>{t(`dashboard.signal.${item.code}`)}</Typography>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                        <Typography sx={{ fontSize: 20, fontWeight: 800, color: "text.primary" }}>{item.value}</Typography>
                        <Chip label={t(`dashboard.sentiment.${item.statusCode}`)} size="small" variant="outlined" />
                      </Box>
                      <Typography sx={{ fontSize: 11, color: "text.secondary", mt: 0.8 }}>
                        {t("dashboard.sourceLabel")}：{t(`dashboard.source.${item.sourceCode}`)}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 3 }}>
          <Stack spacing={2}>
            <Paper
              elevation={0}
              sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider" }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                <WarningAmber fontSize="small" />
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: "text.primary" }}>{t("dashboard.section.riskAlerts")}</Typography>
              </Box>
              <Stack spacing={1.2}>
                {alerts.map((item, index) => (
                  <Box key={index} sx={{ p: 1.25, borderRadius: 1.5, bgcolor: "background.default", border: 1, borderColor: "divider" }}>
                    <Typography sx={{ fontSize: 13, lineHeight: 1.45, color: "text.primary" }}>{translateMessage(item)}</Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>

            <Paper
              elevation={0}
              sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider" }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                <EventNote fontSize="small" />
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: "text.primary" }}>{t("dashboard.section.upcoming")}</Typography>
              </Box>
              <Stack spacing={1.2}>
                {events.map((item) => (
                  <Box
                    key={`${item.nameCode}-${item.time}`}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 1,
                      p: 1.2,
                      borderRadius: 1.5,
                      bgcolor: "background.default",
                      border: 1,
                      borderColor: "divider",
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}>{t(`dashboard.event.${item.nameCode}`)}</Typography>
                      <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.3 }}>{item.time}</Typography>
                    </Box>
                    <Chip label={t(`dashboard.eventLevel.${item.levelCode}`)} size="small" color={getEventColor(item.levelCode)} variant="outlined" />
                  </Box>
                ))}
              </Stack>
            </Paper>

            <Paper
              elevation={0}
              sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider" }}
            >
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: "text.primary", mb: 1 }}>
                {t(`dashboard.execution.${executionBias.titleCode}`)}
              </Typography>
              <Typography sx={{ fontSize: 14, lineHeight: 1.6, color: "text.secondary" }}>
                {t(`dashboard.execution.${executionBias.descriptionCode}`)}
              </Typography>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default HomeDashboard;
