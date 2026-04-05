'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authApi, getOAuthRedirectUri } from '@/lib/api';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [isGettingUrl, setIsGettingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search).get('next');
    if (q && q.startsWith('/') && !q.startsWith('//')) {
      sessionStorage.setItem('oauth_return_path', q);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const ret = sessionStorage.getItem('oauth_return_path');
      sessionStorage.removeItem('oauth_return_path');
      const path =
        ret && ret.startsWith('/') && !ret.startsWith('//') ? ret : '/concerts';
      router.replace(path);
    }
  }, [isAuthenticated, isLoading, router]);

  async function handleLogin(provider: 'line' | 'facebook') {
    setIsGettingUrl(provider);
    setError(null);
    try {
      const state = crypto.randomUUID();
      sessionStorage.setItem('oauth_state', state);
      sessionStorage.setItem('oauth_provider', provider);

      const { data } = await authApi.getAuthorizeUrl(provider, state, getOAuthRedirectUri());
      window.location.href = data.authorization_url;
    } catch {
      setError('ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่');
      setIsGettingUrl(null);
    }
  }

  if (isLoading) return null;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoGlyph}>♪</span>
          <h1 className="gold-gradient-text">TOOKET-THER</h1>
        </div>

        <hr className="divider" style={{ margin: 'var(--space-6) 0' }} />

        <h2 className={styles.title}>เข้าสู่ระบบ</h2>
        <p className={styles.subtitle}>
          เลือกบัญชีที่ต้องการใช้งาน
        </p>

        <div className={styles.providers}>
          <button
            className={`btn btn-line ${styles.providerBtn}`}
            onClick={() => handleLogin('line')}
            disabled={!!isGettingUrl}
          >
            {isGettingUrl === 'line'
              ? <><span className="spinner spinner-sm" /> กำลังเชื่อมต่อ…</>
              : <><span className={styles.providerIcon}>L</span> เข้าสู่ระบบด้วย LINE</>
            }
          </button>

          <button
            className={`btn btn-facebook ${styles.providerBtn}`}
            onClick={() => handleLogin('facebook')}
            disabled={!!isGettingUrl}
          >
            {isGettingUrl === 'facebook'
              ? <><span className="spinner spinner-sm" /> กำลังเชื่อมต่อ…</>
              : <><span className={styles.providerIcon}>f</span> เข้าสู่ระบบด้วย Facebook</>
            }
          </button>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <p className={styles.footnote}>
          การเข้าสู่ระบบถือว่าคุณยอมรับ{' '}
          <a href="#">นโยบายความเป็นส่วนตัว</a>
        </p>
      </div>

      <div className={styles.bg} aria-hidden />
    </div>
  );
}
