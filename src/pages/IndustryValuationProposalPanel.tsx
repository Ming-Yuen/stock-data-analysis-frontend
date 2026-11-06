import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, CircularProgress, FormControl, Grid, InputLabel, Link, MenuItem, Paper, Select, Stack, TextField, Typography } from "@mui/material";
import { industryValuationApi } from "../services/industryValuationApi";
import { IndustryValuationDraft, IndustryValuationReview } from "../services/types/dto/industryValuation";
import { StockAnalysisReport } from "../services/types/dto/analysis";
import { formatHongKongDateTime } from "../utils/hongKongTime";
import { formatNumber, metricLabel } from "./AnalysisPanels";

interface Props {
  industryCode?: string | null;
  figi: string;
  valuationDate?: string | null;
  reloadReport: () => Promise<StockAnalysisReport | null>;
}
interface DraftForm {
  baseEffectiveAt: string | null;
  modelCode: string;
  primaryMetric: string;
  low: string;
  high: string;
  rationale: string;
  sourceUrl: string;
}
const errorMessage = (error: unknown) => {
  const value = error as { response?: { data?: { message?: string } }; message?: string };
  return value.response?.data?.message || value.message || "操作失敗。";
};
const safeUrl = (value: string) => {
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password; }
  catch { return false; }
};

