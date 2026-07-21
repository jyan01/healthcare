import { io, Socket } from 'socket.io-client';
import type {
  BloodPressureRecord,
  BodyWeightRecord,
  GlucoseRecord,
  HeartRateRecord,
  SleepRecord,
  StepCountRecord,
} from '../shared';

interface HealthServerToClientEvents {
  heartRate: (record: HeartRateRecord) => void;
  bloodPressure: (record: BloodPressureRecord) => void;
  bodyWeight: (record: BodyWeightRecord) => void;
  glucose: (record: GlucoseRecord) => void;
  stepCount: (record: StepCountRecord) => void;
  sleep: (record: SleepRecord) => void;
  error: (payload: { code: string }) => void;
}

interface HealthClientToServerEvents {
  subscribe: (payload: { memberId: string }) => void;
  ping: (payload: { ts: number }) => void;
}

export type HealthSocket = Socket<HealthServerToClientEvents, HealthClientToServerEvents>;

/** REST 최초 로드 직후 호출해 실시간 구독으로 전환한다 (health-web/docs/ARCHITECTURE.md §5.3) */
export function connectHealthSocket(accessToken: string): HealthSocket {
  return io(`${import.meta.env.VITE_WS_URL}/health`, {
    transports: ['websocket'],
    auth: { token: accessToken },
  });
}

export function subscribeToMember(socket: HealthSocket, memberId: string): void {
  socket.emit('subscribe', { memberId });
}
