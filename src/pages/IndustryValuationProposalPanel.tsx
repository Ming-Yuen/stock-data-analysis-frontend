import React, { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, Grid, Link, Paper, Stack, Typography } from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { industryValuationApi } from "../services/industryValuationApi";
import { IndustryValuationApproval, IndustryValuationProposal, IndustryValuationReview } from "../services/types/dto/industryValuation";
import { StockAnalysisReport } from "../services/types/dto/analysis";
import { formatHongKongDateTime } from "../utils/hongKongTime";

interface Props {
  industryCode?: string | null;
  figi: string;
  reloadReport: () => Promise<StockAnalysisReport | null>;
}
interface Recalculation {
  approval: IndustryValuationApproval;
  phase: "QUEUED" | "CONFIRMED" | "UNCONFIRMED" | "FAILED";
}
const errorMessage = (error: unknown) => {
  const value = error as { response?: { data?: { message?: string } }; message?: string };
  return value.response?.data?.message || value.message || String(error);
};
const safeUrl = (value: string) => {
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password; }
  catch { return false; }
};
const formatRange = (low?: number | null, high?: number | null) =>
  low == null || high == null ? "—" : `${low.toLocaleString()} – ${high.toLocaleString()} ×`;

/** 只根據本股目前估值報告的正式假設確認核准結果，不依賴 Job 執行歷史。 */
export function reportMatchesProposal(report: StockAnalysisReport | null, figi: string, code: string, proposal: IndustryValuationProposal): boolean {
  if (report?.context.figi !== figi || report.valuation.status !== "AVAILABLE") return false;
  const result = report.valuation.value?.industryFairValueRange;
  if (result?.status !== "AVAILABLE" || !result.value) return false;
  const value = result.value;
  const assumptions = value.assumptions ?? {};
  const sources = typeof assumptions.sourceUrls === "string" ? assumptions.sourceUrls.split(/\s+/).filter(Boolean).sort() : [];
  return value.modelCode === proposal.metric && assumptions.rangeSource === "AI_INDUSTRY_BASELINE"
    && assumptions.industryCode === code && assumptions.primaryValuationMetric === proposal.metric
    && assumptions.classificationAsOf === proposal.asOf
    && value.multipleQuantiles?.low === proposal.low && value.multipleQuantiles?.high === proposal.high
    && JSON.stringify(sources) === JSON.stringify([...proposal.sourceUrls].sort());
}

