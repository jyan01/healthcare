import type { HealthDataHistory, MemberDetailResponse, MembersListResponse } from '../shared';
import { apiClient } from './client';

export interface MembersQuery {
  name?: string;
  gender?: 'M' | 'F';
}

export async function getMembers(query: MembersQuery = {}): Promise<MembersListResponse> {
  const { data } = await apiClient.get<MembersListResponse>('/members', { params: query });
  return data;
}

export async function getMemberDetail(memberId: string): Promise<MemberDetailResponse> {
  const { data } = await apiClient.get<MemberDetailResponse>(`/members/${memberId}`);
  return data;
}

export async function getMemberAiSummary(memberId: string): Promise<string> {
  const { data } = await apiClient.get<{ summary: string }>(`/members/${memberId}/ai-summary`);
  return data.summary;
}

export async function getMemberHealthDataByPeriod(
  memberId: string,
  startAt: string,
  endAt: string,
): Promise<HealthDataHistory> {
  const { data } = await apiClient.get<HealthDataHistory>(`/members/${memberId}/health-data`, {
    params: { startAt, endAt },
  });
  return data;
}
