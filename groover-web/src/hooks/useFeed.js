import { useInfiniteQuery } from '@tanstack/react-query';
import { reviewApi } from '@/lib/reviewApi';

export function useFeed({ tag = '', sort = 'latest', limit = 12 } = {}) {
  const query = useInfiniteQuery({
    queryKey: ['reviews', 'feed', { tag, sort, limit }],
    initialPageParam: null,
    queryFn: ({ pageParam, signal }) => reviewApi.feed({ tag, sort, limit, cursor: pageParam, signal }),
    getNextPageParam: (page) => page.hasMore ? page.nextCursor : undefined,
  });
  return {
    posts: query.data?.pages.flatMap(page => page.items) ?? [],
    isLoading: query.isPending,
    error: query.error,
    hasMore: query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    loadMore: () => { if (!query.isFetching && query.hasNextPage) query.fetchNextPage(); },
    refresh: query.refetch,
  };
}
