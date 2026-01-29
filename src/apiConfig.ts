export interface ApiEndpoint {
  method: "get" | "post" | "put" | "delete";
  url: string;
}

type ApiKey = "getMenu" | "getSearchCriteriaConfig" | "getJobList" | "launchJobList" | "getWatchList" | "updateSearchCriteriaConfig";

// Step 2：编写配置并用 satisfies 验证
export const apiConfig = {
  getMenu: {
    method: "post",
    url: process.env.REACT_APP_MENU_ENQUIRY!,
  },
  getSearchCriteriaConfig: {
    method: "post",
    url: process.env.REACT_APP_GET_SEARCH_CRITERIA!,
  },
  updateSearchCriteriaConfig: {
    method: "post",
    url: process.env.REACT_APP_UPDATE_SEARCH_CRITERIA!,
  },
  getJobList: {
    method: "post",
    url: process.env.REACT_APP_JOB_ENQUIRY!,
  },
  launchJobList: {
    method: "post",
    url: process.env.REACT_APP_JOB_LAUNCH!,
  },
  getWatchList: {
    method: "post",
    url: process.env.REACT_APP_WATCH_LIST!,
  },
} satisfies Record<ApiKey, ApiEndpoint>;

// Step 3：封装调用函数
export function callApi<K extends ApiKey>(key: K, payload?: unknown): Promise<unknown> {
  const { method, url } = apiConfig[key];
  return fetch(url, { method, body: JSON.stringify(payload) }).then((res) => res.json());
}
