// src/contexts/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { setAccessToken, getAccessToken } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  profileImageUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 초기 로드 - 저장된 토큰으로 사용자 정보 가져오기
  useEffect(() => {
    const initAuth = async () => {
      const token = getAccessToken();
      if (token) {
        try {
          const response = await api.get('/auth/me');
          setUser(response.data.data);
        } catch (error) {
          // 토큰 만료 시 자동으로 갱신 시도 (인터셉터에서 처리)
          setAccessToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // 로그인
  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { user, accessToken } = response.data.data;
    
    setAccessToken(accessToken);
    setUser(user);
  }, []);

  // 회원가입
  const register = useCallback(async (email: string, password: string, name: string) => {
    const response = await api.post('/auth/register', { email, password, name });
    const { user, accessToken } = response.data.data;
    
    setAccessToken(accessToken);
    setUser(user);
  }, []);

  // 로그아웃
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // 에러 무시 (이미 로그아웃된 상태일 수 있음)
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  // 모든 기기에서 로그아웃
  const logoutAll = useCallback(async () => {
    try {
      await api.post('/auth/logout-all');
    } catch (error) {
      // 에러 무시
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        logoutAll,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