export function IndustryValuationProposalPanel({ industryCode, figi, valuationDate, reloadReport }: Props) {
  const client = useQueryClient();
  const queryKey = ["industry-valuation-review", industryCode];
  const reviewQuery = useQuery<IndustryValuationReview>({
    queryKey, enabled: Boolean(industryCode),
    queryFn: () => industryValuationApi.review(industryCode!),
  });
  const review = reviewQuery.data;
  const [form, setForm] = useState<DraftForm | null>(null);
  const [draft, setDraft] = useState<IndustryValuationDraft | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const propose = async () => {
    if (!industryCode || !review?.canPropose || busy) return;
    const baseEffectiveAt = review.current?.effectiveAt ?? null;
    setBusy("PROPOSE"); setError(null); setMessage(null);
    try {
      const result = await industryValuationApi.propose(industryCode);
      setDraft(result);
      setForm({ baseEffectiveAt, modelCode: result.modelCode, primaryMetric: result.primaryMetric,
        low: result.assumedMultipleLow?.toString() ?? "", high: result.assumedMultipleHigh?.toString() ?? "",
        rationale: result.rationale ?? "", sourceUrl: result.sources[0]?.url ?? "" });
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(null); }
  };
  const edit = () => {
    if (!review) return;
    setDraft(null); setError(null); setMessage(null);
    setForm({ baseEffectiveAt: review.current?.effectiveAt ?? null, modelCode: review.current?.modelCode ?? "",
      primaryMetric: review.current?.primaryMetric ?? "", low: review.current?.assumedMultipleLow?.toString() ?? "",
      high: review.current?.assumedMultipleHigh?.toString() ?? "", rationale: review.current?.rationale ?? "", sourceUrl: review.current?.sourceUrl ?? "" });
  };
  const save = async () => {
    if (!industryCode || !review || !form || busy) return;
    const low = form.low.trim() ? Number(form.low) : null, high = form.high.trim() ? Number(form.high) : null;
    if (!review.supportedMetrics[form.modelCode]?.includes(form.primaryMetric)) {
      setError("請選擇後端支援的模型及指標。"); return;
    }
    if ((low === null) !== (high === null) || (low !== null && high !== null
      && (!Number.isFinite(low) || !Number.isFinite(high) || low <= 0 || high < low))) {
      setError("倍數上下限須同時留空，或同時填寫有效正數區間。"); return;
    }
    if (low !== null && (!form.rationale.trim() || !form.sourceUrl.trim())) {
      setError("提供倍數假設時，必須填寫假設理由及主要來源網址。"); return;
    }
    if (form.sourceUrl.trim() && !safeUrl(form.sourceUrl.trim())) { setError("來源必須是有效的 HTTP 或 HTTPS 網址。"); return; }
    setBusy("SAVE"); setError(null); setMessage(null);
    try {
      const saved = await industryValuationApi.save(industryCode, { baseEffectiveAt: form.baseEffectiveAt,
        modelCode: form.modelCode, primaryMetric: form.primaryMetric, assumedMultipleLow: low, assumedMultipleHigh: high,
        rationale: form.rationale.trim() || null, sourceUrl: form.sourceUrl.trim() || null });
      client.setQueryData(queryKey, saved);
      setForm(null); setDraft(null);
      setMessage("正式產業設定已保存；既有估值結果尚未重算。此設定適用整個產業，不只目前股票。");
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(null); }
  };
  const recalculate = async () => {
    if (!figi || !valuationDate || busy) return;
    setBusy("RECALCULATE"); setError(null); setMessage(null);
    try {
      await industryValuationApi.recalculate(figi, valuationDate);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["valuation-history", figi] }),
        client.invalidateQueries({ queryKey: ["stock-screen"] }),
      ]);
      await reloadReport();
      setMessage("此股指定估值日已完成重算並重新載入；以畫面回傳的可用指標及狀態為準。");
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(null); }
  };

  return <Paper component="section" aria-label="產業假設設定" variant="outlined" sx={{ p: 2.5, mt: 2 }}>
    <Typography variant="h6" fontWeight={700}>產業假設設定</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>AI 只產生待確認草稿，不自動保存。模型與指標選項由後端提供。</Typography>
    {!industryCode && <Typography>報告尚未提供產業代碼，暫不能設定產業假設。</Typography>}
    {reviewQuery.isLoading && industryCode && <CircularProgress size={22} />}
    {(error || reviewQuery.isError) && <Alert severity="error" sx={{ my: 1 }}>{error || errorMessage(reviewQuery.error)}</Alert>}
    {message && <Alert severity="info" sx={{ my: 1 }}>{message}</Alert>}
    {figi && valuationDate && <Button onClick={() => void recalculate()} disabled={!!busy} sx={{ my: 1 }}>重算此股估值</Button>}
    {busy && <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={18} /><Typography>{busy === "PROPOSE" ? "正在產生草稿，可能需要幾分鐘…" : "處理中…"}</Typography></Stack>}
    {review && <>
      <Typography>{review.industry} · {review.industryCode}</Typography>
      {review.current ? <Stack spacing={0.5} sx={{ my: 1 }}>
        <Typography>正式設定：{review.current.modelCode} · {metricLabel(review.current.primaryMetric)} · {formatNumber(review.current.assumedMultipleLow)}–{formatNumber(review.current.assumedMultipleHigh)} 倍</Typography>
        <Typography variant="body2">生效時間（香港）：{formatHongKongDateTime(review.current.effectiveAt, "zh-HK")}</Typography>
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{review.current.rationale}</Typography>
        {review.current.sourceUrl && safeUrl(review.current.sourceUrl) && <Link href={review.current.sourceUrl} target="_blank" rel="noopener noreferrer">正式設定來源</Link>}
      </Stack> : <Typography color="text.secondary">尚無正式設定。</Typography>}
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ my: 1 }}>
        {review.canPropose && <Button onClick={() => void propose()} variant="outlined" disabled={!!busy}>產生 AI 草稿</Button>}
        <Button onClick={edit} disabled={!!busy}>手動設定</Button>
        <Button onClick={() => void reviewQuery.refetch()} disabled={!!busy}>重新讀取設定</Button>
      </Stack>
      {form && <Box sx={{ mt: 2 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>確認保存後才會修改正式設定，影響整個產業。草稿只保留在本頁，離開頁面不會保存。</Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>可以先只保存模型及主要指標，倍數上下限同時留空；提供倍數假設時，理由及來源網址必須填寫。</Typography>
        {draft && <Typography variant="body2" sx={{ mb: 1 }}>草稿參考日：{draft.asOf}</Typography>}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}><FormControl fullWidth size="small"><InputLabel id="industry-model-label">模型</InputLabel>
            <Select labelId="industry-model-label" label="模型" value={form.modelCode} onChange={event => setForm({ ...form, modelCode: event.target.value, primaryMetric: "" })}>
              {Object.keys(review.supportedMetrics).map(code => <MenuItem key={code} value={code}>{code}</MenuItem>)}
            </Select></FormControl></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><FormControl fullWidth size="small"><InputLabel id="industry-metric-label">主要指標</InputLabel>
            <Select labelId="industry-metric-label" label="主要指標" value={form.primaryMetric} onChange={event => setForm({ ...form, primaryMetric: event.target.value })}>
              {(review.supportedMetrics[form.modelCode] ?? []).map(code => <MenuItem key={code} value={code}>{metricLabel(code)}</MenuItem>)}
            </Select></FormControl></Grid>
          <Grid size={{ xs: 6 }}><TextField fullWidth size="small" label="假設倍數下限" type="number" inputProps={{ step: "any" }} value={form.low} onChange={event => setForm({ ...form, low: event.target.value })} /></Grid>
          <Grid size={{ xs: 6 }}><TextField fullWidth size="small" label="假設倍數上限" type="number" inputProps={{ step: "any" }} value={form.high} onChange={event => setForm({ ...form, high: event.target.value })} /></Grid>
          <Grid size={{ xs: 12 }}><TextField fullWidth multiline minRows={2} label="假設理由" value={form.rationale} onChange={event => setForm({ ...form, rationale: event.target.value })} /></Grid>
          <Grid size={{ xs: 12 }}><TextField fullWidth size="small" label="正式設定來源網址" value={form.sourceUrl} onChange={event => setForm({ ...form, sourceUrl: event.target.value })} /></Grid>
        </Grid>
        {draft?.sources?.map((source, index) => <Box key={index} sx={{ my: 1 }}>
          <Typography variant="subtitle2">{source.title} {source.publishedDate ? " · " + source.publishedDate : ""}</Typography>
          {safeUrl(source.url) ? <Link href={source.url} target="_blank" rel="noopener noreferrer">{source.url}</Link> : <Typography>{source.url}</Typography>}
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{source.evidence}</Typography>
        </Box>)}
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button variant="contained" onClick={() => void save()} disabled={!!busy}>確認保存正式設定</Button>
          <Button onClick={() => { setForm(null); setDraft(null); }} disabled={!!busy}>捨棄草稿</Button>
        </Stack>
      </Box>}
    </>}
  </Paper>;
}
