'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { concertApi, type ConcertDetail } from '@/lib/api';
import { CountdownTimer } from '@/components/CountdownTimer';
import styles from './page.module.css';

function formatThaiDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function ConcertDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const [concert, setConcert] = useState<ConcertDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await concertApi.get(id);
      setConcert(data);
    } catch {
      setError('ไม่พบคอนเสิร์ตหรือโหลดไม่สำเร็จ');
      setConcert(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '6rem', textAlign: 'center' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (error || !concert) {
    return (
      <div className="container" style={{ padding: 'var(--space-12)' }}>
        <p className={styles.error}>{error}</p>
        <Link href="/concerts" className="btn btn-outline-gold btn-sm">กลับรายการ</Link>
      </div>
    );
  }

  return (
    <div className={`container ${styles.page}`}>
      <Link href="/concerts" className={styles.back}>← คอนเสิร์ตทั้งหมด</Link>

      <div className={styles.hero}>
        <div className={styles.poster}>
          {concert.poster_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={concert.poster_url} alt="" />
          ) : (
            <div className={styles.posterFallback} aria-hidden>♪</div>
          )}
        </div>

        <div className={styles.info}>
          <h1>{concert.title}</h1>
          <div className={styles.meta}>
            <p>{concert.venue}</p>
            <p>เริ่มแสดง {formatThaiDateTime(concert.starts_at)}</p>
            {concert.ends_at && <p>จบประมาณ {formatThaiDateTime(concert.ends_at)}</p>}
          </div>

          <div className={styles.countdownBlock}>
            <CountdownTimer targetIso={concert.sales_starts_at} />
          </div>

          <div className={styles.actions}>
            <Link href={`/concerts/${concert.id}/queue`} className="btn btn-primary btn-md">
              เข้าคิวจองบัตร
            </Link>
            <Link href="/concerts" className="btn btn-ghost btn-md">คอนเสิร์ตอื่น</Link>
          </div>

          <h2 className={styles.sectionTitle}>Lineup</h2>
          {concert.lineup?.length ? (
            <ul className={styles.lineup}>
              {concert.lineup.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-12)' }}>
              ยังไม่ประกาศรายชื่อศิลปิน
            </p>
          )}

          <h2 className={styles.sectionTitle}>โซน &amp; ราคา</h2>
          <div className={styles.zones}>
            {concert.zones.map((z) => (
              <div key={z.id} className={styles.zoneRow}>
                <div>
                  <div className={styles.zoneName}>{z.name}</div>
                  {z.status !== 'open' && (
                    <span className={styles.badgeClosed}>ปิดขาย</span>
                  )}
                </div>
                <div className={styles.zonePrice}>{z.price} บาท</div>
                <div className={styles.zoneAvail}>
                  ว่าง {z.available_seats} / {z.total_seats}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
