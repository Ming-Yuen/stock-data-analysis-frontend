import React, { useState, useEffect } from "react";
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Collapse, Box, Icon, Tabs, Tab, Paper, Typography, Avatar } from "@mui/material";
import { ExpandLess, ExpandMore, FolderOpen, Folder, Description, Close, QueryStats } from "@mui/icons-material";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { MenuTree } from "../services/types/dto/menu";
import LanguageSwitcher from "../components/LanguageSwitcher";
import "../i18n";
import { useTranslation } from "react-i18next";

const DRAWER_WIDTH = 240;

interface TabInfo {
  id: string;
  label?: string;
  path: string;
  menuId: string;
}

interface LayoutProps {
  menuData: MenuTree[];
}

const getStoredTabs = (): TabInfo[] => {
  try {
    const stored = sessionStorage.getItem("layout-tabs");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const getStoredActiveTab = (): string => {
  return sessionStorage.getItem("layout-activeTab") || "";
};

const MENU_I18N_KEYS: Record<string, string> = {
  "/user": "menu.user",
  "/stockAnalysis": "menu.stockAnalysis",
  "/dataManagement": "menu.dataManagement",
  "/jobConfig": "menu.jobConfiguration",
  "/watchlist": "menu.watchList",
};

const Layout: React.FC<LayoutProps> = ({ menuData }) => {
  const { t } = useTranslation();
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [tabs, setTabs] = useState<TabInfo[]>(getStoredTabs);
  const [activeTab, setActiveTab] = useState<string>(getStoredActiveTab);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    sessionStorage.setItem("layout-tabs", JSON.stringify(tabs));
  }, [tabs]);

  useEffect(() => {
    if (activeTab) sessionStorage.setItem("layout-activeTab", activeTab);
    else sessionStorage.removeItem("layout-activeTab");
  }, [activeTab]);

  useEffect(() => {
    if (tabs.length === 0) setActiveTab("");
  }, [tabs]);

  useEffect(() => {
    if (activeTab && tabs.length > 0 && !tabs.find((tab) => tab.id === activeTab)) setActiveTab(tabs[0].id);
  }, [tabs, activeTab]);

  const handleToggle = (id: string) => setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleMenuClick = (item: MenuTree) => {
    if (!item.children?.length) {
      const existingTab = tabs.find((tab) => tab.menuId === item.menuId);

      if (existingTab) {
        setActiveTab(existingTab.id);
        navigate(existingTab.path);
      } else {
        const newTab: TabInfo = { id: `tab-${Date.now()}`, label: item.name, path: item.path, menuId: item.menuId };
        const newTabs = [...tabs, newTab];
        setTabs(newTabs);
        setActiveTab(newTab.id);
        navigate(item.path);
      }
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    if (!newValue) return;
    const tab = tabs.find((t) => t.id === newValue);
    if (!tab) return;
    setActiveTab(newValue);
    navigate(tab.path);
  };

  const handleCloseTab = (tabId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    const tabIndex = tabs.findIndex((tab) => tab.id === tabId);
    if (tabIndex === -1) return;

    const newTabs = tabs.filter((tab) => tab.id !== tabId);
    setTabs(newTabs);

    if (newTabs.length === 0) {
      setActiveTab("");
      navigate("/");
    } else if (activeTab === tabId) {
      const newActiveTabIndex = Math.min(tabIndex, newTabs.length - 1);
      const newActiveTab = newTabs[newActiveTabIndex];
      setActiveTab(newActiveTab.id);
      navigate(newActiveTab.path);
    }
  };

  const renderMenu = (menus: MenuTree[], level = 0) =>
    menus.map((item) => {
      const hasChildren = !!item.children?.length;
      const isOpen = openItems[item.menuId] || false;

      return (
        <React.Fragment key={item.menuId}>
          <ListItem disablePadding sx={{ px: 1.5, mb: 0.5 }}>
            <ListItemButton
              selected={!hasChildren && location.pathname === item.path}
              onClick={() => (hasChildren ? handleToggle(item.menuId) : handleMenuClick(item))}
              sx={{
                minHeight: 44,
                pl: 1.5 + level * 2,
                borderRadius: 2.5,
                color: "rgba(226,232,240,.78)",
                "& .MuiListItemIcon-root": { color: "rgba(148,163,184,.9)" },
                "&:hover": { bgcolor: "rgba(255,255,255,.07)", color: "#fff" },
                "&.Mui-selected": {
                  bgcolor: "rgba(59,130,246,.18)",
                  color: "#fff",
                  boxShadow: "inset 3px 0 0 #60A5FA",
                  "& .MuiListItemIcon-root": { color: "#93C5FD" },
                  "&:hover": { bgcolor: "rgba(59,130,246,.24)" },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 38 }}>{item.icon ? <Icon sx={{ fontSize: 20 }}>{item.icon}</Icon> : hasChildren ? isOpen ? <FolderOpen /> : <Folder /> : <Description />}</ListItemIcon>
              <ListItemText primary={t(MENU_I18N_KEYS[item.path] ?? "menu.unknown", { defaultValue: item.name })} primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }} />
              {hasChildren && (isOpen ? <ExpandLess /> : <ExpandMore />)}
            </ListItemButton>
          </ListItem>
          {hasChildren && (
            <Collapse in={isOpen} timeout="auto" unmountOnExit>
              <List disablePadding>{renderMenu(item.children!, level + 1)}</List>
            </Collapse>
          )}
        </React.Fragment>
      );
    });

  return (
    <Box sx={{ display: "flex", height: "100vh", bgcolor: "background.default" }}>
      <Drawer variant="permanent" anchor="left" sx={{ width: DRAWER_WIDTH, flexShrink: 0, "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box", height: "100%", bgcolor: "#101827", color: "#fff", border: 0 } }}>
        <Box sx={{ height: 72, px: 2.25, display: "flex", alignItems: "center", gap: 1.4, borderBottom: "1px solid rgba(148,163,184,.14)" }}>
          <Avatar variant="rounded" sx={{ width: 38, height: 38, bgcolor: "#2563EB", boxShadow: "0 8px 22px rgba(37,99,235,.35)" }}>
            <QueryStats sx={{ fontSize: 22 }} />
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 800, letterSpacing: ".01em", lineHeight: 1.2 }}>{t("shell.productName")}</Typography>
            <Typography sx={{ fontSize: 11, color: "#94A3B8", mt: 0.35 }}>{t("shell.productSubtitle")}</Typography>
          </Box>
        </Box>
        <Typography sx={{ px: 2.5, pt: 2.5, pb: 1, fontSize: 10, fontWeight: 800, letterSpacing: ".12em", color: "#64748B" }}>{t("shell.navigation")}</Typography>
        <List sx={{ flexGrow: 1, overflow: "auto", py: 0.5 }}>{renderMenu(menuData)}</List>
        <Box sx={{ m: 1.5, p: 1.5, borderRadius: 2.5, bgcolor: "rgba(255,255,255,.045)", border: "1px solid rgba(148,163,184,.1)" }}>
          <Typography sx={{ fontSize: 11, color: "#64748B" }}>{t("shell.workspace")}</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#CBD5E1", mt: 0.35 }}>{t("shell.usMarket")}</Typography>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0, bgcolor: "background.default" }}>
        <Box sx={{ height: 72, px: { xs: 2, md: 3 }, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", bgcolor: "rgba(255,255,255,.92)", backdropFilter: "blur(12px)", flexShrink: 0 }}>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: "text.primary", lineHeight: 1.25 }}>
              {tabs.find((tab) => tab.id === activeTab)
                ? t(MENU_I18N_KEYS[tabs.find((tab) => tab.id === activeTab)!.path] ?? "menu.unknown", { defaultValue: tabs.find((tab) => tab.id === activeTab)!.label })
                : t("shell.overview")}
            </Typography>
            <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.25 }}>{t("shell.marketIntelligence")}</Typography>
          </Box>
          <LanguageSwitcher />
        </Box>

        {tabs.length > 0 && activeTab && (
          <Paper elevation={0} sx={{ px: 2, borderBottom: 1, borderColor: "divider", borderRadius: 0, bgcolor: "background.paper", flexShrink: 0 }}>
            <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto" sx={{ minHeight: 46, "& .MuiTabs-indicator": { height: 3, borderRadius: "3px 3px 0 0" } }}>
              {tabs.map((tab) => (
                <Tab
                  key={tab.id}
                  value={tab.id}
                  label={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <span>{t(MENU_I18N_KEYS[tab.path] ?? "menu.unknown", { defaultValue: tab.label ?? tab.path })}</span>
                      <Close sx={{ fontSize: 16, ml: 1, "&:hover": { bgcolor: "action.hover" }, borderRadius: "50%", p: 0.5, cursor: "pointer" }} onClick={(event) => handleCloseTab(tab.id, event)} />
                    </Box>
                  }
                  sx={{ minHeight: 46, textTransform: "none", fontWeight: 700, color: "text.secondary" }}
                />
              ))}
            </Tabs>
          </Paper>
        )}

        <Box sx={{ flexGrow: 1, overflow: "auto", p: { xs: 1.5, md: 2.5, xl: 3 }, bgcolor: "background.default" }}>
          <Box sx={{ width: "100%", maxWidth: 1680, mx: "auto" }}><Outlet /></Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
