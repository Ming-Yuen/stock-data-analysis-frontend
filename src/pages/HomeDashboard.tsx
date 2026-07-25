import React from "react";
import { Box, Paper, Typography, Stack, Divider, Chip } from "@mui/material";
import Grid from "@mui/material/Grid";
import { WarningAmber, EventNote, ShowChart, North, South, InfoOutlined, Schedule, Language, Timeline, BarChart } from "@mui/icons-material";
import MetricCard from "../components/MetricCard";

const snapshotMeta = {
  updateTime: "2026-07-10 21:45 HKT",
  marketDate: "2026-07-10",
  sources: ["CNN Fear & Greed", "Cboe VIX", "Cboe Put/Call", "内部快照接口"],
};

const tapeRows = [
  { symbol: "SPY", value: "625.32", change: "+0.84%", positive: true },
  { symbol: "QQQ", value: "556.80", change: "+1.12%", positive: true },
  { symbol: "SOXX", value: "274.15", change: "+1.46%", positive: true },
  { symbol: "VIX", value: "16.13", change: "-0.42", positive: false },
  { symbol: "DXY", value: "104.22", change: "-0.18%", positive: false },
  { symbol: "美债10Y", value: "4.31%", change: "+0.03%", positive: true },
];

const indexRows = [
  { name: "标普500", symbol: "SPX", value: "6,280", day: "+0.71%", trend: "up", note: "大盘风险偏好稳定" },
  { name: "纳指100", symbol: "NDX", value: "22,940", day: "+1.08%", trend: "up", note: "科技成长继续领涨" },
  { name: "费半指数", symbol: "SOX", value: "5,980", day: "+1.42%", trend: "up", note: "半导体仍是强势主线" },
  { name: "罗素2000", symbol: "RUT", value: "2,155", day: "-0.26%", trend: "down", note: "小盘股相对偏弱" },
];

const etfRows = [
  { ticker: "SOXX", price: "274.15", day: "+1.46%", rsi: "69", bias: "偏强", ma20Deviation: "+3.8%", volumeRatio5d: "1.34x", note: "涨幅偏热，但量能同步放大", source: "内部监控", time: "07-10 收盘" },
  { ticker: "VOO", price: "574.66", day: "+0.79%", rsi: "62", bias: "上升趋势", ma20Deviation: "+1.2%", volumeRatio5d: "1.08x", note: "趋势健康，暂未明显过热", source: "内部监控", time: "07-10 收盘" },
  { ticker: "QQQ", price: "556.80", day: "+1.12%", rsi: "67", bias: "动能较强", ma20Deviation: "+2.9%", volumeRatio5d: "1.26x", note: "科技动能仍强，资金有配合", source: "内部监控", time: "07-10 收盘" },
  { ticker: "SPY", price: "625.32", day: "+0.84%", rsi: "63", bias: "稳定", ma20Deviation: "+1.5%", volumeRatio5d: "1.18x", note: "大盘偏强，但还不算极端", source: "内部监控", time: "07-10 收盘" },
  { ticker: "URA", price: "33.18", day: "-0.41%", rsi: "55", bias: "分化", ma20Deviation: "-0.8%", volumeRatio5d: "0.94x", note: "量价都偏弱，仍需观察轮动", source: "内部监控", time: "07-10 收盘" },
];

const alerts = [
  "规则1：当贪婪恐慌指数 > 70 且 VIX < 15 时，风险资产进入偏热监控区。",
  "规则2：当 RSI > 68 且距20日均线偏离度 > +3% 时，代表短线可能过热。",
  "规则3：当上涨同时量比 > 1.2 时，说明资金参与度较高，走势可信度更强。",
  "规则4：当偏离度很高但量比 < 1.0 时，要警惕虚涨、衰竭或追高风险。",
];

const events = [
  { name: "美国 CPI", time: "2026-07-15 20:30 HKT", level: "高" },
  { name: "期权到期日", time: "2026-07-17", level: "中" },
  { name: "FOMC 议息", time: "2026-07-29 02:00 HKT", level: "高" },
  { name: "科技巨头财报", time: "即将公布", level: "高" },
];

