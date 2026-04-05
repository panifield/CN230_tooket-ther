'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { bookingApi, type BookingDetail } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

export default function TicketPage() {
  const params = useParams();
  const bookingId = typeof params.id === 'string' ? params.id : '';
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !bookingId) return;
    bookingApi
      .get(bookingId)
      .then(({ data }) => setBooking(data))
      .catch(() => setErr('โหลดตั๋วไม่สำเร็จ'));
  }, [isAuthenticated, bookingId]);

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
        <p className={styles.warn}>เข้าสู่ระบบเพื่อดูตั๋ว</p>
        <Link href="/auth/login" className="btn btn-primary btn-sm">
          เข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  if (err || !booking) {
    return (
      <div className={`container ${styles.page}`}>
        <p className={styles.warn}>{err ?? 'กำลังโหลด…'}</p>
        {!err && <div className="spinner spinner-lg" />}
      </div>
    );
  }

  if (booking.status !== 'paid') {
    return (
      <div className={`container ${styles.page}`}>
        <div className={styles.card}>
          <p className={styles.warn}>ตั๋วจะแสดงหลังชำระเงินสำเร็จ</p>
          <Link href={`/bookings/${bookingId}/payment`} className="btn btn-primary btn-md">
            ไปชำระเงิน
          </Link>
        </div>
      </div>
    );
  }

  const token = booking.ticket_token;
  const qrSrc =
    token &&
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(token)}`;

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.card}>
        <span className={styles.badge}>e-Ticket</span>
        <h1 className={styles.title}>{booking.concert_title}</h1>
        <p className={styles.meta}>
          {booking.zone_name} · แถว {booking.seat_row} ที่นั่ง {booking.seat_no}
        </p>
        <p className={styles.seatBig}>
          {booking.seat_row}
          {booking.seat_no}
        </p>
        {qrSrc && (
          <div className={styles.qrWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt="QR เข้างาน" width={200} height={200} />
          </div>
        )}
        <p className={styles.hint}>
          แสดง QR นี้ให้เจ้าหน้าที่สแกนที่ประตู — ใช้ได้ครั้งเดียวหลัง check-in
        </p>
        <Link href="/concerts" className="btn btn-ghost btn-sm" style={{ marginTop: 'var(--space-8)' }}>
          กลับหน้าหลัก
        </Link>
      </div>
    </div>
  );
}
