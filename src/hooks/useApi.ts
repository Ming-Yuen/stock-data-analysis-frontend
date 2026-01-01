// hooks/useApi.ts
import {
  UseQueryResult,
  useQuery,
  UseMutationResult,
  useMutation,
} from "@tanstack/react-query";
import { buildService } from "../services/serviceFactory";
import { ApiEndpoint } from "../apiConfig";

export function useFetch<T = any>(
  endpoint: ApiEndpoint,
  params?: Record<string, any>
): UseQueryResult<T> {
  return useQuery<T>({
    queryKey: [endpoint.url, endpoint.method, params],
    queryFn: () => {
      const serviceFunction = buildService(endpoint);
      return serviceFunction({}, params); // GET: 空 data，有 params
    },
  });
}

export function useMutate<
  TResponse = any,
  TData extends Record<string, unknown> = Record<string, unknown>
>(
  endpoint: ApiEndpoint,
  params?: Record<string, any>, // 第二个参数继续当 query params 用
  options?: Parameters<typeof useMutation<TResponse, unknown, TData>>[0] // 第三个参数当 useMutation options
): UseMutationResult<TResponse, unknown, TData> {
  return useMutation({
    mutationFn: (data: TData) => {
      const serviceFunction = buildService(endpoint);
      return serviceFunction(data, params); // POST: data body, params query
    },
    ...options, // 把 onSuccess / onError 等透传进去
  });
}
