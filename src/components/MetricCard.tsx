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
  const accent = trend === "up" ? "success.main" : trend === "down" ? "error.main" : "primary.main";

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.25,
        height: "100%",
        minHeight: 164,
        borderRadius: 3,
        bgcolor: "background.paper",
        border: 1,
        borderColor: "divider",
        position: "relative",
        overflow: "hidden",
        transition: "transform .2s ease, box-shadow .2s ease, border-color .2s ease",
        "&::before": { content: '""', position: "absolute", inset: "0 auto 0 0", width: 4, bgcolor: accent },
        "&:hover": { transform: "translateY(-2px)", borderColor: "transparent", boxShadow: "0 14px 34px rgba(15,23,42,.09)" },
      }}
    >
      <Stack spacing={1.25} sx={{ height: "100%" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: "text.secondary", letterSpacing: ".035em", textTransform: "uppercase" }}>{title}</Typography>
          {status && <Chip label={status} size="small" variant="outlined" sx={{ height: 25, bgcolor: "background.default", borderColor: "divider" }} />}
        </Stack>
        <Typography sx={{ fontSize: { xs: 28, xl: 32 }, lineHeight: 1.1, fontWeight: 800, letterSpacing: "-.025em", color: "text.primary" }}>{value}</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minHeight: 22 }}>
          {getTrendIcon(trend)}
          {change && <Typography variant="body2" color="text.secondary">{change}</Typography>}
        </Box>
        {subtitle && <Typography sx={{ mt: "auto", fontSize: 11, color: "text.secondary" }}>{subtitle}</Typography>}
      </Stack>
    </Paper>
  );
};

export default MetricCard;
