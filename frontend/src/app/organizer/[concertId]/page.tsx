'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { organizerApi, type OrganizerDashboard, type ZoneOccupancy, type RefundRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

// Simple SVG bar chart component
function RevenueChart({ revenue, expenses }: { revenue: number; expenses: number }) {
  const max = Math.max(revenue, expenses, 1);
  const rPct = (revenue / max) * 100;
  const ePct = (expenses / max) * 100;

  return (
    <div className={styles.chart} aria-label="กราฟรายรับ-รายจ่าย">
      <div className={styles.chartBars}>
        <div className={styles.chartCol}>
          <div className={styles.barWrap}>
            <div
              className={`${styles.bar} ${styles.barRevenue}`}
              style={{ height: `${rPct}%` }}
              title={`รายรับ ${revenue.toLocaleString('th-TH')} บาท`}
            />
          </div>
          <span className={styles.barLabel}>รายรับ</span>
          <span className={styles.barValue}>{(revenue / 1000).toFixed(1)}K</span>
        </div>
        <div className={styles.chartCol}>
          <div className={styles.barWrap}>
            <div
              className={`${styles.bar} ${styles.barExpense}`}
              style={{ height: `${ePct}%` }}
              title={`รายจ่าย ${expenses.toLocaleString('th-TH')} บาท`}
            />
          </div>
          <span className={styles.barLabel}>รายจ่าย</span>
          <span className={styles.barValue}>{(expenses / 1000).toFixed(1)}K</span>
        </div>
      </div>
    </div>
  );
}

// Zone occupancy row
function ZoneRow({
  zone,
  concertId,
  onClose,
}: {
  zone: ZoneOccupancy;
  concertId: string;
  onClose: (zoneId: string) => void;
}) {
  const pct = Math.round(zone.occupancy_pct);
  const isClosed = zone.status === 'closed';

  return (
    <tr className={`${styles.zoneRow} ${isClosed ? styles.zoneClosed : ''}`}>
      <td className={styles.zoneName}>{zone.zone_name}</td>
      <td>
        <div className={styles.progressWrap}>
          <div
            className={styles.progressBar}
            style={{ width: `${Math.min(pct, 100)}%` }}
            data-pct={pct}
          />
          <span className={styles.progressPct}>{pct}%</span>
        </div>
      </td>
      <td className={styles.tdCenter}>{zone.sold_seats} / {zone.total_seats}</td>
      <td className={styles.tdCenter}>฿{zone.revenue.toLocaleString('th-TH')}</td>
      <td className={styles.tdCenter}>
        {isClosed ? (
          <span className={styles.closedBadge}>ปิดแล้ว</span>
        ) : (
          <button
            className={styles.closeZoneBtn}
            onClick={() => onClose(zone.zone_id)}
          >
            ปิดโซน
          </button>
        )}
      </td>
    </tr>
  );
}

