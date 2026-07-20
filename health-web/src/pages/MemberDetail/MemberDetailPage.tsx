import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { GlobalNav } from '../../components/GlobalNav/GlobalNav';
import { CHART_WINDOW, MetricCard } from '../../components/MetricCard/MetricCard';
import type { MetricPoint } from '../../components/MetricCard/MetricCard';
import { useAuth } from '../../context/useAuth';
import { getAccessToken } from '../../api/client';
import { getMemberDetail } from '../../api/members';
import { connectHealthSocket, subscribeToMember } from '../../realtime/healthSocket';
import type { HealthSocket } from '../../realtime/healthSocket';
import { formatBirthDate, glucoseStatusToBadgeLevel, vitalStatusToBadgeLevel } from '../../shared';
import type { GlucoseStatus, MemberDetail as MemberDetailInfo, VitalStatus } from '../../shared';
import styles from './MemberDetailPage.module.css';

const PRIMARY = '#0066cc';
const SERIES_2 = '#e34948';

interface MetricsState {
  heartRate: MetricPoint[];
  bloodPressure: MetricPoint[];
  glucose: MetricPoint[];
  weight: MetricPoint[];
  bmi: MetricPoint[];
  muscle: MetricPoint[];
  fat: MetricPoint[];
}

const EMPTY_METRICS: MetricsState = {
  heartRate: [],
  bloodPressure: [],
  glucose: [],
  weight: [],
  bmi: [],
  muscle: [],
  fat: [],
};

function heartRateBadge(status: VitalStatus) {
  return { level: vitalStatusToBadgeLevel(status), text: status === '이상' ? '이상감지' : status };
}

function bloodPressureBadge(status: VitalStatus) {
  return { level: vitalStatusToBadgeLevel(status), text: status === '이상' ? '높음' : status };
}

function glucoseBadge(status: GlucoseStatus) {
  const text = status === 'high' ? '높음' : status === 'elevated' ? '주의' : '정상';
  return { level: glucoseStatusToBadgeLevel(status), text };
}

function initials(name: string): string {
  return name.slice(-2);
}

function appendAndTrim(points: MetricPoint[], point: MetricPoint): MetricPoint[] {
  return [...points, point].slice(-CHART_WINDOW);
}

export function MemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const { member } = useAuth();

  if (!memberId) return <Navigate to="/" replace />;
  if (member?.memberType === 'P' && member.memberId !== memberId) {
    return <Navigate to={`/members/${member.memberId}`} replace />;
  }

  // memberId별로 새로 마운트해 상태를 초기화한다 (수동 setState 리셋 대신 key를 이용한 리마운트).
  return <MemberDetailView key={memberId} memberId={memberId} isDoctor={member?.memberType === 'D'} />;
}

