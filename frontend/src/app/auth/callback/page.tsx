'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authApi, getOAuthRedirectUri } from '@/lib/api';

function CallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const code = params.get('code');
    const state = params.get('state');
    const storedState = sessionStorage.getItem('oauth_state');
    const provider = sessionStorage.getItem('oauth_provider') as 'line' | 'facebook' | null;

    async function exchange() {
      if (!code || !state || !provider) { router.replace('/auth/login'); return; }
      if (state !== storedState) { router.replace('/auth/login?error=state_mismatch'); return; }
      try {
        const { data } = await authApi.exchangeToken(provider, code, getOAuthRedirectUri());
        login(data.access_token);
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_provider');
        const ret = sessionStorage.getItem('oauth_return_path');
        sessionStorage.removeItem('oauth_return_path');
        const path =
          ret && ret.startsWith('/') && !ret.startsWith('//') ? ret : '/concerts';
        router.replace(path);
      } catch {
        router.replace('/auth/login?error=auth_failed');
      }
    }
    exchange();
  }, [params, login, router]);

  return (
    <div style={{
      minHeight: 'calc(100vh - var(--header-height))',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '1rem',
    }}>
      <div className="spinner spinner-lg" />
      <p style={{ color: 'var(--color-text-secondary)' }}>กำลังยืนยันตัวตน…</p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: 'calc(100vh - var(--header-height))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div className="spinner spinner-lg" />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}

