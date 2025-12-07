'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { getAccessToken } from '@/lib/api';

export function useSocket() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    console.log('useSocket 시작:', { isLoading, isAuthenticated });
    
    if (isLoading || !isAuthenticated) {
      console.log('소켓 연결 스킵');
      return;
    }

    const token = getAccessToken();
    console.log('토큰:', token ? '있음' : '없음');
    
    if (!token) return;

    console.log('소켓 연결 시도...');
    
    const socket = io('http://localhost:3000/dm', {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('✅ 소켓 연결됨:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ 소켓 연결 해제:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('소켓 연결 에러:', error.message);
    });

    socketRef.current = socket;

    return () => {
      console.log('소켓 정리');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, isLoading]);

  const joinThread = useCallback((threadId: string) => {
    socketRef.current?.emit('join_thread', { threadId });
  }, []);

  const leaveThread = useCallback((threadId: string) => {
    socketRef.current?.emit('leave_thread', { threadId });
  }, []);

  const sendMessage = useCallback((threadId: string, content: string) => {
    return new Promise((resolve, reject) => {
      socketRef.current?.emit(
        'send_message',
        { threadId, message: { content } },
        (response: any) => {
          if (response?.success) {
            resolve(response.data);
          } else {
            reject(new Error(response?.error || '전송 실패'));
          }
        }
      );
    });
  }, []);

  const markAsRead = useCallback((threadId: string) => {
    socketRef.current?.emit('mark_read', { threadId });
  }, []);

  const setTyping = useCallback((threadId: string, isTyping: boolean) => {
    socketRef.current?.emit('typing', { threadId, isTyping });
  }, []);

  const on = useCallback((event: string, callback: (data: any) => void) => {
    socketRef.current?.on(event, callback);
    return () => {
      socketRef.current?.off(event, callback);
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    joinThread,
    leaveThread,
    sendMessage,
    markAsRead,
    setTyping,
    on,
  };
}