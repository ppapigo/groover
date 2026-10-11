'use client';
import { useEffect, useRef, useCallback } from 'react';
export function useInfiniteScroll({ onLoadMore, hasMore, isLoading, threshold = 0.1, rootMargin = '100px', }) {
    const observerRef = useRef(null);
    const targetRef = useRef(null);
    const handleObserver = useCallback((entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoading) {
            onLoadMore();
        }
    }, [hasMore, isLoading, onLoadMore]);
    useEffect(() => {
        if (observerRef.current) {
            observerRef.current.disconnect();
        }
        observerRef.current = new IntersectionObserver(handleObserver, {
            threshold,
            rootMargin,
        });
        if (targetRef.current) {
            observerRef.current.observe(targetRef.current);
        }
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [handleObserver, threshold, rootMargin]);
    return { targetRef };
}
