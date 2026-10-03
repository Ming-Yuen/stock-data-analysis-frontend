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

interface StockAnalysisPageProps {
  stock: WatchItem;
  onClose: () => void;
}

const formatNumber = (value?: number | null, digits = 2) =>
  value == null || !Number.isFinite(value) ? "—" : value.toFixed(digits);

const formatDateTime = (value?: string) => {
  if (!value) return "暂无";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
};

export function StockAnalysisPage({ stock, onClose }: StockAnalysisPageProps) {
  const analysis = useMemo(() => {
    const price = Number(stock.closePrice);
    const pe = Number(stock.pe);
    const peg = Number(stock.peg);
    const rsi = Number(stock.rsi);
    const cashPerShare = Number(stock.cashPerShare);
    const hasValuationData = price > 0 && pe > 0;
    const eps = hasValuationData ? price / pe : null;
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

    let valuation = "资料不足";
    let color: "success" | "warning" | "error" | "default" = "default";
    if (buyHigh != null && fairValueHigh != null) {
      if (price <= buyHigh) {
        valuation = "进入关注买入区间";
        color = "success";
      } else if (price <= fairValueHigh) {
        valuation = "合理估值区间";
        color = "warning";
      } else {
        valuation = "估值偏高";
        color = "error";
      }
    }

    const momentum = !Number.isFinite(rsi)
      ? "资料不足"
      : rsi < 30
        ? "超卖，留意反弹与基本面风险"
        : rsi > 70
          ? "超买，短线追价风险较高"
          : "动量中性";

    return { eps, targetPeLow, targetPeHigh, earningsValueLow, earningsValueHigh, fairValueLow, fairValueHigh, buyLow, buyHigh, valuation, color, momentum, pegLooksInvalid };
  }, [stock]);

  return (
    <Box sx={{ width: "100%" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {stock.symbol} 股票分析
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {stock.industry || "—"} · {stock.category || "—"} · 行情日期 {stock.quoteDate || "—"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            财报日期 {stock.fundamentalDate || "暂无"} · 财报数据更新时间 {formatDateTime(stock.fundamentalUpdatedAt)}
          </Typography>
        </Box>
        <Button startIcon={<ArrowBack />} variant="outlined" onClick={onClose}>
          返回观察列表
        </Button>
      </Stack>

      <Grid container spacing={2}>
        {[
          ["收盘价", formatNumber(stock.closePrice)],
          ["PE", formatNumber(stock.pe)],
          ["PEG", formatNumber(stock.peg)],
          ["RSI", formatNumber(stock.rsi)],
          ["每股现金", formatNumber(stock.cashPerShare)],
          ["推算 EPS", formatNumber(analysis.eps)],
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
              <Typography variant="h6" sx={{ fontWeight: 700 }}>估值与关注区间</Typography>
              <Chip label={analysis.valuation} color={analysis.color} size="small" />
            </Stack>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" color="text.secondary">关注买入区间（含安全边际）</Typography>
                <Typography variant="h4" color="success.main" sx={{ fontWeight: 800, mt: 0.5 }}>
                  {analysis.buyLow == null ? "资料不足" : `${formatNumber(analysis.buyLow)} – ${formatNumber(analysis.buyHigh)}`}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" color="text.secondary">现金调整后的合理价值情景</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
                  {analysis.fairValueLow == null ? "资料不足" : `${formatNumber(analysis.fairValueLow)} – ${formatNumber(analysis.fairValueHigh)}`}
                </Typography>
              </Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary">
              计算：收盘价 ÷ PE 得出推算 EPS，采用 {analysis.targetPeLow}–{analysis.targetPeHigh} 倍目标 PE，
              再加每股现金 {formatNumber(stock.cashPerShare)}。关注区间以合理价值下沿加入 20% 安全边际。
              因缺少每股负债，现金部分只是情景假设，并不等同净现金。
            </Typography>
            {analysis.pegLooksInvalid && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                PEG 数据与 PE 相同或无效，本次估值没有使用 PEG 调高目标倍数，请检查后端字段映射。
              </Alert>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>辅助判断</Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary">RSI 动量</Typography>
                <Typography>{analysis.momentum}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">现金缓冲</Typography>
                <Typography>
                  每股现金 {formatNumber(stock.cashPerShare)}，约占当前股价 {stock.closePrice > 0 && stock.cashPerShare != null ? `${formatNumber(stock.cashPerShare / stock.closePrice * 100, 1)}%` : "—"}。
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">分类</Typography>
                <Typography>{[stock.industry, stock.category, stock.subCategory].filter(Boolean).join(" / ") || "—"}</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mt: 2 }}>
        此区间是基于现有快照数据的规则模型，不是实时行情或投资建议。实际决策还应结合盈利增长、负债、现金流、行业周期和最新公告。
      </Alert>
    </Box>
  );
}
