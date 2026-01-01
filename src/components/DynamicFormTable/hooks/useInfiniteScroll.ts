import { useCallback, useRef } from "react";

export interface UseInfiniteScrollReturn {
  lastElementRef: (node: HTMLTableRowElement | null) => void;
}

export const useInfiniteScroll = (
  onLoadMore?: () => void,
  options?: {
    hasMore?: boolean;
    enabled?: boolean;
    isLoading?: boolean;
  }
): UseInfiniteScrollReturn => {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const lastElementRef = useCallback(
    (node: HTMLTableRowElement | null) => {
      const isLoading = options?.isLoading ?? false;
      const hasMore = options?.hasMore ?? false;
      const enabled = options?.enabled ?? true;

      if (isLoading) return;

      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore && enabled) {
          onLoadMore?.();
        }
      });

      if (node) {
        observerRef.current.observe(node);
      }
    },
    [onLoadMore, options?.hasMore, options?.enabled, options?.isLoading]
  );

  return { lastElementRef };
};
