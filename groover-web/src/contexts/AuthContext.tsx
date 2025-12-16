// src/contexts/AuthContext.tsx
'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { setAccessToken, getAccessToken } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  profileImageUrl?: string;
  role?: 'USER' | 'CREATOR' | 'ADVERTISER' | 'ADMIN' | 'SUPER_ADMIN';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (loginData: { email?: string; userId?: string; password: string }) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const refreshUser = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) {
      try {
        const response = await api.get('/auth/me');
        setUser(response.data.data);
      } catch (error) {
        setAccessToken(null);
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    // 이미 초기화되었으면 스킵
    if (initialized) return;

    const initAuth = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      
      if (token) {
        try {
          const response = await api.get('/auth/me');
          setUser(response.data.data);
        } catch (error) {
          setAccessToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
      setInitialized(true);
    };
    
    initAuth();
  }, [initialized]);

  const login = useCallback(async (loginData: { email?: string; userId?: string; password: string }) => {
    const response = await api.post('/auth/login', loginData);
    const { user, accessToken } = response.data.data;
    setAccessToken(accessToken);
    setUser(user);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const response = await api.post('/auth/register', { email, password, name });
    return response.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // 에러 무시
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  const logoutAll = useCallback(async () => {
    try {
      await api.post('/auth/logout-all');
    } catch (error) {
      // 에러 무시
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  // 토큰이 있으면 일단 인증된 것으로 간주 (로딩 중일 때)
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('accessToken');
  const isAuthenticated = !!user || (isLoading && hasToken);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        register,
        logout,
        logoutAll,
        refreshUser,
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