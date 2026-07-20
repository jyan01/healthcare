import type { MemberDetailResponse, MembersListResponse } from '../shared';
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
