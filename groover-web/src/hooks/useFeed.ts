// C:\dev\groover\groover-web\src\hooks\useFeed.ts
'use client';

import { useState, useCallback } from 'react';

interface Author {
  id: string;
  name: string;
  profileImage?: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  thumbnail?: string;
  previewImage?: string; 
  category: string;
  tags: string[];
  author: Author;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt: string;
  createdAt: string;
  slug: string;
}

interface FeedResponse {
  items: Post[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface UseFeedOptions {
  category?: string;
  tag?: string;
  limit?: number;
}

export function useFeed(options: UseFeedOptions = {}) {
  const { category, tag, limit = 10 } = options;
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async (cursor: string | null = null) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (cursor) params.append('cursor', cursor);
      if (category && category !== '전체') params.append('category', category);
      if (tag) params.append('tag', tag);

     const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}/blog/feed?${params}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('피드를 불러오는데 실패했습니다.');
      }

      const result = await response.json();
      const data: FeedResponse = result.data;  // data.data에서 꺼내기

      if (cursor) {
        setPosts(prev => [...prev, ...data.items]);
      } else {
        setPosts(data.items);
      }
      
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [category, tag, limit]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore && nextCursor) {
      fetchPosts(nextCursor);
    }
  }, [isLoading, hasMore, nextCursor, fetchPosts]);

  const refresh = useCallback(() => {
    setPosts([]);
    setNextCursor(null);
    setHasMore(true);
    fetchPosts(null);
  }, [fetchPosts]);

  return {
    posts,
    isLoading,
    error,
    hasMore,
    fetchPosts,
    loadMore,
    refresh,
  };
}