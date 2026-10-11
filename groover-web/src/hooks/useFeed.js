// src/hooks/useFeed.ts
'use client';
import { useState, useCallback } from 'react';
export function useFeed(options = {}) {
    const { category, tag, limit = 10, feedType = 'latest' } = options;
    const [posts, setPosts] = useState([]);
    const [nextCursor, setNextCursor] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const fetchPosts = useCallback(async (cursor = null) => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.append('limit', limit.toString());
            if (cursor)
                params.append('cursor', cursor);
            let endpoint = '/blog/feed';
            if (category && category !== '전체') {
                endpoint = `/blog/feed/tag/${encodeURIComponent(category)}`;
            }
            else if (tag) {
                endpoint = `/blog/feed/tag/${encodeURIComponent(tag)}`;
            }
            else if (feedType === 'popular') {
                endpoint = '/blog/feed/popular';
            }
            const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}${endpoint}?${params}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
            });
            if (!response.ok) {
                throw new Error('피드를 불러오는데 실패했습니다.');
            }
            const result = await response.json();
            const data = result.data;
            if (cursor) {
                setPosts(prev => [...prev, ...data.items]);
            }
            else {
                setPosts(data.items);
            }
            setNextCursor(data.nextCursor);
            setHasMore(data.hasMore);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
        }
        finally {
            setIsLoading(false);
        }
    }, [category, tag, limit, feedType]);
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
