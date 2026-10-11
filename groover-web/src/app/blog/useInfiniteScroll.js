'use client';
import { useEffect, useRef, useCallback } from 'react';
export function useInfiniteScroll({ onLoadMore, hasMore, isLoading, threshold = 0.1, rootMargin = '100px', }) {
    const targetRef = useRef(null);
    const handleObserver = useCallback((entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoading) {
            onLoadMore();
        }
    }, [onLoadMore, hasMore, isLoading]);
    useEffect(() => {
        const target = targetRef.current;
        if (!target)
            return;
        const observer = new IntersectionObserver(handleObserver, {
            threshold,
            rootMargin,
        });
        observer.observe(target);
        return () => {
            observer.disconnect();
        };
    }, [handleObserver, threshold, rootMargin]);
    return { targetRef };
}
