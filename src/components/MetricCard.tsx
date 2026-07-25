import React from "react";
import { Paper, Stack, Typography, Chip, Box } from "@mui/material";
import { TrendingUp, TrendingDown, Remove } from "@mui/icons-material";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  status?: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
}

const getTrendIcon = (trend?: "up" | "down" | "neutral") => {
  if (trend === "up") return <TrendingUp fontSize="small" color="success" />;
  if (trend === "down") return <TrendingDown fontSize="small" color="error" />;
  return <Remove fontSize="small" color="disabled" />;
};

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, status, change, trend = "neutral" }) => {
  return (
    <Paper elevation={0} sx={{ p: 2, height: "100%", borderRadius: 2, bgcolor: "background.paper", border: 1, borderColor: "divider" }}>
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">{title}</Typography>
          {status && <Chip label={status} size="small" variant="outlined" />}
        </Stack>
        <Typography variant="h4" sx={{ fontWeight: 700, color: "text.primary" }}>{value}</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {getTrendIcon(trend)}
          {change && <Typography variant="body2" color="text.secondary">{change}</Typography>}
        </Box>
        {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
      </Stack>
    </Paper>
  );
};

export default MetricCard;