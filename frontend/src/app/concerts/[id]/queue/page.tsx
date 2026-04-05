'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ADMISSION_STORAGE_KEY,
  concertApi,
  queueApi,
  type ConcertDetail,
  type QueueStatus,
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

const POLL_MS = 2000;

/** ประมาณการเวลารอแบบง่าย (วินาที) — ปรับได้ตามนโยบาย */
function estimateSeconds(position: number, total: number): number {
  const ahead = Math.max(0, position);
  const density = total > 0 ? Math.min(1, ahead / total) : 0.5;
  const base = 12 + ahead * 10;
  return Math.round(base * (0.7 + density * 0.5));
}

function formatEta(sec: number): string {
  if (sec < 60) return `~${sec} วินาที`;
  const m = Math.ceil(sec / 60);
  return `~${m} นาที`;
}

export default function ConcertQueuePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [concert, setConcert] = useState<ConcertDetail | null>(null);
  const [concertErr, setConcertErr] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [joining, setJoining] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const admitCalled = useRef(false);
  const positionKey = useRef(0);

  const loadConcert = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await concertApi.get(id);
      setConcert(data);
      setConcertErr(null);
    } catch {
      setConcertErr('โหลดข้อมูลคอนเสิร์ตไม่สำเร็จ');
    }
  }, [id]);

  useEffect(() => {
    loadConcert();
  }, [loadConcert]);

  const fetchStatus = useCallback(async () => {
    if (!id || !isAuthenticated) return;
    try {
      const { data } = await queueApi.status(id);
      setQueueStatus(data);
      setActionError(null);
    } catch {
      setActionError('เชื่อมต่อสถานะคิวไม่ได้');
    }
  }, [id, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !id) return;
    fetchStatus();
    const t = setInterval(fetchStatus, POLL_MS);
    return () => clearInterval(t);
  }, [isAuthenticated, id, fetchStatus]);

  useEffect(() => {
    if (!queueStatus || !id) return;
    if (queueStatus.status === 'admitted') {
      router.replace(`/concerts/${id}/seats`);
      return;
    }
    if (
      queueStatus.in_queue &&
      queueStatus.position === 0 &&
      !admitCalled.current
    ) {
      admitCalled.current = true;
      queueApi
        .admit(id)
        .then(({ data }) => {
          sessionStorage.setItem(ADMISSION_STORAGE_KEY(id), data.admission_token);
          router.replace(`/concerts/${id}/seats`);
        })
        .catch((err: { response?: { data?: { detail?: string } } }) => {
          admitCalled.current = false;
          const d = err?.response?.data?.detail;
          setActionError(typeof d === 'string' ? d : 'รับสิทธิ์เข้าจองไม่สำเร็จ');
        });
    }
  }, [queueStatus, id, router]);

  async function handleJoin() {
    if (!id) return;
    setJoining(true);
    setActionError(null);
    admitCalled.current = false;
    try {
      await queueApi.join(id);
      await fetchStatus();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string } } };
      const d = ax?.response?.data?.detail;
      setActionError(typeof d === 'string' ? d : 'เข้าคิวไม่สำเร็จ — อาจยังไม่ถึงเวลาขายหรือมีคิวอยู่แล้ว');
    } finally {
      setJoining(false);
    }
  }

  const positionDisplay = queueStatus?.position;
  useEffect(() => {
    if (typeof positionDisplay === 'number') positionKey.current += 1;
  }, [positionDisplay]);

  const etaText = useMemo(() => {
    if (
      !queueStatus?.in_queue ||
      queueStatus.position == null ||
      queueStatus.total == null
    ) {
      return null;
    }
    const sec = estimateSeconds(queueStatus.position, queueStatus.total);
    return formatEta(sec);
  }, [queueStatus]);

  const progressPct = useMemo(() => {
    if (
      !queueStatus?.in_queue ||
      queueStatus.position == null ||
      queueStatus.total == null ||
      queueStatus.total <= 0
    ) {
      return 0;
    }
    const p = 1 - queueStatus.position / queueStatus.total;
    return Math.min(100, Math.max(0, p * 100));
  }, [queueStatus]);

  if (authLoading) {
    return (
      <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const next = `/concerts/${id}/queue`;
    return (
      <div className={`container ${styles.page}`}>
        <div className={styles.panel}>
          <h1 className={styles.title}>ห้องรอคิว</h1>
          <p className={styles.sub}>เข้าสู่ระบบก่อนเพื่อเข้าคิวจองบัตร</p>
          <Link
            href={`/auth/login?next=${encodeURIComponent(next)}`}
            className="btn btn-primary btn-md"
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.panel}>
        <h1 className={styles.title}>ห้องรอคิว</h1>
        <p className={styles.sub}>
          {concert ? concert.title : concertErr ?? '…'}
        </p>

        {!queueStatus?.in_queue && queueStatus?.status !== 'admitted' && (
          <>
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={handleJoin}
              disabled={joining || !!concertErr}
            >
              {joining ? (
                <><span className="spinner spinner-sm" /> กำลังเข้าคิว…</>
              ) : (
                'เข้าคิว'
              )}
            </button>
            <p className={styles.liveStatus}>
              <span className={styles.pollingDot} aria-hidden />
              อัปเดตสถานะอัตโนมัติทุก {POLL_MS / 1000} วินาที
            </p>
          </>
        )}

        {queueStatus?.in_queue && (
          <>
            <p className={styles.waitingLabel}>ลำดับของคุณ</p>
            <div className={styles.positionWrap}>
              <span className={styles.ring} aria-hidden />
              <span
                key={positionKey.current}
                className={styles.positionNum}
                aria-live="polite"
              >
                {(queueStatus.position ?? 0) + 1}
              </span>
            </div>
            <p className={styles.totalHint}>
              จากทั้งหมดประมาณ {queueStatus.total ?? '—'} คิว (อันดับเริ่มที่ 1)
            </p>
            {etaText && (
              <p className={styles.eta}>
                ประมาณการรอ <strong>{etaText}</strong>
              </p>
            )}
            <div className={styles.progressTrack} aria-hidden>
              <div
                className={styles.progressFill}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className={styles.liveStatus}>
              <span className={styles.pollingDot} aria-hidden />
              กำลังรอ… เมื่อถึงหน้าจอจะพาไปเลือกที่นั่งอัตโนมัติ
            </p>
          </>
        )}

        {queueStatus?.note && <p className={styles.note}>{queueStatus.note}</p>}
        {actionError && <p className={styles.error}>{actionError}</p>}

        <div style={{ marginTop: 'var(--space-8)' }}>
          <Link href={`/concerts/${id}`} className="btn btn-ghost btn-sm">
            กลับรายละเอียดคอนเสิร์ต
          </Link>
        </div>
      </div>
    </div>
  );
}
