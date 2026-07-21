// 백엔드(health-backend)·웹(health-web)·앱(health-mobile)이 공유하는 타입/상수/판정 함수.
// health-ai(Python)는 제외. 실제 DB 스키마 값 기준(docs/table.sql, docs/insert.sql)으로 맞춰져 있음.

/** 회원유형: D=의사, P=환자 (member.member_type 실제 컬럼값 기준) */
export type MemberType = 'D' | 'P';

/** health-backend가 발급하는 AccessToken/RefreshToken의 JWT Payload */
export interface JwtPayload {
  userId: string;
  name: string;
  apiKey: string;
}

/** 심박/혈압 등 백엔드가 저장 시점에 판정하는 상태값 */
export type VitalStatus = '정상' | '주의' | '이상';

/** 혈당 상태값 — 외부 시뮬레이터가 내려주는 값을 그대로 사용 (docs/DATA_MODEL.md 참고) */
export type GlucoseStatus = 'normal' | 'elevated' | 'high';

/** 체중/BMI 상태값 */
export type BodyWeightStatus = '저체중' | '정상' | '과체중' | '비만';

export interface MemberSummary {
  memberId: string;
  name: string;
  gender: 'M' | 'F';
  birthDate: string; // YYYYMMDD
}

export interface DiseaseSummary {
  diseaseId: string;
  nameKr: string;
  /** 진단 시 기록된 메모(member_disease.diag_content). 기록 없으면 null */
  diagContent: string | null;
  /** 진단일시(ISO 8601). 기록 없으면 null */
  diagDate: string | null;
}

export interface HeartRateRecord {
  memberId: string;
  heartRate: number;
  status: VitalStatus;
  remark?: string | null;
  measuredAt: string;
}

export interface BloodPressureRecord {
  memberId: string;
  systolic: number;
  diastolic: number;
  status: VitalStatus;
  measuredAt: string;
}

export interface BodyWeightRecord {
  memberId: string;
  weightKg: number;
  bmi: number;
  skeletalMuscleMassKg?: number | null;
  bodyFatPercentage?: number | null;
  status: BodyWeightStatus;
  measuredAt: string;
}

export interface GlucoseRecord {
  memberId: string;
  glucoseValue: number;
  status: GlucoseStatus;
  measuredAt: string;
}

export interface StepCountRecord {
  memberId: string;
  totalSteps: number;
  measuredAt: string;
}

/** 수면 품질 — 외부 시뮬레이터가 내려주는 값을 그대로 사용 (docs/DATA_MODEL.md 참고) */
export type SleepQuality = 'good' | 'fair' | 'poor';

export interface SleepRecord {
  memberId: string;
  sleepHours: number;
  quality: SleepQuality;
  bedTime: string;
  wakeTime: string;
  measuredAt: string;
}

/** 로그인/토큰 재발급 시점의 회원 정보 (POST /auth/login 응답) */
export interface AuthMember {
  memberId: string;
  name: string;
  gender: 'M' | 'F';
  birthDate: string;
  memberType: MemberType;
  diseases: DiseaseSummary[];
}

export interface LoginResponse {
  accessToken: string;
  member: AuthMember;
}

export interface RefreshResponse {
  accessToken: string;
}

/** GET /members 목록 항목 — hasRecentAlert는 최근 24시간 내 이상감지(심박/혈압/혈당) 여부 */
export interface MemberListItem extends MemberSummary {
  hasRecentAlert: boolean;
}

export interface MembersListResponse {
  members: MemberListItem[];
}

/** GET /members/:memberId 응답의 회원 기본정보 (memberType 없음 — AuthMember와 구분) */
export interface MemberDetail extends MemberSummary {
  diseases: DiseaseSummary[];
}

// GET /members/:memberId(recentHealthData), /members/:memberId/health-data 응답 항목.
// WebSocket(/health)으로 push되는 *Record와 달리 memberId 필드가 없다 (이미 특정 회원으로 스코프됨).
export type HeartRateHistoryItem = Omit<HeartRateRecord, 'memberId'>;
export type BloodPressureHistoryItem = Omit<BloodPressureRecord, 'memberId'>;
export type BodyWeightHistoryItem = Omit<BodyWeightRecord, 'memberId'>;
export type GlucoseHistoryItem = Omit<GlucoseRecord, 'memberId'>;
export type StepCountHistoryItem = Omit<StepCountRecord, 'memberId'>;
export type SleepHistoryItem = Omit<SleepRecord, 'memberId'>;

export interface HealthDataHistory {
  heartRate: HeartRateHistoryItem[];
  bloodPressure: BloodPressureHistoryItem[];
  bodyWeight: BodyWeightHistoryItem[];
  glucose: GlucoseHistoryItem[];
  stepCount: StepCountHistoryItem[];
  sleep: SleepHistoryItem[];
}

export interface MemberDetailResponse {
  member: MemberDetail;
  recentHealthData: HealthDataHistory;
}

/** health-backend가 프론트엔드로 push하는 WebSocket(/health) 이벤트명 */
export const HEALTH_WS_EVENT = {
  HEART_RATE: 'heartRate',
  BLOOD_PRESSURE: 'bloodPressure',
  BODY_WEIGHT: 'bodyWeight',
  GLUCOSE: 'glucose',
  STEP_COUNT: 'stepCount',
  SLEEP: 'sleep',
} as const;

/**
 * 혈압 상태 판정 — 외부 시뮬레이터 이벤트에는 상태 필드가 없으므로 백엔드가 수축기/이완기 값으로 직접 판정한다.
 * 기준: 수축기 140↑ 또는 이완기 90↑ = 이상, 130↑/85↑ = 주의, 그 외 정상.
 */
export function judgeBloodPressureStatus(systolic: number, diastolic: number): VitalStatus {
  if (systolic >= 140 || diastolic >= 90) return '이상';
  if (systolic >= 130 || diastolic >= 85) return '주의';
  return '정상';
}

/**
 * 체중 상태 판정 — WHO 아시아·태평양 기준 BMI 구간.
 */
export function judgeBodyWeightStatus(bmi: number): BodyWeightStatus {
  if (bmi < 18.5) return '저체중';
  if (bmi < 23) return '정상';
  if (bmi < 25) return '과체중';
  return '비만';
}

/** 심박 이상 여부 — 시뮬레이터가 내려준 source가 abnormal_event인지로 판정 (docs/DATA_MODEL.md 참고) */
export function judgeHeartRateStatus(source: 'simulation' | 'abnormal_event'): VitalStatus {
  return source === 'abnormal_event' ? '이상' : '정상';
}

/** Slack 알림(ALM) 대상 여부 판정 — docs/health-backend/API_SPEC.md 7장 기준 */
export function isAlertTarget(
  metric: 'heartRate' | 'bloodPressure' | 'glucose',
  status: VitalStatus | GlucoseStatus,
): boolean {
  if (metric === 'glucose') return status === 'high';
  return status === '이상';
}
