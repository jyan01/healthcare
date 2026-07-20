import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { GlobalNav } from '../../components/GlobalNav/GlobalNav';
import { useAuth } from '../../context/useAuth';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const { member, isReady, login } = useAuth();
  const navigate = useNavigate();
  const [id, setId] = useState('');
  const [passwd, setPasswd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isReady && member) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(id, passwd);
      navigate('/', { replace: true });
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        setError('아이디 또는 암호가 올바르지 않습니다.');
      } else {
        setError('로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <GlobalNav />

      <div className={styles.layout}>
        <section className={styles.brandPanel}>
          <div className={styles.mark} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s-7.5-4.6-9.6-9.1C.8 8.1 2.3 4.8 5.6 4.1c2-.4 3.8.5 5 2.1.9-1.6 2.8-2.5 4.8-2.1 3.3.7 4.8 4 3.2 7.8C16.5 16.4 12 21 12 21z" />
            </svg>
          </div>
          <h2>헬스케어 관리 시스템</h2>
          <p>의사와 환자를 위한 실시간 건강정보 관리 플랫폼입니다.</p>
        </section>

        <section className={styles.formPanel}>
          <div className={styles.loginStack}>
            <h1 className={styles.title}>관리자 로그인</h1>
            <p className={styles.subtitle}>의사 · 환자 계정으로 로그인하세요</p>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.field}>
                <label htmlFor="username">아이디</label>
                <input
                  id="username"
                  type="text"
                  placeholder="아이디를 입력하세요"
                  autoComplete="username"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  required
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="password">암호</label>
                <input
                  id="password"
                  type="password"
                  placeholder="암호를 입력하세요"
                  autoComplete="current-password"
                  value={passwd}
                  onChange={(e) => setPasswd(e.target.value)}
                  required
                />
              </div>

              {error && <p className={styles.errorMessage}>{error}</p>}

              <button className={styles.loginButton} type="submit" disabled={isSubmitting}>
                {isSubmitting ? '로그인 중…' : '로그인'}
              </button>
            </form>

            <p className={styles.signupRow}>
              계정이 없으신가요? <a href="#signup">가입하기</a>
            </p>
          </div>
        </section>
      </div>

      <footer className={styles.footer}>&copy; 2026 Health Admin. All rights reserved.</footer>
    </div>
  );
}