const signalRows = [
  { name: "贪婪恐慌指数", value: "72", status: "偏贪婪", source: "CNN" },
  { name: "VIX", value: "16.13", status: "低波动", source: "Cboe" },
  { name: "Put / Call", value: "1.03", status: "中性", source: "Cboe" },
  { name: "市场广度", value: "58%", status: "偏正面", source: "内部计算" },
  { name: "SOXX RSI", value: "69", status: "偏热", source: "内部计算" },
  { name: "SPY 距20日均线", value: "+1.5%", status: "轻度偏热", source: "内部计算" },
];

const fearGreedComponents = [
  { name: "市场动能", value: "偏强", desc: "标普500相对125日均线仍维持正向。" },
  { name: "股价强度", value: "偏强", desc: "52周新高数量仍高于新低数量。" },
  { name: "股价广度", value: "中性偏强", desc: "上涨成交量仍优于下跌成交量，但未极端扩张。" },
  { name: "Put/Call 期权比", value: "中性", desc: "比率约 1.03，尚未明显进入极端防御。" },
  { name: "市场波动率", value: "偏贪婪", desc: "VIX维持相对低位，市场对短期波动定价不高。" },
  { name: "避险需求", value: "偏贪婪", desc: "债券相对股票吸引力下降，风险偏好回升。" },
  { name: "垃圾债需求", value: "偏贪婪", desc: "信用利差未明显恶化，市场仍愿意承担风险。" },
];

const getEventColor = (level: string): "error" | "warning" | "default" => {
  if (level === "高") return "error";
  if (level === "中") return "warning";
  return "default";
};

const getTrendColor = (trend: string) => trend === "up" ? "success.main" : trend === "down" ? "error.main" : "text.secondary";
const getDeviationColor = (value: string) => value.startsWith("+") ? "success.main" : value.startsWith("-") ? "error.main" : "text.secondary";

const getVolumeRatioColor = (value: string) => {
  const numeric = parseFloat(value.replace("x", ""));
  if (numeric > 1.2) return "success.main";
  if (numeric < 1.0) return "error.main";
  return "text.primary";
};

