// health-backend가 SIMULATOR_API_SPEC.md 이벤트를 수신할 때 쓰는 페이로드 형태.

export interface SimulatorHeartRateEvent {
  timestamp: string;
  userId: string;
  heartRate: number;
  source: 'simulation' | 'abnormal_event';
  note?: string;
}

export interface SimulatorBloodPressureEvent {
  timestamp: string;
  userId: string;
  systolic: number;
  diastolic: number;
  source: string;
}

export interface SimulatorWeightEvent {
  timestamp: string;
  userId: string;
  weightKg: number;
  bmi: number;
  skeletalMuscleMassKg: number;
  bodyFatPercentage: number;
  source: string;
}

export interface SimulatorGlucoseEvent {
  timestamp: string;
  userId: string;
  glucoseMgDl: number;
  status: 'normal' | 'elevated' | 'high';
  source: string;
}

export interface SimulatorStepCountEvent {
  timestamp: string;
  userId: string;
  stepCount: number;
  dailyReset: boolean;
}
