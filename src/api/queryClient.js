import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,   // 5 min: don't refetch if data is fresh
      gcTime: 1000 * 60 * 30,     // 30 min: keep cache in memory
      refetchOnWindowFocus: false, // no refetch on app foreground in mobile
    },
  },
});
