import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { GlobalNav } from '../../components/GlobalNav/GlobalNav';
import { useAuth } from '../../context/useAuth';
import { getMembers } from '../../api/members';
import { formatBirthDate, type MemberListItem } from '../../shared';
import styles from './MemberListPage.module.css';

type GenderFilter = 'all' | 'M' | 'F';

function initials(name: string): string {
  return name.slice(-2);
}

export function MemberListPage() {
  const { member } = useAuth();
  const [nameQuery, setNameQuery] = useState('');
  const [gender, setGender] = useState<GenderFilter>('all');
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setIsLoading(true);
      getMembers({
        name: nameQuery.trim() || undefined,
        gender: gender === 'all' ? undefined : gender,
      })
        .then((res) => {
          if (!cancelled) setMembers(res.members);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [nameQuery, gender]);

  // 환자 계정이 URL로 직접 진입한 경우 본인 상세화면으로 이동 (docs/SCREEN_DESIGN.md 2.2)
  if (member?.memberType === 'P') {
    return <Navigate to={`/members/${member.memberId}`} replace />;
  }

  return (
    <div className={styles.page}>
      <GlobalNav />

      <div className={styles.pageHeader}>
        <h1 className={styles.title}>환자 목록</h1>
        <span className={styles.count}>총 {members.length}명</span>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchInput}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="이름으로 검색"
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
          />
        </div>
        <div className={styles.genderFilter}>
          {(['all', 'M', 'F'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={`${styles.chip} ${gender === value ? styles.chipSelected : ''}`}
              onClick={() => setGender(value)}
            >
              {value === 'all' ? '전체' : value === 'M' ? '남' : '여'}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.listHeader}>
        <span />
        <span>이름</span>
        <span>성별</span>
        <span>생년월일</span>
        <span />
      </div>

      {!isLoading && members.length === 0 && (
        <p className={styles.emptyState}>검색 결과가 없습니다.</p>
      )}

      {members.map((patient) => (
        <Link key={patient.memberId} className={styles.patientRow} to={`/members/${patient.memberId}`}>
          <span className={styles.avatar}>
            {initials(patient.name)}
            {patient.hasRecentAlert && <span className={styles.alertDot} title="최근 24시간 내 이상감지" />}
          </span>
          <span className={styles.name}>{patient.name}</span>
          <span className={styles.gender}>{patient.gender === 'M' ? '남' : '여'}</span>
          <span className={styles.birth}>{formatBirthDate(patient.birthDate)}</span>
          <svg className={styles.chevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>
      ))}
    </div>
  );
}
