import axios, { AxiosInstance } from "axios";

export const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL as string,
  timeout: 100000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 请求拦截器
apiClient.interceptors.request.use((config) => {
  console.log("[axios][request]", {
    url: config.baseURL ? config.baseURL + config.url : config.url,
    method: config.method,
    params: config.params,
    data: config.data,
    headers: config.headers,
  });
  return config;
});

// 响应拦截器
apiClient.interceptors.response.use(
  (res) => {
    console.log("[axios][response]", {
      url: res.config.baseURL ? res.config.baseURL + res.config.url : res.config.url,
      status: res.status,
      data: res.data,
    });
    return res;
  },
  (err) => {
    if (err.response) {
      console.error("[axios][error]", {
        url: err.config.baseURL ? err.config.baseURL + err.config.url : err.config.url,
        status: err.response.status,
        data: err.response.data,
      });
    } else {
      console.error("[axios][error]", err);
    }
    return Promise.reject(err);
  }
);
