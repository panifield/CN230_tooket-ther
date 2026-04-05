'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { bookingApi, type BookingRow } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'รอชำระ',
  paid: 'ชำระแล้ว',
  cancelled: 'ยกเลิก',
  refunded: 'คืนเงินแล้ว',
  moved: 'ย้ายโซนแล้ว',
};

const STATUS_CLASS: Record<string, string> = {
  pending_payment: styles.statusPending,
  paid: styles.statusPaid,
  cancelled: styles.statusCancelled,
  refunded: styles.statusRefunded,
  moved: styles.statusMoved,
};

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refundTarget, setRefundTarget] = useState<string | null>(null);
  const [bankAccount, setBankAccount] = useState('');
  const [refundError, setRefundError] = useState('');
  const [refundSuccess, setRefundSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/auth/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    bookingApi
      .list()
      .then(({ data }) => {
        const arr = Array.isArray(data) ? data : (data as { items?: BookingRow[] }).items ?? [];
        setBookings(arr);
      })
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  async function handleRefund(bookingId: string) {
    if (!bankAccount.trim()) {
      setRefundError('กรุณากรอกเลขบัญชีธนาคาร');
      return;
    }
    setSubmitting(true);
    setRefundError('');
    try {
      await bookingApi.requestRefund(bookingId, bankAccount.trim());
      setRefundSuccess('ส่งคำขอคืนเงินสำเร็จ เจ้าหน้าที่จะดำเนินการภายใน 3–5 วันทำการ');
      setRefundTarget(null);
      setBankAccount('');
      const { data } = await bookingApi.list();
      const arr = Array.isArray(data) ? data : (data as { items?: BookingRow[] }).items ?? [];
      setBookings(arr);
    } catch {
      setRefundError('ไม่สามารถยื่นคำขอได้ — ตรวจสอบเงื่อนไข (ต้องอยู่ก่อนคอนเสิร์ต 7 วัน)');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className={styles.loadWrap}>
        <div className={`${styles.spinRing}`} />
        <p>กำลังโหลด…</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* ── Ambient background ── */}
      <div className={styles.ambient} aria-hidden />

      <div className="container">
        {/* Header */}
        <header className={`${styles.header} animate-fade-in-up`}>
          <div>
            <p className={styles.greeting}>ยินดีต้อนรับกลับ</p>
            <h1 className={`gold-gradient-text ${styles.userName}`}>{user?.display_name ?? 'ผู้ใช้'}</h1>
          </div>
          <button onClick={logout} className={styles.logoutBtn} aria-label="ออกจากระบบ">
            <span>ออกจากระบบ</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </header>

        <hr className="divider" />

        {/* Success alert */}
        {refundSuccess && (
          <div className={`${styles.alert} ${styles.alertSuccess} animate-fade-in`} role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {refundSuccess}
          </div>
        )}

        {/* Booking history */}
        <section>
          <h2 className={`${styles.sectionTitle} animate-fade-in-up stagger-1`}>ประวัติการจอง</h2>

          {bookings.length === 0 ? (
            <div className={`${styles.emptyState} animate-fade-in-up stagger-2`}>
              <div className={styles.emptyIcon}>🎫</div>
              <p>ยังไม่มีประวัติการจอง</p>
              <Link href="/concerts" className={`btn btn-primary btn-md ${styles.browseBtn}`}>
                เลือกดูคอนเสิร์ต
              </Link>
            </div>
          ) : (
            <ul className={styles.bookingList} role="list">
              {bookings.map((b, i) => (
                <li
                  key={b.id}
                  className={`${styles.bookingCard} animate-fade-in-up`}
                  style={{ animationDelay: `${0.1 + i * 0.07}s` }}
                >
                  <div className={styles.cardLeft}>
                    <span className={`${styles.statusBadge} ${STATUS_CLASS[b.status] ?? ''}`}>
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                    <p className={styles.bookingId}>#{b.id.slice(0, 8).toUpperCase()}</p>
                    <p className={styles.bookingDate}>
                      {new Date(b.created_at).toLocaleDateString('th-TH', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </p>
                    {b.holder_name && (
                      <p className={styles.holderName}>ผู้ถือตั๋ว: {b.holder_name}</p>
                    )}
                  </div>

                  <div className={styles.cardActions}>
                    {b.status === 'pending_payment' && (
                      <Link href={`/bookings/${b.id}/payment`} className="btn btn-primary btn-sm">
                        ชำระเงิน
                      </Link>
                    )}
                    {b.status === 'paid' && (
                      <>
                        <Link href={`/bookings/${b.id}/ticket`} className="btn btn-ghost btn-sm">
                          ดูตั๋ว
                        </Link>
                        <button
                          className={`btn btn-sm ${styles.refundBtn}`}
                          onClick={() => {
                            setRefundTarget(b.id);
                            setRefundError('');
                            setRefundSuccess('');
                            setBankAccount('');
                          }}
                        >
                          ขอคืนเงิน
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Refund Modal */}
        {refundTarget && (
          <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="ขอคืนเงิน">
            <div className={`${styles.modal} animate-fade-in`}>
              <h3 className={styles.modalTitle}>ยื่นขอคืนเงิน</h3>
              <p className={styles.modalDesc}>
                ระบบจะดำเนินการคืนเงินผ่านการโอนเข้าบัญชีธนาคาร
                <br />
                <span className={styles.condition}>เงื่อนไข: ต้องยื่นก่อนวันจัดงานอย่างน้อย 7 วัน</span>
              </p>

              <label className={styles.fieldLabel} htmlFor="bank-account">
                เลขบัญชีธนาคาร
              </label>
              <input
                id="bank-account"
                className={styles.input}
                type="text"
                placeholder="xxx-x-xxxxx-x"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                autoComplete="off"
                maxLength={20}
              />

              {refundError && (
                <p className={styles.errorText} role="alert">{refundError}</p>
              )}

              <div className={styles.modalActions}>
                <button
                  className={`btn btn-primary btn-md ${styles.submitBtn}`}
                  onClick={() => handleRefund(refundTarget)}
                  disabled={submitting}
                >
                  {submitting ? <span className={styles.spinSm} /> : 'ยืนยันขอคืนเงิน'}
                </button>
                <button
                  className="btn btn-ghost btn-md"
                  onClick={() => setRefundTarget(null)}
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
