// src/App.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./layouts/layout";
import { JobManagementPage } from "./pages/JobManagement";
import { useFetch } from "./hooks/useApi";
import { apiConfig } from "./apiConfig";
import { MenuEnquiryResponse, MenuTree } from "./services/types/menu";
import { WatchListPage } from "./pages/Watchlist";

// 页面配置接口
interface PageConfig {
  component: React.ComponentType<{ menuTree: MenuTree }>;
  // 可以添加更多配置选项
  // layout?: 'default' | 'fullscreen' | 'sidebar';
  // permissions?: string[];
  // breadcrumbs?: boolean;
}

// 页面组件映射表 - 只需要在这里维护配置
const PAGE_CONFIG_MAP: Record<string, PageConfig> = {
  "/jobConfig": { component: JobManagementPage },
  "/Home": { component: JobManagementPage },
  "/watchlist": { component: WatchListPage },
  // 在这里添加更多页面映射
  // 'stockAnalysis': { component: StockAnalysisPage },
  // '/stockAnalysis': { component: StockAnalysisPage },
  // 'userManagement': { component: UserManagementPage },
  // '/userManagement': { component: UserManagementPage },
  // 'dataManagement': { component: DataManagementPage },
  // '/dataManagement': { component: DataManagementPage },
  // 等等...
};

// 递归函数：为菜单树生成路由
const generateRoutes = (menuTrees: MenuTree[]) => {
  const routes: React.ReactNode[] = [];

  menuTrees.forEach((menuTree) => {
    // 为每个菜单项生成路由
    if (menuTree.path && menuTree.path !== "/") {
      // 查找对应的页面配置 - 尝试多种路径格式
      let pageConfig = PAGE_CONFIG_MAP[menuTree.path];
      if (!pageConfig) {
        // 如果没有前导斜杠，尝试添加
        pageConfig = PAGE_CONFIG_MAP[`/${menuTree.path}`];
      }
      if (!pageConfig) {
        // 如果有前导斜杠，尝试移除
        pageConfig = PAGE_CONFIG_MAP[menuTree.path.replace(/^\//, "")];
      }

      if (pageConfig) {
        const { component: PageComponent } = pageConfig;
        routes.push(
          <Route
            key={menuTree.menuId}
            path={menuTree.path.replace(/^\//, "")} // 移除开头的 '/' 用于路由
            element={<PageComponent menuTree={menuTree} />}
          />
        );
      }

      // 递归处理子菜单（无论是否找到当前项的配置）
      if (menuTree.children && menuTree.children.length > 0) {
        routes.push(...generateRoutes(menuTree.children));
      }
    }
  });

  return routes;
};

const App: React.FC = () => {
  const {
    data: menuData,
    isPending,
    error,
  } = useFetch<MenuEnquiryResponse>(apiConfig.getMenu);

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading menu: {error.message}</div>;
  }

  // Default to empty array if no menu data
  const menuTrees = menuData?.menuTrees || [];

  return (
    <Routes>
      <Route path="/" element={<Layout menuData={menuTrees} />}>
        {/* 动态生成的路由 */}
        {generateRoutes(menuTrees)}

        {/* 404 */}
        <Route path="*" element={<div>頁面不存在</div>} />
      </Route>
    </Routes>
  );
};

export default App;
