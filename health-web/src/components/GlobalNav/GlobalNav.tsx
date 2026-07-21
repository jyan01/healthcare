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
          AI 상담
        </Link>
      )}
    </div>
  );
}
