// 백엔드(health-backend)·웹(health-web)·앱(health-mobile)이 공유하는 순수 로직.
// health-ai(Python)는 제외. 타입은 shared/types.ts를 참고.

import type { BodyWeightStatus, GlucoseStatus, VitalStatus } from './types';

/** 상태 배지 표시 색상 단계 (정상/주의/위험) */
export type BadgeLevel = 'good' | 'warning' | 'critical';

export function vitalStatusToBadgeLevel(status: VitalStatus): BadgeLevel {
  if (status === '이상') return 'critical';
  if (status === '주의') return 'warning';
  return 'good';
}

export function glucoseStatusToBadgeLevel(status: GlucoseStatus): BadgeLevel {
  if (status === 'high') return 'critical';
  if (status === 'elevated') return 'warning';
  return 'good';
}

export function bodyWeightStatusToBadgeLevel(status: BodyWeightStatus): BadgeLevel {
  if (status === '비만') return 'critical';
  if (status === '과체중' || status === '저체중') return 'warning';
  return 'good';
}

/** DB의 YYYYMMDD 형식 생년월일을 "YYYY-MM-DD"로 변환 (형식이 다르면 원본 그대로 반환) */
export function formatBirthDate(birthDate: string): string {
  if (!/^\d{8}$/.test(birthDate)) return birthDate;
  return `${birthDate.slice(0, 4)}-${birthDate.slice(4, 6)}-${birthDate.slice(6, 8)}`;
}
