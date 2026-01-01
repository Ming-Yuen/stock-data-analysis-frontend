// serviceFactory.ts
import { ApiEndpoint, apiConfig } from "../apiConfig";
import { apiClient } from "./apiClient";

type Params = Record<string, string | number>;
type Data = Record<string, unknown>;

export function buildService(config: ApiEndpoint) {
  return async (data: Data = {}, params: Params = {}) => {
    // ✅ 改為 data 優先，params 次之
    let path = config.url;
    
    // 替換路徑參數 (例如 /user/:id)
    Object.entries(params).forEach(([key, val]) => {
      path = path.replace(`:${key}`, String(val));
    });
    
    const response = await apiClient.request({
      method: config.method,
      url: path,
      params: config.method === "get" ? params : undefined,  // GET 用 query parameters
      data: config.method !== "get" ? data : undefined,      // POST/PUT 用 body
    });
    
    return response.data;
  };
}

export const service = Object.fromEntries(
  Object.entries(apiConfig).map(([key, cfg]) => [key, buildService(cfg)])
) as Record<keyof typeof apiConfig, (d?: Data, p?: Params) => Promise<any>>;
