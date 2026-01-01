// src/components/Layout.tsx
import React, { useState, useEffect } from "react";
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Collapse, Box, Icon, Tabs, Tab, Paper } from "@mui/material";
import { ExpandLess, ExpandMore, FolderOpen, Folder, Description, Close } from "@mui/icons-material";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { MenuTree } from "../services/types/menu";

const DRAWER_WIDTH = 240;

interface TabInfo {
  id: string;
  label: string;
  path: string;
  menuId: string;
}

interface LayoutProps {
  menuData: MenuTree[];
}

const getStoredTabs = (): TabInfo[] => {
  try {
    const stored = sessionStorage.getItem('layout-tabs');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const getStoredActiveTab = (): string => {
  return sessionStorage.getItem('layout-activeTab') || "";
};

const Layout: React.FC<LayoutProps> = ({ menuData }) => {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [tabs, setTabs] = useState<TabInfo[]>(getStoredTabs);
  const [activeTab, setActiveTab] = useState<string>(getStoredActiveTab);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    sessionStorage.setItem('layout-tabs', JSON.stringify(tabs));
  }, [tabs]);

  useEffect(() => {
    if (activeTab) {
      sessionStorage.setItem('layout-activeTab', activeTab);
    } else {
      sessionStorage.removeItem('layout-activeTab');
    }
  }, [activeTab]);

  // ✅ 當 tabs 為空時，清除 activeTab
  useEffect(() => {
    if (tabs.length === 0) {
      setActiveTab("");
    }
  }, [tabs]);

  // ✅ 檢查 activeTab 是否存在於 tabs 中（不檢查路由）
  useEffect(() => {
    if (activeTab && tabs.length > 0 && !tabs.find(tab => tab.id === activeTab)) {
      // activeTab 不在 tabs 列表中，選擇第一個 tab
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  const handleToggle = (id: string) => setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleMenuClick = (item: MenuTree) => {
    if (!item.children?.length) {
      const existingTab = tabs.find(tab => tab.menuId === item.menuId);
      
      if (existingTab) {
        setActiveTab(existingTab.id);
        navigate(existingTab.path);
      } else {
        const newTab: TabInfo = {
          id: `tab-${Date.now()}`,
          label: item.name,
          path: item.path,
          menuId: item.menuId,
        };
        
        const newTabs = [...tabs, newTab];
        setTabs(newTabs);
        setActiveTab(newTab.id);
        navigate(item.path);
      }
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    if (newValue) {
      const tab = tabs.find(t => t.id === newValue);
      if (tab) {
        setActiveTab(newValue);
        navigate(tab.path);
      }
    }
  };

  const handleCloseTab = (tabId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    if (tabIndex === -1) return;

    const newTabs = tabs.filter(tab => tab.id !== tabId);
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
          <ListItem disablePadding sx={{ pl: 2 + level * 2 }}>
            <ListItemButton onClick={() => hasChildren ? handleToggle(item.menuId) : handleMenuClick(item)}>
              <ListItemIcon>
                {item.icon ? <Icon>{item.icon}</Icon> : hasChildren ? (isOpen ? <FolderOpen /> : <Folder />) : <Description />}
              </ListItemIcon>
              <ListItemText primary={item.name} />
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
    <Box sx={{ display: "flex", height: "100vh" }}>
      <Drawer variant="permanent" anchor="left" sx={{ width: DRAWER_WIDTH, flexShrink: 0, "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box", height: "100%" } }}>
        <List sx={{ flexGrow: 1, overflow: "auto" }}>{renderMenu(menuData)}</List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {tabs.length > 0 && activeTab && (
          <Paper elevation={1} sx={{ borderBottom: 1, borderColor: "divider", flexShrink: 0 }}>
            <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
              {tabs.map((tab) => (
                <Tab 
                  key={tab.id} 
                  value={tab.id} 
                  label={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <span>{tab.label}</span>
                      <Close 
                        sx={{ 
                          fontSize: 16, 
                          ml: 1, 
                          '&:hover': { backgroundColor: 'action.hover' }, 
                          borderRadius: '50%', 
                          p: 0.5,
                          cursor: 'pointer'
                        }} 
                        onClick={(event) => handleCloseTab(tab.id, event)} 
                      />
                    </Box>
                  } 
                  sx={{ minHeight: 48, textTransform: 'none' }} 
                />
              ))}
            </Tabs>
          </Paper>
        )}

        <Box sx={{ flexGrow: 1, overflow: "auto", p: tabs.length > 0 ? 0.5 : 0 }}>
          {tabs.length === 0 && location.pathname === "/" && (
            <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
              <h1>歡迎使用系統</h1>
              <p>請從左側菜單選擇功能</p>
            </Box>
          )}
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