function MemberDetailView({ memberId, isDoctor }: { memberId: string; isDoctor: boolean }) {
  const [detail, setDetail] = useState<MemberDetailInfo | null>(null);
  const [metrics, setMetrics] = useState<MetricsState>(EMPTY_METRICS);
  const [heartRateStatus, setHeartRateStatus] = useState<VitalStatus | null>(null);
  const [bloodPressureStatus, setBloodPressureStatus] = useState<VitalStatus | null>(null);
  const [glucoseStatus, setGlucoseStatus] = useState<GlucoseStatus | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // REST 최초 로드가 끝난 memberId만 기록 — WS 구독 전환(§5.3)이 REST 완료 이후에만 일어나도록 보장한다.
  const [readyMemberId, setReadyMemberId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getMemberDetail(memberId)
      .then((res) => {
        if (cancelled) return;
        setDetail(res.member);

        const { recentHealthData } = res;
        setMetrics({
          heartRate: recentHealthData.heartRate.map((r) => ({ measuredAt: r.measuredAt, values: [r.heartRate] })),
          bloodPressure: recentHealthData.bloodPressure.map((r) => ({
            measuredAt: r.measuredAt,
            values: [r.systolic, r.diastolic],
          })),
          glucose: recentHealthData.glucose.map((r) => ({ measuredAt: r.measuredAt, values: [r.glucoseValue] })),
          weight: recentHealthData.bodyWeight.map((r) => ({ measuredAt: r.measuredAt, values: [r.weightKg] })),
          bmi: recentHealthData.bodyWeight.map((r) => ({ measuredAt: r.measuredAt, values: [r.bmi] })),
          muscle: recentHealthData.bodyWeight
            .filter((r) => r.skeletalMuscleMassKg != null)
            .map((r) => ({ measuredAt: r.measuredAt, values: [r.skeletalMuscleMassKg as number] })),
          fat: recentHealthData.bodyWeight
            .filter((r) => r.bodyFatPercentage != null)
            .map((r) => ({ measuredAt: r.measuredAt, values: [r.bodyFatPercentage as number] })),
        });

        const lastHeartRate = recentHealthData.heartRate.at(-1);
        if (lastHeartRate) setHeartRateStatus(lastHeartRate.status);
        const lastBloodPressure = recentHealthData.bloodPressure.at(-1);
        if (lastBloodPressure) setBloodPressureStatus(lastBloodPressure.status);
        const lastGlucose = recentHealthData.glucose.at(-1);
        if (lastGlucose) setGlucoseStatus(lastGlucose.status);

        setReadyMemberId(memberId);
      })
      .catch(() => {
        if (!cancelled) setError('환자 정보를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [memberId]);

  useEffect(() => {
    if (!memberId || readyMemberId !== memberId) return;
    const accessToken = getAccessToken();
    if (!accessToken) return;

    const socket: HealthSocket = connectHealthSocket(accessToken);

    socket.on('connect', () => {
      subscribeToMember(socket, memberId);
      setIsLive(true);
    });
    socket.on('disconnect', () => setIsLive(false));

    socket.on('heartRate', (record) => {
      if (record.memberId !== memberId) return;
      setMetrics((prev) => ({
        ...prev,
        heartRate: appendAndTrim(prev.heartRate, { measuredAt: record.measuredAt, values: [record.heartRate] }),
      }));
      setHeartRateStatus(record.status);
    });

    socket.on('bloodPressure', (record) => {
      if (record.memberId !== memberId) return;
      setMetrics((prev) => ({
        ...prev,
        bloodPressure: appendAndTrim(prev.bloodPressure, {
          measuredAt: record.measuredAt,
          values: [record.systolic, record.diastolic],
        }),
      }));
      setBloodPressureStatus(record.status);
    });

    socket.on('glucose', (record) => {
      if (record.memberId !== memberId) return;
      setMetrics((prev) => ({
        ...prev,
        glucose: appendAndTrim(prev.glucose, { measuredAt: record.measuredAt, values: [record.glucoseValue] }),
      }));
      setGlucoseStatus(record.status);
    });

    socket.on('bodyWeight', (record) => {
      if (record.memberId !== memberId) return;
      setMetrics((prev) => ({
        ...prev,
        weight: appendAndTrim(prev.weight, { measuredAt: record.measuredAt, values: [record.weightKg] }),
        bmi: appendAndTrim(prev.bmi, { measuredAt: record.measuredAt, values: [record.bmi] }),
        muscle:
          record.skeletalMuscleMassKg == null
            ? prev.muscle
            : appendAndTrim(prev.muscle, {
                measuredAt: record.measuredAt,
                values: [record.skeletalMuscleMassKg],
              }),
        fat:
          record.bodyFatPercentage == null
            ? prev.fat
            : appendAndTrim(prev.fat, { measuredAt: record.measuredAt, values: [record.bodyFatPercentage] }),
      }));
    });

    return () => {
      setIsLive(false);
      socket.disconnect();
    };
  }, [memberId, readyMemberId]);

  return (
    <div className={styles.page}>
      <GlobalNav />
      <div className={styles.content}>
        {isDoctor && (
          <Link className={styles.backLink} to="/members">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            환자 목록으로
          </Link>
        )}

        {isLoading && <p className={styles.stateMessage}>불러오는 중…</p>}
        {error && <p className={styles.stateMessage}>{error}</p>}

        {detail && (
          <>
            <div className={styles.profileCard}>
              <div className={styles.avatar}>{initials(detail.name)}</div>
              <div className={styles.profileInfo}>
                <h1>{detail.name}</h1>
                <div className={styles.profileMeta}>
                  <span>{detail.gender === 'M' ? '남' : '여'}</span>
                  <span>{formatBirthDate(detail.birthDate)}</span>
                </div>
              </div>
              <div className={`${styles.liveIndicator} ${isLive ? '' : styles.liveIndicatorOffline}`}>
                <span className={styles.liveDot} />
                {isLive ? '실시간 수신 중' : '연결 중…'}
              </div>
            </div>

            <h2 className={styles.sectionTitle}>실시간 건강정보</h2>
            <div className={styles.metricsGrid}>
              <MetricCard
                label="심박수"
                unit="bpm"
                decimals={0}
                series={[{ color: PRIMARY }]}
                points={metrics.heartRate}
                badge={heartRateStatus ? heartRateBadge(heartRateStatus) : undefined}
              />
              <MetricCard
                label="혈압"
                unit="mmHg"
                decimals={0}
                series={[
                  { color: PRIMARY, label: '수축기' },
                  { color: SERIES_2, label: '이완기' },
                ]}
                points={metrics.bloodPressure}
                badge={bloodPressureStatus ? bloodPressureBadge(bloodPressureStatus) : undefined}
              />
              <MetricCard
                label="혈당"
                unit="mg/dL"
                decimals={0}
                series={[{ color: PRIMARY }]}
                points={metrics.glucose}
                badge={glucoseStatus ? glucoseBadge(glucoseStatus) : undefined}
              />
              <MetricCard label="체중" unit="kg" decimals={1} series={[{ color: PRIMARY }]} points={metrics.weight} />
              <MetricCard label="BMI" unit="" decimals={1} series={[{ color: PRIMARY }]} points={metrics.bmi} />
              <MetricCard
                label="골격근량"
                unit="kg"
                decimals={1}
                series={[{ color: PRIMARY }]}
                points={metrics.muscle}
              />
              <MetricCard label="체지방률" unit="%" decimals={1} series={[{ color: PRIMARY }]} points={metrics.fat} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