const HomeDashboard: React.FC = () => {
  return (
    <Stack spacing={2}>
      <Paper elevation={0} sx={{ px: 2, py: 1.25, borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider" }}>
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
            {snapshotMeta.sources.map((source) => <Chip key={source} label={source} size="small" variant="outlined" />)}
          </Box>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ px: 2, py: 1.25, borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider", overflowX: "auto" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 3, minWidth: 900 }}>
          {tapeRows.map((item) => (
            <Box key={item.symbol} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.secondary" }}>{item.symbol}</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: "text.primary" }}>{item.value}</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: item.positive ? "success.main" : "error.main" }}>{item.change}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 9 }}>
          <Stack spacing={2}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, flexWrap: "wrap" }}>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.6 }}>市场状态</Typography>
                  <Typography sx={{ fontSize: 30, lineHeight: 1.2, fontWeight: 800, color: "text.primary", mt: 0.5 }}>当前偏风险偏好，但已进入后段偏贪婪区</Typography>
                  <Typography sx={{ fontSize: 14, color: "text.secondary", mt: 1, maxWidth: 780 }}>
                    目前美股大盘与半导体动能仍在，但波动率偏低、情绪偏热。若价格继续远离20日均线，同时量比放大，则说明趋势强；若偏离度升高但量能不足，则要警惕追高风险。
                  </Typography>
                </Box>
                <Chip label="实时监控首页" size="small" variant="outlined" />
              </Box>
            </Paper>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}><MetricCard title="贪婪恐慌指数" value="72" status="偏贪婪" trend="up" change="+6 较前值" subtitle="来源：CNN" /></Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}><MetricCard title="VIX" value="16.13" status="低波动" trend="down" change="-0.42 日变动" subtitle="来源：Cboe" /></Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}><MetricCard title="Put / Call" value="1.03" status="中性" trend="neutral" change="总 Put/Call 比率" subtitle="来源：Cboe" /></Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}><MetricCard title="市场广度" value="58%" status="偏正面" trend="up" change="上涨家数占优" subtitle="来源：内部计算" /></Grid>
            </Grid>

            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider" }}>
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
                          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>{item.name}（{item.symbol}）</Typography>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: getTrendColor(item.trend) }}>{item.day}</Typography>
                        </Box>
                        <Typography sx={{ fontSize: 22, fontWeight: 800, color: "text.primary" }}>{item.value}</Typography>
                        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{item.note}</Typography>
                      </Stack>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>

            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                <InfoOutlined fontSize="small" />
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: "text.primary" }}>贪婪恐慌七因子</Typography>
              </Box>
              <Grid container spacing={1.2}>
                {fearGreedComponents.map((item) => (
                  <Grid key={item.name} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "background.default", border: 1, borderColor: "divider", height: "100%" }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary", mb: 0.6 }}>{item.name}</Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.secondary", mb: 0.6 }}>当前判断：{item.value}</Typography>
                      <Typography sx={{ fontSize: 12, lineHeight: 1.55, color: "text.secondary" }}>{item.desc}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>

            <Paper elevation={0} sx={{ borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider", overflow: "hidden" }}>
              <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <ShowChart fontSize="small" />
                  <Typography sx={{ fontSize: 16, fontWeight: 700, color: "text.primary" }}>ETF 观察列表</Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>新增均线偏离与量能确认</Typography>
              </Box>

              <Box sx={{ overflowX: "auto" }}>
                <Box sx={{ minWidth: 1360 }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: "90px 100px 100px 80px 140px 120px 120px 180px 110px 100px", px: 2, py: 1.2, bgcolor: "action.hover", color: "text.secondary", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>
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
                      <Box sx={{ display: "grid", gridTemplateColumns: "90px 100px 100px 80px 140px 120px 120px 180px 110px 100px", px: 2, py: 1.5, alignItems: "center", fontSize: 14 }}>
                        <Box sx={{ fontWeight: 800, color: "text.primary" }}>{row.ticker}</Box>
                        <Box sx={{ color: "text.primary", fontWeight: 600 }}>{row.price}</Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: row.day.startsWith("-") ? "error.main" : "success.main", fontWeight: 700 }}>
                          {row.day.startsWith("-") ? <South sx={{ fontSize: 15 }} /> : <North sx={{ fontSize: 15 }} />}
                          {row.day}
                        </Box>
                        <Box sx={{ color: "text.primary", fontWeight: 600 }}>{row.rsi}</Box>
                        <Box><Chip label={row.bias} size="small" variant="outlined" /></Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: getDeviationColor(row.ma20Deviation), fontWeight: 700 }}>
                          <Timeline sx={{ fontSize: 15 }} />
                          {row.ma20Deviation}
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: getVolumeRatioColor(row.volumeRatio5d), fontWeight: 700 }}>
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

            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider" }}>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: "text.primary", mb: 1.5 }}>量价判断规则</Typography>
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

            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider" }}>
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
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider" }}>
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

            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                <EventNote fontSize="small" />
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: "text.primary" }}>即将发生</Typography>
              </Box>
              <Stack spacing={1.2}>
                {events.map((item) => (
                  <Box key={`${item.name}-${item.time}`} sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1, p: 1.2, borderRadius: 1.5, bgcolor: "background.default", border: 1, borderColor: "divider" }}>
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}>{item.name}</Typography>
                      <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.3 }}>{item.time}</Typography>
                    </Box>
                    <Chip label={item.level} size="small" color={getEventColor(item.level)} variant="outlined" />
                  </Box>
                ))}
              </Stack>
            </Paper>

            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider" }}>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: "text.primary", mb: 1 }}>执行倾向</Typography>
              <Typography sx={{ fontSize: 14, lineHeight: 1.6, color: "text.secondary" }}>
                当前仍可维持偏多思路，但若出现“贪婪升温 + VIX低位 + RSI过热 + 偏离20日均线过大”同时成立，应优先收紧高 beta 部位，而不是继续追价。
              </Typography>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default HomeDashboard;