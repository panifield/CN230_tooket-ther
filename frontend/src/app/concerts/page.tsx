'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { concertApi, type ConcertListItem } from '@/lib/api';
import styles from './page.module.css';

function formatThaiDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function ConcertsPage() {
  const [items, setItems] = useState<ConcertListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [venue, setVenue] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await concertApi.list({
        venue: venue.trim() || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setItems(data);
    } catch {
      setError('โหลดรายการคอนเสิร์ตไม่สำเร็จ — ตรวจสอบว่า API รันอยู่');
    } finally {
      setLoading(false);
    }
  }, [venue, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1>คอนเสิร์ตทั้งหมด</h1>
        <p className={styles.sub}>
          ค้นหาตามสถานที่หรือช่วงวันที่ — ออกแบบในธีมโรงแสดงหรูหรา พร้อมแอนิเมชันการ์ดแบบ stagger
        </p>
      </header>

      <div className={styles.filters}>
        <div className={styles.field}>
          <label htmlFor="venue">สถานที่</label>
          <input
            id="venue"
            placeholder="เช่น Impact, Thunder Dome"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="df">ตั้งแต่วันที่</label>
          <input
            id="df"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="dt">ถึงวันที่</label>
          <input
            id="dt"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <div className={styles.field} style={{ alignSelf: 'flex-end' }}>
          <button type="button" className="btn btn-primary btn-md" onClick={load}>
            กรอง
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner spinner-lg" />
        </div>
      )}
      {error && <p className={styles.error}>{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className={styles.empty}>ไม่พบคอนเสิร์ตในตัวกรองนี้</p>
      )}

      <div className={styles.grid}>
        {items.map((c, i) => (
          <article
            key={c.id}
            className={styles.card}
            style={{ animationDelay: `${Math.min(i, 12) * 0.07}s` }}
          >
            <Link href={`/concerts/${c.id}`} className={styles.poster}>
              {c.poster_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.poster_url} alt="" />
              ) : (
                <div className={styles.posterFallback} aria-hidden>
                  ♪
                </div>
              )}
            </Link>
            <div className={styles.cardBody}>
              <h2 className={styles.cardTitle}>
                <Link href={`/concerts/${c.id}`}>{c.title}</Link>
              </h2>
              <p className={styles.meta}>{c.venue}</p>
              <p className={styles.meta}>เริ่มแสดง {formatThaiDate(c.starts_at)}</p>
              {c.min_price != null && c.max_price != null && (
                <p className={styles.price}>
                  ราคาเริ่มต้น {c.min_price} — {c.max_price} บาท
                </p>
              )}
              <Link href={`/concerts/${c.id}`} className="btn btn-outline-gold btn-sm" style={{ marginTop: '0.5rem' }}>
                ดูรายละเอียด
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
