'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ADMISSION_STORAGE_KEY,
  bookingApi,
  concertApi,
  writeCheckoutQueue,
  type BookingRow,
  type ConcertDetail,
  type ConcertSeatMap,
  type SeatMapSeat,
  type SeatMapZone,
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

const MAX_PICK = 8;

function groupSeatsByRow(seats: SeatMapSeat[]) {
  const m = new Map<string, SeatMapSeat[]>();
  for (const s of seats) {
    const arr = m.get(s.row_label) ?? [];
    arr.push(s);
    m.set(s.row_label, arr);
  }
  for (const arr of m.values()) {
    arr.sort((a, b) =>
      a.seat_no.localeCompare(b.seat_no, undefined, { numeric: true })
    );
  }
  return [...m.entries()].sort(([a], [b]) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
}

function parseMoney(s: string) {
  const n = parseFloat(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function HoldCountdown({ untilIso }: { untilIso: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const end = new Date(untilIso).getTime();
  const diff = Math.max(0, end - now);
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    <div className={styles.countdown}>
      เวลาคงเหลือในการชำระ
      <strong>
        {m}:{pad(s)}
      </strong>
    </div>
  );
}

export default function SeatsPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [hasAdmission, setHasAdmission] = useState<boolean | null>(null);
  const [admissionToken, setAdmissionToken] = useState<string | null>(null);
  const [concert, setConcert] = useState<ConcertDetail | null>(null);
  const [seatMap, setSeatMap] = useState<ConcertSeatMap | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [holdBookings, setHoldBookings] = useState<BookingRow[] | null>(null);
  const [holdErr, setHoldErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const t = sessionStorage.getItem(ADMISSION_STORAGE_KEY(id));
    setHasAdmission(!!t);
    setAdmissionToken(t);
  }, [id]);

  const loadMaps = useCallback(async () => {
    if (!id) return;
    setLoadErr(null);
    try {
      const [cRes, mRes] = await Promise.all([
        concertApi.get(id),
        concertApi.getSeatMap(id),
      ]);
      setConcert(cRes.data);
      setSeatMap(mRes.data);
    } catch {
      setLoadErr('โหลดแผนที่ที่นั่งไม่สำเร็จ');
    }
  }, [id]);

  useEffect(() => {
    if (hasAdmission) loadMaps();
  }, [hasAdmission, loadMaps]);

  useEffect(() => {
    if (!hasAdmission || !id) return;
    const t = setInterval(loadMaps, 12000);
    return () => clearInterval(t);
  }, [hasAdmission, id, loadMaps]);

  const seatMeta = useMemo(() => {
    const m = new Map<string, { zone: SeatMapZone; seat: SeatMapSeat }>();
    seatMap?.zones.forEach((z) => {
      z.seats.forEach((s) => m.set(s.id, { zone: z, seat: s }));
    });
    return m;
  }, [seatMap]);

  const totalPrice = useMemo(() => {
    let sum = 0;
    for (const sid of selected) {
      const meta = seatMeta.get(sid);
      if (meta) sum += parseMoney(meta.zone.price);
    }
    return sum;
  }, [selected, seatMeta]);

  const displayTotal = useMemo(() => {
    if (holdBookings?.length) {
      return holdBookings.reduce((sum, b) => {
        const meta = seatMeta.get(b.seat_id);
        return sum + (meta ? parseMoney(meta.zone.price) : 0);
      }, 0);
    }
    return totalPrice;
  }, [holdBookings, seatMeta, totalPrice]);

  function toggleSeat(seat: SeatMapSeat, zone: SeatMapZone) {
    if (holdBookings) return;
    if (zone.status !== 'open') return;
    if (seat.status !== 'available') return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seat.id)) next.delete(seat.id);
      else {
        if (next.size >= MAX_PICK) return prev;
        next.add(seat.id);
      }
      return next;
    });
  }

  async function confirmHold() {
    if (!id || !admissionToken || selected.size === 0) return;
    setHoldErr(null);
    setSubmitting(true);
    try {
      const { data } = await bookingApi.createHold(
        id,
        [...selected],
        admissionToken
      );
      setHoldBookings(data.bookings);
      writeCheckoutQueue(data.bookings.map((b) => b.id));
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { detail?: string } } };
      const d = ax?.response?.data?.detail;
      setHoldErr(typeof d === 'string' ? d : 'จองล็อกไม่สำเร็จ — ลองเลือกที่นั่งอื่น');
    } finally {
      setSubmitting(false);
    }
  }

  function goPay() {
    const first = holdBookings?.[0]?.id;
    if (first) router.push(`/bookings/${first}/payment`);
  }

  if (authLoading || hasAdmission === null) {
    return (
      <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const next = encodeURIComponent(`/concerts/${id}/seats`);
    return (
      <div className="container" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
        <p className={styles.authHint}>เข้าสู่ระบบเพื่อเลือกที่นั่งและจอง</p>
        <Link href={`/auth/login?next=${next}`} className="btn btn-primary btn-md">
          เข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  if (!hasAdmission) {
    return (
      <div className="container" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
        <p className={styles.warn}>ต้องมีสิทธิ์จากห้องคิวก่อน</p>
        <Link href={`/concerts/${id}/queue`} className="btn btn-primary btn-md">
          ไปห้องรอคิว
        </Link>
      </div>
    );
  }

  if (loadErr || !seatMap || !concert) {
    return (
      <div className="container" style={{ padding: 'var(--space-12)' }}>
        <p className={styles.error}>{loadErr ?? 'กำลังโหลด…'}</p>
        {!loadErr && <div className="spinner spinner-lg" style={{ marginTop: '1rem' }} />}
        <Link href={`/concerts/${id}`} className="btn btn-ghost btn-sm" style={{ marginTop: '1rem' }}>
          กลับ
        </Link>
      </div>
    );
  }

  const lockedUntil = holdBookings?.[0]?.locked_until ?? null;

  return (
    <div className={`container ${styles.page}`}>
      <Link href={`/concerts/${id}`} className={styles.back}>
        ← {concert.title}
      </Link>

      <div className={styles.layout}>
        <div>
          <div className={styles.stage}>เวที / Stage</div>

          {seatMap.zones.map((zone) => (
            <section key={zone.id} className={styles.zoneBlock}>
              <div className={styles.zoneHead}>
                <span className={styles.zoneName}>{zone.name}</span>
                <span className={styles.zoneMeta}>{zone.price} บาท / ที่</span>
                {zone.status !== 'open' && (
                  <span className={styles.zoneClosed}>ปิดขาย</span>
                )}
              </div>
              {groupSeatsByRow(zone.seats).map(([rowLabel, seats]) => (
                <div key={rowLabel} className={styles.row}>
                  <span className={styles.rowLabel}>{rowLabel}</span>
                  <div className={styles.seats}>
                    {seats.map((seat) => {
                      const isSel = selected.has(seat.id);
                      const sold = seat.status === 'sold';
                      const locked = seat.status === 'locked';
                      const dead =
                        zone.status !== 'open' || sold || locked || !!holdBookings;
                      return (
                        <button
                          key={seat.id}
                          type="button"
                          className={[
                            styles.seat,
                            isSel ? styles.seatSelected : '',
                            sold ? styles.seatSold : '',
                            locked ? styles.seatLocked : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          disabled={dead}
                          onClick={() => toggleSeat(seat, zone)}
                          title={`${rowLabel}${seat.seat_no}`}
                        >
                          {seat.seat_no}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>

        <aside className={styles.sidebar}>
          <h2>ที่นั่งที่เลือก</h2>
          {selected.size === 0 && !holdBookings ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              แตะที่นั่งว่างเพื่อเลือก (สูงสุด {MAX_PICK} ที่นั่ง)
            </p>
          ) : (
            <ul className={styles.pickList}>
              {(holdBookings
                ? holdBookings.map((b) => {
                    const meta = seatMeta.get(b.seat_id);
                    const z = meta?.zone;
                    const row = meta?.seat.row_label ?? '';
                    const no = meta?.seat.seat_no ?? '';
                    return (
                      <li key={b.id}>
                        <span>
                          {z?.name} {row}
                          {no}
                        </span>
                        <span>{z ? `${z.price} ฿` : ''}</span>
                      </li>
                    );
                  })
                : [...selected].map((sid) => {
                    const meta = seatMeta.get(sid);
                    if (!meta) return null;
                    return (
                      <li key={sid}>
                        <span>
                          {meta.zone.name} {meta.seat.row_label}
                          {meta.seat.seat_no}
                        </span>
                        <span>{meta.zone.price} ฿</span>
                      </li>
                    );
                  })
              ).filter(Boolean)}
            </ul>
          )}

          <div className={styles.total}>รวม {displayTotal.toFixed(2)} บาท</div>

          {lockedUntil && <HoldCountdown untilIso={lockedUntil} />}

          {!holdBookings ? (
            <>
              <button
                type="button"
                className="btn btn-primary btn-md"
                style={{ width: '100%' }}
                disabled={selected.size === 0 || submitting}
                onClick={confirmHold}
              >
                {submitting ? (
                  <><span className="spinner spinner-sm" /> กำลังล็อกที่นั่ง…</>
                ) : (
                  'ยืนยันที่นั่ง'
                )}
              </button>
              {holdErr && <p className={styles.error}>{holdErr}</p>}
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-primary btn-md"
                style={{ width: '100%' }}
                onClick={goPay}
              >
                ไปชำระเงิน
              </button>
              <p
                style={{
                  marginTop: 'var(--space-4)',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted)',
                  textAlign: 'center',
                }}
              >
                ล็อกที่นั่งแล้ว — ชำระภายในเวลาที่กำหนด
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
