import type { LoginResponse, RefreshResponse } from '../shared';
import { apiClient } from './client';

export async function login(id: string, passwd: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { id, passwd });
  return data;
}

export async function refreshAccessToken(): Promise<RefreshResponse> {
  const { data } = await apiClient.post<RefreshResponse>('/auth/refresh');
  return data;
}
