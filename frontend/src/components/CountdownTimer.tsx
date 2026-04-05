'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './CountdownTimer.module.css';

type Props = {
  targetIso: string;
  label?: string;
  /** เมื่อถึงเวลาแล้ว (หรือเลยมาแล้ว) */
  onLive?: () => void;
};

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export function CountdownTimer({ targetIso, label = 'เปิดขายใน', onLive }: Props) {
  const target = useMemo(() => new Date(targetIso).getTime(), [targetIso]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = target - now;

  useEffect(() => {
    if (diff <= 0) onLive?.();
  }, [diff, onLive]);

  if (diff <= 0) {
    return (
      <div className={styles.wrap}>
        <span className={styles.livePulse} aria-hidden />
        <span className={styles.liveText}>พร้อมเข้าคิว / จองได้แล้ว</span>
      </div>
    );
  }

  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  return (
    <div className={styles.wrap}>
      <span className={styles.label}>{label}</span>
      <div className={styles.digits} role="timer" aria-live="polite">
        {d > 0 && (
          <span className={styles.block}>
            <strong>{d}</strong>
            <small>วัน</small>
          </span>
        )}
        <span className={styles.block}>
          <strong>{pad(h)}</strong>
          <small>ชม.</small>
        </span>
        <span className={styles.sep}>:</span>
        <span className={styles.block}>
          <strong>{pad(m)}</strong>
          <small>นาที</small>
        </span>
        <span className={styles.sep}>:</span>
        <span className={`${styles.block} ${styles.seconds}`}>
          <strong>{pad(s)}</strong>
          <small>วินาที</small>
        </span>
      </div>
    </div>
  );
}
