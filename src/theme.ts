import { alpha, createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#2563EB", dark: "#1D4ED8", light: "#DBEAFE" },
    secondary: { main: "#0F766E" },
    success: { main: "#059669" },
    warning: { main: "#D97706" },
    error: { main: "#DC2626" },
    background: { default: "#F4F7FB", paper: "#FFFFFF" },
    text: { primary: "#172033", secondary: "#64748B" },
    divider: "#E5EAF1",
  },
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: 'Roboto, "Noto Sans TC", "Noto Sans SC", system-ui, sans-serif',
    h1: { fontWeight: 700, letterSpacing: "-0.025em" },
    h2: { fontWeight: 700, letterSpacing: "-0.025em" },
    h3: { fontWeight: 700, letterSpacing: "-0.02em" },
    h4: { fontWeight: 700, letterSpacing: "-0.02em" },
    h5: { fontWeight: 700, letterSpacing: "-0.015em" },
    h6: { fontWeight: 700 },
    button: { fontWeight: 700, textTransform: "none" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: "#F4F7FB" },
        "*": { boxSizing: "border-box" },
        "*::-webkit-scrollbar": { width: 8, height: 8 },
        "*::-webkit-scrollbar-thumb": { backgroundColor: "#CBD5E1", borderRadius: 4 },
        "*::-webkit-scrollbar-track": { backgroundColor: "transparent" },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 4, minHeight: 38, paddingInline: 16 },
        containedPrimary: {
          boxShadow: `0 8px 18px ${alpha("#2563EB", 0.2)}`,
          "&:hover": { boxShadow: `0 10px 24px ${alpha("#2563EB", 0.28)}` },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 3, fontWeight: 600 },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small" },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: "#FFFFFF",
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#94A3B8" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderWidth: 1.5 },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { borderRadius: 3, fontSize: 12 } },
    },
  },
});

export default theme;
