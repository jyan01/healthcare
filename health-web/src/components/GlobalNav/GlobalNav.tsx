import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import styles from './GlobalNav.module.css';

export function GlobalNav() {
  const { member } = useAuth();
  const { pathname } = useLocation();

  return (
    <div className={styles.nav}>
      HEALTH ADMIN — WEB
      {member && pathname !== '/chat' && (
        <Link className={styles.link} to="/chat">
          <svg className={styles.linkIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          AI 상담
        </Link>
      )}
    </div>
  );
}
