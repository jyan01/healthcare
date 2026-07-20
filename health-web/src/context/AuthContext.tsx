import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { AuthMember } from '../shared';
import { apiClient, setAccessToken } from '../api/client';
import { login as loginRequest, refreshAccessToken } from '../api/auth';
import { AuthContext } from './authContextInstance';

const MEMBER_STORAGE_KEY = 'health-web:member';

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

function loadStoredMember(): AuthMember | null {
  const raw = sessionStorage.getItem(MEMBER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthMember;
  } catch {
    return null;
  }
}

function storeMember(member: AuthMember | null): void {
  if (member) sessionStorage.setItem(MEMBER_STORAGE_KEY, JSON.stringify(member));
  else sessionStorage.removeItem(MEMBER_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<AuthMember | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const id = apiClient.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const original = error.config as RetriableRequestConfig | undefined;
        const isRefreshCall = original?.url === '/auth/refresh';
        if (error.response?.status === 401 && original && !original._retry && !isRefreshCall) {
          original._retry = true;
          try {
            const { accessToken } = await refreshAccessToken();
            setAccessToken(accessToken);
            return apiClient(original);
          } catch {
            setAccessToken(null);
            storeMember(null);
            setMember(null);
          }
        }
        return Promise.reject(error);
      },
    );
    return () => apiClient.interceptors.response.eject(id);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { accessToken } = await refreshAccessToken();
        setAccessToken(accessToken);
        setMember(loadStoredMember());
      } catch {
        setAccessToken(null);
        storeMember(null);
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  async function login(id: string, passwd: string): Promise<AuthMember> {
    const response = await loginRequest(id, passwd);
    setAccessToken(response.accessToken);
    storeMember(response.member);
    setMember(response.member);
    return response.member;
  }

  function logout(): void {
    setAccessToken(null);
    storeMember(null);
    setMember(null);
  }

  return (
    <AuthContext.Provider value={{ member, isReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