// Refund request row
function RefundRow({
  req,
  onApprove,
  onReject,
}: {
  req: RefundRequest;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  return (
    <tr className={styles.refundRow}>
      <td className={styles.refundId}>#{req.id.slice(0, 8).toUpperCase()}</td>
      <td>{req.user_display_name ?? '—'}</td>
      <td>{req.seat_info ?? '—'}</td>
      <td className={styles.tdCenter}>฿{req.amount?.toLocaleString('th-TH') ?? '—'}</td>
      <td className={styles.tdCenter}>
        {req.status === 'pending' ? (
          <div className={styles.refundActions}>
            <button className={styles.approveBtn} onClick={() => onApprove(req.id)}>
              อนุมัติ
            </button>
            <button className={styles.rejectBtn} onClick={() => onReject(req.id)}>
              ปฏิเสธ
            </button>
          </div>
        ) : (
          <span className={req.status === 'approved' ? styles.approvedBadge : styles.rejectedBadge}>
            {req.status === 'approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธแล้ว'}
          </span>
        )}
      </td>
    </tr>
  );
}

export default function OrganizerDashboardPage() {
  const params = useParams();
  const concertId = typeof params.concertId === 'string' ? params.concertId : '';
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [data, setData] = useState<OrganizerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  }, []);

  const reload = useCallback(() => {
    if (!concertId || !isAuthenticated) return;
    setLoading(true);
    organizerApi.getDashboard(concertId)
      .then(({ data: d }) => { setData(d); setErr(null); })
      .catch(() => setErr('โหลดข้อมูลไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, [concertId, isAuthenticated]);

  useEffect(() => { reload(); }, [reload]);

  async function handleCloseZone(zoneId: string) {
    try {
      await organizerApi.closeZone(concertId, zoneId);
      showToast('ปิดโซนสำเร็จ');
      reload();
    } catch {
      showToast('ไม่สามารถปิดโซนได้');
    }
  }

  async function handleApprove(refundId: string) {
    try {
      await organizerApi.approveRefund(refundId);
      showToast('อนุมัติคำขอคืนเงินแล้ว');
      reload();
    } catch {
      showToast('อนุมัติไม่สำเร็จ');
    }
  }

  async function handleReject(refundId: string) {
    try {
      await organizerApi.rejectRefund(refundId);
      showToast('ปฏิเสธคำขอคืนเงินแล้ว');
      reload();
    } catch {
      showToast('ดำเนินการไม่สำเร็จ');
    }
  }

  if (authLoading || loading) {
    return (
      <div className={styles.loadWrap}>
        <div className={styles.spinRing} />
        <p>กำลังโหลด Dashboard…</p>
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className={styles.loadWrap}>
        <p style={{ color: 'var(--color-error)' }}>{err ?? 'ไม่พบข้อมูล'}</p>
        <button className="btn btn-ghost btn-sm" onClick={reload}>ลองใหม่</button>
      </div>
    );
  }

  const net = data.net_profit;

  return (
    <div className={styles.page}>
      <div className={styles.ambientLeft} aria-hidden />
      <div className={styles.ambientRight} aria-hidden />

      {toast && (
        <div className={`${styles.toast} animate-fade-in`} role="status">{toast}</div>
      )}

      <div className="container">
        {/* ── Title ── */}
        <header className={`${styles.header} animate-fade-in-up`}>
          <div>
            <p className={styles.eyebrow}>Organizer Dashboard</p>
            <h1 className={`gold-gradient-text ${styles.title}`}>{data.concert_title}</h1>
          </div>
          <button className={`${styles.reloadBtn}`} onClick={reload} aria-label="รีเฟรช">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            รีเฟรช
          </button>
        </header>

        <hr className="divider" />

        {/* ── KPI cards ── */}
        <div className={styles.kpiGrid}>
          <div className={`${styles.kpiCard} animate-fade-in-up stagger-1`}>
            <span className={styles.kpiLabel}>รายรับรวม</span>
            <span className={`${styles.kpiValue} gold-gradient-text`}>
              ฿{data.total_revenue.toLocaleString('th-TH')}
            </span>
          </div>
          <div className={`${styles.kpiCard} animate-fade-in-up stagger-2`}>
            <span className={styles.kpiLabel}>รายจ่ายรวม</span>
            <span className={styles.kpiValue} style={{ color: 'var(--color-error)' }}>
              ฿{data.total_expenses.toLocaleString('th-TH')}
            </span>
          </div>
          <div className={`${styles.kpiCard} animate-fade-in-up stagger-3`}>
            <span className={styles.kpiLabel}>กำไรสุทธิ</span>
            <span className={styles.kpiValue} style={{ color: net >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
              {net >= 0 ? '+' : ''}฿{net.toLocaleString('th-TH')}
            </span>
          </div>
          <div className={`${styles.kpiCard} animate-fade-in-up stagger-4`}>
            <span className={styles.kpiLabel}>ตั๋วที่ขายแล้ว</span>
            <span className={styles.kpiValue}>{data.total_tickets_sold.toLocaleString('th-TH')}</span>
          </div>
        </div>

        {/* ── Revenue chart ── */}
        <section className={`${styles.section} animate-fade-in-up stagger-2`}>
          <h2 className={styles.sectionTitle}>รายรับ / รายจ่าย</h2>
          <div className={styles.chartCard}>
            <RevenueChart revenue={data.total_revenue} expenses={data.total_expenses} />
          </div>
        </section>

        {/* ── Zone occupancy ── */}
        <section className={`${styles.section} animate-fade-in-up stagger-3`}>
          <h2 className={styles.sectionTitle}>Zone Occupancy</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table} role="table">
              <thead>
                <tr>
                  <th className={styles.th}>โซน</th>
                  <th className={styles.th}>% ที่นั่ง</th>
                  <th className={`${styles.th} ${styles.tdCenter}`}>ขายแล้ว / ทั้งหมด</th>
                  <th className={`${styles.th} ${styles.tdCenter}`}>รายรับ</th>
                  <th className={`${styles.th} ${styles.tdCenter}`}>การดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {data.zones.map((z) => (
                  <ZoneRow
                    key={z.zone_id}
                    zone={z}
                    concertId={concertId}
                    onClose={handleCloseZone}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Refund requests ── */}
        <section className={`${styles.section} animate-fade-in-up stagger-4`}>
          <h2 className={styles.sectionTitle}>รายการขอคืนเงิน</h2>
          {data.refund_requests.length === 0 ? (
            <div className={styles.emptyRow}>ไม่มีคำขอคืนเงิน</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Request ID</th>
                    <th className={styles.th}>ผู้ใช้</th>
                    <th className={styles.th}>ที่นั่ง</th>
                    <th className={`${styles.th} ${styles.tdCenter}`}>จำนวน</th>
                    <th className={`${styles.th} ${styles.tdCenter}`}>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.refund_requests.map((r) => (
                    <RefundRow
                      key={r.id}
                      req={r}
                      onApprove={handleApprove}
                      onReject={handleReject}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