export function IndustryValuationProposalPanel({ industryCode, figi, reloadReport }: Props) {
  const { t, i18n } = useTranslation();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recalculation, setRecalculation] = useState<Recalculation | null>(null);
  const commandPending = useRef(false);
  const reload = useRef(reloadReport);
  reload.current = reloadReport;
  const queryKey = ["industry-valuation-review", industryCode];
  const reviewQuery = useQuery<IndustryValuationReview>({
    queryKey, enabled: Boolean(industryCode),
    queryFn: () => industryValuationApi.review(industryCode!),
    refetchInterval: (query) => ["PENDING", "PROCESSING"].includes(query.state.data?.latestProposal?.status ?? "") ? 2500 : false,
  });
  const review = reviewQuery.data;
  const proposal = review?.latestProposal;
  const pendingRecalculation = recalculation?.phase === "QUEUED";

  useEffect(() => {
    if (!pendingRecalculation || !recalculation) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const report = await reload.current();
        if (cancelled) return;
        const approved = recalculation.approval.review.latestProposal;
        if (approved && reportMatchesProposal(report, figi, industryCode!, approved)) {
          setRecalculation({ ...recalculation, phase: "CONFIRMED" });
          return;
        }
        // 未匹配代表目前數據尚未確認，不能由排程狀態推斷成功或失敗。
        timer = setTimeout(poll, 3000);
      } catch (failure) {
        if (!cancelled) { setError(errorMessage(failure)); setRecalculation({ ...recalculation, phase: "FAILED" }); }
      }
    };
    timer = setTimeout(poll, 3000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [recalculation, pendingRecalculation, figi, industryCode]);

  const act = async (action: "PROPOSE" | "APPROVE") => {
    if (commandPending.current || !industryCode || !review?.availableActions.includes(action)) return;
    if (action === "APPROVE" && proposal?.status !== "DRAFT") return;
    commandPending.current = true;
    setBusy(true);
    setError(null);
    let savedApproval: IndustryValuationApproval | null = null;
    try {
      if (action === "PROPOSE") {
        client.setQueryData(queryKey, await industryValuationApi.propose(industryCode));
        setRecalculation(null);
      } else {
        const approval = await industryValuationApi.approve(industryCode, proposal!.id);
        savedApproval = approval;
        client.setQueryData(queryKey, approval.review);
        if (approval.recalculationRequired) {
          const job = approval.recalculationTaskCode ? await industryValuationApi.job(approval.recalculationTaskCode) : null;
          if (!job) throw new Error(t("industryProposal.jobUnavailable"));
          // 正常 Quartz API 接收一次性 trigger 並排隊；工作提交不依賴頁面繼續掛載。
          await industryValuationApi.recalculate(job, figi);
          setRecalculation({ approval, phase: "QUEUED" });
        }
      }
    } catch (failure) {
      setError(errorMessage(failure));
      if (savedApproval) setRecalculation({ approval: savedApproval, phase: "FAILED" });
      void reviewQuery.refetch();
    } finally { commandPending.current = false; setBusy(false); }
  };

  const sources = (urls: string[]) => <Stack spacing={0.5}>{urls.map((url, index) => safeUrl(url)
    ? <Link key={`${index}:${url}`} href={url} target="_blank" rel="noopener noreferrer" sx={{ overflowWrap: "anywhere" }}>{url}</Link>
    : <Typography key={`${index}:${url}`} variant="body2" sx={{ overflowWrap: "anywhere" }}>{url}</Typography>)}</Stack>;
  const refresh = async () => {
    if (commandPending.current) return;
    setBusy(true);
    setError(null);
    try {
      await reviewQuery.refetch();
      const approved = recalculation?.approval.review.latestProposal;
      if (recalculation && approved) {
        const report = await reload.current();
        const matched = reportMatchesProposal(report, figi, industryCode!, approved);
        setRecalculation({ ...recalculation, phase: matched ? "CONFIRMED" : "UNCONFIRMED" });
        if (!matched) setError(t("industryProposal.reportMismatch"));
      }
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  };
  const status = recalculation ? t(`industryProposal.recalculation.${recalculation.phase}`) : null;
  const codeText = (code?: string | null) => code ? t(`industryProposal.codes.${code}`, { defaultValue: code }) : "—";

  return <Box component="section" aria-label={t("industryProposal.title")} sx={{ mt: 2 }}>
    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t("industryProposal.title")}</Typography>
    <Stack spacing={2} sx={{ mt: 1 }}>
      {!industryCode && <Typography variant="body2" color="text.secondary">{t("industryProposal.industryMissing")}</Typography>}
      <Alert severity="info">{t("industryProposal.description")}</Alert>
      {reviewQuery.isLoading && <CircularProgress size={24} />}
      {(error || reviewQuery.isError) && <Alert severity="error">{error || errorMessage(reviewQuery.error)}</Alert>}
      {review && <>
        <Typography>{review.industry} · {review.industryCode}</Typography>
        {review.unavailabilityReason && <Alert severity="warning">{review.unavailabilityReason}</Alert>}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, xl: 6 }}><Paper variant="outlined" sx={{ p: 2, height: "100%" }} component="section" aria-label={t("industryProposal.current")}>
            <Stack spacing={1}>
              <Typography variant="h6">{t("industryProposal.current")}</Typography>
              <Typography>{t("industryProposal.model")}: {codeText(review.valuationModelCode)}</Typography>
              <Typography>{t("industryProposal.metric")}: {codeText(review.primaryValuationMetric)}</Typography>
              {Object.entries(review.current.ranges).map(([metric, range]) => <Typography key={metric}>{codeText(metric)}: {formatRange(range?.low, range?.high)}</Typography>)}
              <Typography>{t("industryProposal.asOf")}: {review.current.asOf ?? "—"}</Typography>
              <Typography sx={{ whiteSpace: "pre-wrap" }}>{review.current.rationale || t("industryProposal.noRationale")}</Typography>
              {sources(review.current.sourceUrls)}
            </Stack>
          </Paper></Grid>
          <Grid size={{ xs: 12, xl: 6 }}><Paper variant="outlined" sx={{ p: 2, height: "100%" }} component="section" aria-label={t("industryProposal.proposal")}>
            <Stack spacing={1}>
              <Typography variant="h6">{t("industryProposal.proposal")}</Typography>
              {proposal ? <>
                <Chip label={t(`industryProposal.status.${proposal.status}`, { defaultValue: proposal.status })} sx={{ alignSelf: "flex-start" }} />
                <Typography>{t("industryProposal.model")}: {codeText(proposal.valuationModelCode)}</Typography>
                <Typography>{t("industryProposal.metric")}: {codeText(proposal.metric)}</Typography>
                <Typography>{t("industryProposal.range")}: {formatRange(proposal.low, proposal.high)}</Typography>
                <Typography>{t("industryProposal.asOf")}: {proposal.asOf}</Typography>
                <Typography variant="body2">{t("industryProposal.createdAt")}: {formatHongKongDateTime(proposal.createdAt, i18n.resolvedLanguage ?? i18n.language)}</Typography>
                <Typography sx={{ whiteSpace: "pre-wrap" }}>{proposal.rationale || t("industryProposal.noRationale")}</Typography>
                {proposal.sources?.length ? proposal.sources.map((source, index) => <Box key={`${index}:${source.url}`}>
                  <Typography variant="subtitle2">{source.title}</Typography>
                  <Typography variant="caption">{t("industryProposal.publishedDate")}: {source.publishedDate}</Typography>
                  {sources([source.url])}
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{source.evidence}</Typography>
                </Box>) : sources(proposal.sourceUrls)}
                {proposal.failureReason && <Alert severity="error">{proposal.failureReason}</Alert>}
                {proposal.status === "DRAFT" && <Alert severity="warning">{t("industryProposal.approvalNotice")}</Alert>}
              </> : <Typography>{t("industryProposal.noProposal")}</Typography>}
            </Stack>
          </Paper></Grid>
        </Grid>
      </>}
      {status && <Alert severity={recalculation?.phase === "CONFIRMED" ? "success" : pendingRecalculation ? "info" : "warning"}>{status}</Alert>}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {industryCode && <Button onClick={() => void refresh()} disabled={busy || reviewQuery.isFetching}>{t("industryProposal.refresh")}</Button>}
        {review?.availableActions?.includes("PROPOSE") && <Button onClick={() => void act("PROPOSE")} disabled={busy || pendingRecalculation} variant="outlined">{t("industryProposal.propose")}</Button>}
        {review?.availableActions?.includes("APPROVE") && proposal?.status === "DRAFT" && <Button onClick={() => void act("APPROVE")} disabled={busy || pendingRecalculation} variant="contained">{t("industryProposal.approve")}</Button>}
      </Stack>
    </Stack>
  </Box>;
}
