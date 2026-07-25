// hooks/useApi.ts
import { UseQueryResult, useQuery, UseMutationResult, useMutation } from "@tanstack/react-query";
import { buildService } from "../../services/serviceFactory";
import { ApiEndpoint } from "../../apiConfig";

export function useFetch<T = any>(endpoint: ApiEndpoint, params?: Record<string, any>): UseQueryResult<T> {
  return useQuery<T>({
    queryKey: [endpoint.url, endpoint.method, params],
    queryFn: () => {
      const serviceFunction = buildService(endpoint);
      return serviceFunction(params ?? {}, {});
    },
  });
}

export function useMutate<TResponse = any, TData extends Record<string, unknown> = Record<string, unknown>>(endpoint: ApiEndpoint, params?: Record<string, any>, options?: Omit<Parameters<typeof useMutation<TResponse, unknown, TData>>[0], "mutationFn">): UseMutationResult<TResponse, unknown, TData> {
  return useMutation<TResponse, unknown, TData>({
    mutationFn: (data: TData) => {
      const serviceFunction = buildService(endpoint);
      return serviceFunction(data, params);
    },
    ...options,
  });
}
