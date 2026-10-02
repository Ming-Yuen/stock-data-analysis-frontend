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

const getEventColor = (level: string): "error" | "warning" | "default" => {
  if (level === "高") return "error";
  if (level === "中") return "warning";
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
  const { data, isLoading, isError, error } = useFetch<DashboardResponse>(apiConfig.overview_dashboard, {});

  if (isLoading) {
    return (
      <Paper
        elevation={0}
        sx={{ p: 3, borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider" }}
      >
        <Typography sx={{ fontSize: 14, color: "text.secondary" }}>Loading dashboard...</Typography>
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
          Failed to load dashboard{error instanceof Error ? `: ${error.message}` : ""}
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

  const fearGreedSignal = signalRows.find((item) => item.name === "贪婪恐慌指数");
  const vixSignal = signalRows.find((item) => item.name === "VIX");
  const putCallSignal = signalRows.find((item) => item.name === "Put / Call");
  const breadthSignal = signalRows.find((item) => item.name === "市场广度");

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
              更新时间：{snapshotMeta.updateTime} ／ 市场日期：{snapshotMeta.marketDate}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Language sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>数据来源：</Typography>
            {snapshotMeta.sources.map((source) => (
              <Chip key={source} label={source} size="small" variant="outlined" />
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
                    市场状态
                  </Typography>
                  <Typography sx={{ fontSize: 30, lineHeight: 1.2, fontWeight: 800, color: "text.primary", mt: 0.5 }}>
                    {marketSummary.title}
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: "text.secondary", mt: 1, maxWidth: 780 }}>
                    {marketSummary.description}
                  </Typography>
                </Box>
                <Chip label={marketSummary.tag} size="small" variant="outlined" />
              </Box>
            </Paper>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <MetricCard
                  title="贪婪恐慌指数"
                  value={fearGreedSignal?.value ?? "--"}
                  status={fearGreedSignal?.status ?? "--"}
                  trend="up"
                  change=""
                  subtitle={`来源：${fearGreedSignal?.source ?? "--"}`}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <MetricCard
                  title="VIX"
                  value={vixSignal?.value ?? "--"}
                  status={vixSignal?.status ?? "--"}
                  trend="down"
                  change=""
                  subtitle={`来源：${vixSignal?.source ?? "--"}`}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <MetricCard
                  title="Put / Call"
                  value={putCallSignal?.value ?? "--"}
                  status={putCallSignal?.status ?? "--"}
                  trend="neutral"
                  change=""
                  subtitle={`来源：${putCallSignal?.source ?? "--"}`}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <MetricCard
                  title="市场广度"
                  value={breadthSignal?.value ?? "--"}
                  status={breadthSignal?.status ?? "--"}
                  trend="up"
                  change=""
                  subtitle={`来源：${breadthSignal?.source ?? "--"}`}
                />
              </Grid>
            </Grid>

            <Paper
              elevation={0}
              sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider" }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                <ShowChart fontSize="small" />
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: "text.primary" }}>指数层观察</Typography>
              </Box>
              <Grid container spacing={1.2}>
                {indexRows.map((item) => (
                  <Grid key={item.symbol} size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "background.default", border: 1, borderColor: "divider" }}>
                      <Stack spacing={0.6}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                            {item.name}（{item.symbol}）
                          </Typography>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: getTrendColor(item.trend) }}>
                            {item.day}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: 22, fontWeight: 800, color: "text.primary" }}>{item.value}</Typography>
                        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{item.note}</Typography>
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
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: "text.primary" }}>贪婪恐慌七因子</Typography>
              </Box>
              <Grid container spacing={1.2}>
                {fearGreedComponents.map((item) => (
                  <Grid key={item.name} size={{ xs: 12, sm: 6, md: 4 }}>
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
                        {item.name}
                      </Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.secondary", mb: 0.6 }}>
                        当前判断：{item.value}
                      </Typography>
                      <Typography sx={{ fontSize: 12, lineHeight: 1.55, color: "text.secondary" }}>
                        {item.desc}
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
                  <Typography sx={{ fontSize: 16, fontWeight: 700, color: "text.primary" }}>ETF 观察列表</Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>新增均线偏离与量能确认</Typography>
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
                    <Box>代码</Box>
                    <Box>价格</Box>
                    <Box>日变动</Box>
                    <Box>RSI</Box>
                    <Box>判断</Box>
                    <Box>距20日均线</Box>
                    <Box>量比(5日)</Box>
                    <Box>备注</Box>
                    <Box>来源</Box>
                    <Box>时间</Box>
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
                          <Chip label={row.bias} size="small" variant="outlined" />
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
                        <Box sx={{ color: "text.secondary" }}>{row.note}</Box>
                        <Box sx={{ color: "text.secondary" }}>{row.source}</Box>
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
                量价判断规则
              </Typography>
              <Grid container spacing={1.2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "background.default", border: 1, borderColor: "divider", height: "100%" }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary", mb: 0.8 }}>均线偏离</Typography>
                    <Typography sx={{ fontSize: 12, lineHeight: 1.55, color: "text.secondary" }}>
                      距20日均线偏离度越高，代表价格离短中期均衡越远。若同时 RSI 偏高，通常更接近短线过热区。
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "background.default", border: 1, borderColor: "divider", height: "100%" }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary", mb: 0.8 }}>量能确认</Typography>
                    <Typography sx={{ fontSize: 12, lineHeight: 1.55, color: "text.secondary" }}>
                      量比 = 当前成交量 / 过去5日平均成交量。若大于 1.2 且价格同步上涨，说明有更明显的真实资金参与。
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "background.default", border: 1, borderColor: "divider", height: "100%" }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary", mb: 0.8 }}>组合解读</Typography>
                    <Typography sx={{ fontSize: 12, lineHeight: 1.55, color: "text.secondary" }}>
                      最强组合通常是“上涨 + 量比放大 + 偏离度上升”；最需要小心的是“偏离度高，但量比不足”的追高状态。
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            <Paper
              elevation={0}
              sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider" }}
            >
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: "text.primary", mb: 1.5 }}>信号矩阵</Typography>
              <Grid container spacing={1.2}>
                {signalRows.map((item) => (
                  <Grid key={item.name} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "background.default", border: 1, borderColor: "divider" }}>
                      <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 0.4 }}>{item.name}</Typography>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                        <Typography sx={{ fontSize: 20, fontWeight: 800, color: "text.primary" }}>{item.value}</Typography>
                        <Chip label={item.status} size="small" variant="outlined" />
                      </Box>
                      <Typography sx={{ fontSize: 11, color: "text.secondary", mt: 0.8 }}>来源：{item.source}</Typography>
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
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: "text.primary" }}>风险规则提醒</Typography>
              </Box>
              <Stack spacing={1.2}>
                {alerts.map((item, index) => (
                  <Box key={index} sx={{ p: 1.25, borderRadius: 1.5, bgcolor: "background.default", border: 1, borderColor: "divider" }}>
                    <Typography sx={{ fontSize: 13, lineHeight: 1.45, color: "text.primary" }}>{item}</Typography>
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
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: "text.primary" }}>即将发生</Typography>
              </Box>
              <Stack spacing={1.2}>
                {events.map((item) => (
                  <Box
                    key={`${item.name}-${item.time}`}
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
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}>{item.name}</Typography>
                      <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.3 }}>{item.time}</Typography>
                    </Box>
                    <Chip label={item.level} size="small" color={getEventColor(item.level)} variant="outlined" />
                  </Box>
                ))}
              </Stack>
            </Paper>

            <Paper
              elevation={0}
              sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider" }}
            >
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: "text.primary", mb: 1 }}>
                {executionBias.title}
              </Typography>
              <Typography sx={{ fontSize: 14, lineHeight: 1.6, color: "text.secondary" }}>
                {executionBias.description}
              </Typography>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default HomeDashboard;