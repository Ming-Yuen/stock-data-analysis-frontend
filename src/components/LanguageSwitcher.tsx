import React, { MouseEvent, useState } from "react";
import { Box, ButtonBase, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import { useTranslation } from "react-i18next";

type LangCode = "en" | "zh-HK" | "zh-CN";

interface LanguageOption {
  value: LangCode;
  labelKey: string;
  short: string;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "en", labelKey: "languageSwitcher.english", short: "EN" },
  { value: "zh-HK", labelKey: "languageSwitcher.traditionalChinese", short: "繁" },
  { value: "zh-CN", labelKey: "languageSwitcher.simplifiedChinese", short: "简" },
];

const LanguageSwitcher: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const current = LANGUAGE_OPTIONS.find(
    (option) => option.value.toLowerCase() === i18n.resolvedLanguage?.toLowerCase()
  ) ?? LANGUAGE_OPTIONS[0];

  const handleOpen = (event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleSelect = (language: LangCode) => {
    i18n.changeLanguage(language);
    localStorage.setItem("app-lang", language);
    document.documentElement.lang = language;
    handleClose();
  };

  return (
    <>
      <ButtonBase
        onClick={handleOpen}
        aria-label={t("languageSwitcher.label")}
        aria-controls={open ? "language-menu" : undefined}
        aria-expanded={open ? "true" : undefined}
        aria-haspopup="menu"
        sx={(theme) => ({
          height: 40,
          px: 1.25,
          gap: 1,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          bgcolor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          transition: theme.transitions.create(["border-color", "background-color", "box-shadow"]),
          "&:hover": { bgcolor: theme.palette.action.hover, borderColor: theme.palette.primary.light },
          "&:focus-visible": {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
          },
        })}
      >
        <LanguageRoundedIcon sx={{ fontSize: 19, color: "primary.main" }} />
        <Box sx={{ display: { xs: "none", sm: "block" }, textAlign: "left" }}>
          <Typography sx={{ fontSize: 10, lineHeight: 1.1, color: "text.secondary" }}>
            {t("languageSwitcher.label")}
          </Typography>
          <Typography sx={{ mt: 0.25, fontSize: 13, fontWeight: 700, lineHeight: 1.1 }}>
            {t(current.labelKey)}
          </Typography>
        </Box>
        <ExpandMoreRoundedIcon
          sx={{
            ml: { xs: -0.5, sm: 0 },
            fontSize: 18,
            color: "text.secondary",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 160ms ease",
          }}
        />
      </ButtonBase>

      <Menu
        id="language-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              minWidth: 224,
              p: 0.75,
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              boxShadow: "0 12px 32px rgba(15, 23, 42, 0.14)",
            },
          },
        }}
      >
        {LANGUAGE_OPTIONS.map((option) => {
          const selected = option.value === current.value;

          return (
            <MenuItem
              key={option.value}
              onClick={() => handleSelect(option.value)}
              selected={selected}
              sx={{
                minHeight: 48,
                px: 1.25,
                borderRadius: 0.75,
                "&.Mui-selected": { bgcolor: "action.selected" },
                "&.Mui-selected:hover": { bgcolor: "action.selected" },
              }}
            >
              <ListItemIcon sx={{ minWidth: 42 }}>
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 0.75,
                    bgcolor: selected ? "primary.main" : "action.hover",
                    color: selected ? "primary.contrastText" : "text.secondary",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {option.short}
                </Box>
              </ListItemIcon>
              <ListItemText
                primary={t(option.labelKey)}
                primaryTypographyProps={{ fontSize: 14, fontWeight: selected ? 700 : 500 }}
              />
              {selected && <CheckRoundedIcon sx={{ ml: 1, fontSize: 19, color: "primary.main" }} />}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

export default LanguageSwitcher;
