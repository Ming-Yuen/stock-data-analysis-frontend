import React, { useState, useEffect } from "react";
import { Alert, Box, Button, CircularProgress, FormControl, InputLabel, MenuItem, Paper, Select, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../services/apiClient";

interface UploadResult {
  totalRows: number; updated: number; unchanged: number; createdIndustries: number;
  missingIndustry: number; unmatched: number; ambiguous: number;
  issues: { row: number; symbol: string; reason: string }[];
}

interface UploadJob {
  id: string; fileName: string; status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  error?: string; result: UploadResult | null;
}
const JOB_KEY = "stock-industry-upload-job";

export function DataUploadPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [type, setType] = useState("STOCK_INDUSTRY");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [jobId, setJobId] = useState<string | null>(() => localStorage.getItem(JOB_KEY));
  const [job, setJob] = useState<UploadJob | null>(null);
  const [error, setError] = useState("");
  const [pollWarning, setPollWarning] = useState("");
  const terminal = job?.status === "COMPLETED" || job?.status === "FAILED";
  const pending = sending || job?.status === "PENDING" || job?.status === "PROCESSING" || (!!jobId && !job && !pollWarning);
  const result = job?.status === "COMPLETED" ? job.result : null;

  useEffect(() => {
    if (!jobId) return;
    let disposed = false;
    const poll = async () => {
      try {
        const response = await apiClient.get<UploadJob>(`upload/${jobId}`);
        if (disposed) return;
        setJob(response.data); setPollWarning("");
        if (response.data.status === "COMPLETED" || response.data.status === "FAILED") {
          window.clearInterval(timer);
          if (response.data.status === "COMPLETED") queryClient.invalidateQueries();
        }
      } catch {
        if (!disposed) setPollWarning(t("upload.checkPending"));
      }
    };
    const timer = window.setInterval(poll, 2000);
    poll();
    return () => { disposed = true; window.clearInterval(timer); };
  }, [jobId, queryClient, t]);

  const upload = async () => {
    if (!file || pending) return;
    const id = !jobId || terminal ? crypto.randomUUID() : jobId;
    localStorage.setItem(JOB_KEY, id); setJobId(id);
    setSending(true); setError(""); setPollWarning(""); setJob(null);
    try {
      const form = new FormData();
      form.append("id", id); form.append("type", type); form.append("file", file);
      const response = await apiClient.post<UploadJob>("upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      setPollWarning("");
      setJob(current => current?.id === id && (current.status === "COMPLETED" || current.status === "FAILED") ? current : response.data);
    } catch (ex: any) {
      // 接收回應遺失不代表背景任務失敗；保留 request ID，繼續查詢並允許同一檔案安全重送。
      setPollWarning(t("upload.checkPending"));
      if (ex.response?.status === 400) setError(ex.response.data?.message || t("upload.failed"));
    } finally { setSending(false); }
  };

  return <Box sx={{ p: 3, maxWidth: 1100, mx: "auto" }}>
    <Typography variant="h5" sx={{ mb: 2 }}>{t("upload.title")}</Typography>
    <Paper sx={{ p: 3, mb: 3 }}>
      <FormControl fullWidth sx={{ mb: 2 }} disabled={pending}>
        <InputLabel id="upload-type">{t("upload.type")}</InputLabel>
        <Select labelId="upload-type" label={t("upload.type")} value={type} onChange={event => { setType(event.target.value); setError(""); }}>
          <MenuItem value="STOCK_INDUSTRY">{t("upload.stockIndustry")}</MenuItem>
        </Select>
      </FormControl>
      <Alert severity="info" sx={{ mb: 2 }}>{t("upload.instructions")}</Alert>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Button component="label" variant="outlined" disabled={pending}>
          {t("upload.selectFile")}
          <input aria-label={t("upload.selectFile")} hidden disabled={pending} type="file" accept=".csv,text/csv" onChange={event => {
            const selected = event.target.files?.[0] ?? null;
            setError("");
            if (selected && (!selected.name.toLowerCase().endsWith(".csv") || selected.size > 10 * 1024 * 1024)) {
              setFile(null); setError(t("upload.invalidFile"));
            } else setFile(selected);
          }} />
        </Button>
        <Typography variant="body2">{file?.name || t("upload.noFile")}</Typography>
        <Button aria-label={t("upload.submit")} variant="contained" disabled={!file || pending} onClick={upload}>{pending ? <CircularProgress size={20} /> : t("upload.submit")}</Button>
      </Box>
    </Paper>
    {jobId && <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="body2">{t("upload.jobId")}: {jobId}</Typography>
      {job && <Typography variant="body2">{job.fileName} — {t(`upload.states.${job.status}`)}</Typography>}
      {pending && <Alert severity="info" sx={{ mt: 1 }}>{sending ? t("upload.sending") : t("upload.background")}</Alert>}
      {pollWarning && <Alert severity="warning" sx={{ mt: 1 }}>{pollWarning}</Alert>}
      {job?.status === "FAILED" && <Alert severity="error" sx={{ mt: 1 }}>{job.error === "BACKEND_RESTARTED" ? t("upload.restarted") : job.error || t("upload.failed")}</Alert>}
    </Paper>}
    {error && <Alert severity="error">{error}</Alert>}
    {result && <Paper sx={{ p: 3 }}>
      <Alert severity={result.missingIndustry + result.unmatched + result.ambiguous > 0 ? "warning" : "success"} sx={{ mb: 2 }}>{t("upload.completed")}</Alert>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mb: 3 }}>
        {(["totalRows", "updated", "unchanged", "createdIndustries", "missingIndustry", "unmatched", "ambiguous"] as const).map(key =>
          <Box key={key}><Typography color="text.secondary" variant="body2">{t(`upload.${key}`)}</Typography><Typography variant="h6">{result[key]}</Typography></Box>)}
      </Box>
      {result.issues.length > 0 && <>
        <Typography variant="body2">{t("upload.issueLimit")}</Typography>
        <Table size="small"><TableHead><TableRow><TableCell>{t("upload.row")}</TableCell><TableCell>Symbol</TableCell><TableCell>{t("upload.reason")}</TableCell></TableRow></TableHead>
          <TableBody>{result.issues.map(issue => <TableRow key={issue.row}><TableCell>{issue.row}</TableCell><TableCell>{issue.symbol}</TableCell><TableCell>{t(`upload.reasons.${issue.reason}`, { defaultValue: issue.reason })}</TableCell></TableRow>)}</TableBody>
        </Table>
      </>}
    </Paper>}
  </Box>;
}
