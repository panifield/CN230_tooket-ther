'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Header.module.css';

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>♪</span>
          <span className="gold-gradient-text">TOOKET-THER</span>
        </Link>

        <nav className={styles.nav}>
          <Link href="/concerts" className={styles.navLink}>คอนเสิร์ต</Link>
          {isAuthenticated && (
            <Link href="/profile" className={styles.navLink}>ตั๋วของฉัน</Link>
          )}
        </nav>

        <div className={styles.actions}>
          {isAuthenticated ? (
            <>
              <span className={styles.username}>{user?.display_name}</span>
              <button onClick={logout} className="btn btn-ghost btn-sm">ออกจากระบบ</button>
            </>
          ) : (
            <Link href="/auth/login" className="btn btn-primary btn-sm">เข้าสู่ระบบ</Link>
          )}
        </div>
      </div>
    </header>
  );
}
