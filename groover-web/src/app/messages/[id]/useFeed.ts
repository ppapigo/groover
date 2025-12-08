'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';

interface Post {
  id: string;
  title: string;
  excerpt: string;
  thumbnail: string | null;
  tags: string[];
  viewCount: number;
  likeCount: number;
  publishedAt: string;
  author: {
    id: string;
    name: string;
  };
}

interface FeedState {
  posts: Post[];
  nextCursor: string | null;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useFeed(type: 'latest' | 'popular' | 'tag' = 'latest', tag?: string) {
  const [state, setState] = useState<FeedState>({
    posts: [],
    nextCursor: null,
    hasMore: true,
    isLoading: false,
    error: null,
  });

  const fetchPosts = useCallback(async (cursor?: string | null) => {
    if (state.isLoading) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let endpoint = '/blog/feed';
      const params: any = { limit: 10 };

      if (type === 'popular') {
        endpoint = '/blog/feed/popular';
      } else if (type === 'tag' && tag) {
        endpoint = `/blog/feed/tag/${tag}`;
      }

      if (cursor) {
        params.cursor = cursor;
      }

      const response = await api.get(endpoint, { params });
      const { items, nextCursor, hasMore } = response.data.data;

      setState(prev => ({
        posts: cursor ? [...prev.posts, ...items] : items,
        nextCursor,
        hasMore,
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || '피드를 불러오는데 실패했습니다.',
      }));
    }
  }, [type, tag, state.isLoading]);

  const loadMore = useCallback(() => {
    if (state.hasMore && !state.isLoading && state.nextCursor) {
      fetchPosts(state.nextCursor);
    }
  }, [state.hasMore, state.isLoading, state.nextCursor, fetchPosts]);

  const refresh = useCallback(() => {
    setState({
      posts: [],
      nextCursor: null,
      hasMore: true,
      isLoading: false,
      error: null,
    });
    fetchPosts(null);
  }, [fetchPosts]);

  return {
    posts: state.posts,
    isLoading: state.isLoading,
    hasMore: state.hasMore,
    error: state.error,
    loadMore,
    refresh,
    fetchPosts,
  };
}