'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  bookingApi,
  paymentApi,
  readCheckoutQueue,
  writeCheckoutQueue,
  type BookingDetail,
  type PaymentDto,
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

const POLL_MS = 2000;

function useHoldCountdown(untilIso: string | null) {
  const [label, setLabel] = useState('—');
  useEffect(() => {
    if (!untilIso) return;
    const endAt = untilIso;
    function tick() {
      const end = new Date(endAt).getTime();
      const diff = Math.max(0, end - Date.now());
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const pad = (n: number) => n.toString().padStart(2, '0');
      setLabel(`${m}:${pad(s)}`);
    }
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [untilIso]);
  return label;
}

export default function BookingPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = typeof params.id === 'string' ? params.id : '';
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [payment, setPayment] = useState<PaymentDto | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigated = useRef(false);
  const holdLabel = useHoldCountdown(booking?.locked_until ?? null);

  const bootstrap = useCallback(async () => {
    if (!bookingId) return;
    setErr(null);
    try {
      const b = await bookingApi.get(bookingId);
      setBooking(b.data);
      if (b.data.status !== 'pending_payment') {
        setErr('การจองนี้ไม่อยู่ในสถานะรอชำระ');
        return;
      }
    } catch {
      setErr('โหลดข้อมูลการจองไม่สำเร็จ');
      return;
    }
    try {
      const p = await paymentApi.getByBooking(bookingId);
      setPayment(p.data);
    } catch {
      try {
        const p = await paymentApi.create(bookingId);
        setPayment(p.data);
      } catch {
        setErr('สร้างรายการชำระเงินไม่สำเร็จ');
      }
    }
  }, [bookingId]);

  useEffect(() => {
    if (isAuthenticated && bookingId) bootstrap();
  }, [isAuthenticated, bookingId, bootstrap]);

  useEffect(() => {
    if (!payment || payment.status !== 'pending' || !isAuthenticated) return;
    const t = setInterval(async () => {
      try {
        const { data } = await paymentApi.getByBooking(bookingId);
        setPayment(data);
        if (data.status === 'succeeded' && !navigated.current) {
          navigated.current = true;
          setShowSuccess(true);
        }
      } catch {
        /* ignore transient */
      }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [payment?.status, bookingId, isAuthenticated]);

  useEffect(() => {
    if (!showSuccess) return;
    const t = setTimeout(() => {
      const q = readCheckoutQueue().filter((x) => x !== bookingId);
      writeCheckoutQueue(q);
      if (q.length > 0) router.replace(`/bookings/${q[0]}/payment`);
      else router.replace(`/bookings/${bookingId}/ticket`);
    }, 1600);
    return () => clearTimeout(t);
  }, [showSuccess, bookingId, router]);

  async function stubPay() {
    if (!payment) return;
    try {
      await paymentApi.stubComplete(payment.id);
      const { data } = await paymentApi.getByBooking(bookingId);
      setPayment(data);
      if (data.status === 'succeeded' && !navigated.current) {
        navigated.current = true;
        setShowSuccess(true);
      }
    } catch {
      setErr('จำลองชำระไม่สำเร็จ — ตั้ง DEBUG=true ที่ API หรือใช้ webhook');
    }
  }

  const showStub =
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_ENABLE_PAYMENT_STUB === 'true';

  const qrSrc =
    payment?.qr_code_url &&
    `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payment.qr_code_url)}`;

  if (authLoading) {
    return (
      <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={`container ${styles.page}`}>
        <p className={styles.error}>เข้าสู่ระบบเพื่อชำระเงิน</p>
        <Link href="/auth/login" className="btn btn-primary btn-sm">
          เข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.card}>
        <h1 className={styles.title}>ชำระเงิน QR</h1>
        <p className={styles.sub}>
          {booking?.concert_title}
          <br />
          {booking?.zone_name} {booking?.seat_row}
          {booking?.seat_no}
        </p>

        {err && <p className={styles.error}>{err}</p>}

        {payment && !err && (
          <>
            <p className={styles.amount}>{payment.amount.toFixed(2)} บาท</p>
            {qrSrc && (
              <div className={styles.qrWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrSrc} alt="QR ชำระเงิน" width={220} height={220} />
              </div>
            )}
            <div className={styles.countdown}>
              เวลาคงเหลือในการล็อกที่นั่ง
              <strong>{holdLabel}</strong>
            </div>
            <p className={styles.status}>
              {payment.status === 'pending' && (
                <>
                  <span className={styles.pulse} aria-hidden />
                  รอชำระเงิน — กำลังตรวจสอบอัตโนมัติ
                </>
              )}
              {payment.status === 'succeeded' && 'ชำระสำเร็จ'}
              {payment.status === 'failed' && 'ชำระไม่สำเร็จ'}
            </p>
            {showStub && payment.status === 'pending' && (
              <button
                type="button"
                className={`btn btn-outline-gold btn-sm ${styles.stubBtn}`}
                onClick={stubPay}
              >
                จำลองชำระสำเร็จ (dev)
              </button>
            )}
          </>
        )}

        {!payment && !err && (
          <div className="spinner spinner-lg" style={{ margin: '2rem auto' }} />
        )}

        <Link
          href={booking ? `/concerts/${booking.concert_id}/seats` : '/concerts'}
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 'var(--space-6)' }}
        >
          กลับ
        </Link>
      </div>

      {showSuccess && (
        <div className={styles.overlay} role="presentation">
          <div className={styles.burst}>
            <div className={styles.burstIcon} aria-hidden>
              ✓
            </div>
            <h2>ชำระสำเร็จ</h2>
          </div>
        </div>
      )}
    </div>
  );
}
