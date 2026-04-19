import React, { useState, MouseEvent } from "react";
import { Box, Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import CheckIcon from "@mui/icons-material/Check";
import { useTranslation } from "react-i18next";

type LangCode = "en" | "zh-HK" | "zh-CN";

interface LanguageOption {
  value: LangCode;
  label: string;
  short: string;
  region: string;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "en", label: "English", short: "EN", region: "US" },
  { value: "zh-HK", label: "繁體中文", short: "ZH", region: "HK" },
  { value: "zh-CN", label: "简体中文", short: "ZH", region: "CN" },
];

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const open = Boolean(anchorEl);

  const current: LanguageOption =
    LANGUAGE_OPTIONS.find((opt) =>
      i18n.language.toLowerCase().startsWith(opt.value.toLowerCase())
    ) || LANGUAGE_OPTIONS[0];

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleSelect = (lang: LangCode) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("app-lang", lang);
    handleClose();
  };

  return (
    <>
      <Box
        onClick={handleOpen}
        sx={(theme) => ({
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          px: 1,
          py: 0.25,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          cursor: "pointer",
          fontSize: 18,
          fontWeight: 600,
          "&:hover": {
            bgcolor: theme.palette.action.hover,
          },
        })}
      >
        <span>Language</span>
        <ArrowDropDownIcon sx={{ fontSize: 18 }} />
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        elevation={3}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {LANGUAGE_OPTIONS.map((opt) => {
          const selected = opt.value === current.value;

          return (
            <MenuItem
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              selected={selected}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <span style={{ fontSize: 11, fontWeight: 600 }}>{opt.region}</span>
              </ListItemIcon>

              <ListItemText
                primary={opt.label}
                secondary={`${opt.region} ${opt.short}`}
              />

              {selected && <CheckIcon fontSize="small" sx={{ ml: 1 }} />}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

export default LanguageSwitcher;