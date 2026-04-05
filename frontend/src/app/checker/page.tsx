'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { checkerApi, type CheckinResult } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

type ScanState = 'idle' | 'scanning' | 'processing' | 'pass' | 'fail';

// QR Scanner via MediaDevices (no external lib dependency issues)
function QRScannerView({
  onResult,
}: {
  onResult: (data: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const [cameraErr, setCameraErr] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          scanFrame();
        }
      } catch {
        setCameraErr('ไม่สามารถเข้าถึงกล้องได้ — ตรวจสอบสิทธิ์ใน Browser');
      }
    }

    function scanFrame() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(scanFrame);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      // Use BarcodeDetector if available (Chrome 88+)
      if ('BarcodeDetector' in window) {
        // @ts-expect-error BarcodeDetector is not in ts types yet
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        detector.detect(canvas).then((barcodes: { rawValue: string }[]) => {
          if (barcodes.length > 0) {
            onResult(barcodes[0].rawValue);
            return;
          }
          rafRef.current = requestAnimationFrame(scanFrame);
        }).catch(() => {
          rafRef.current = requestAnimationFrame(scanFrame);
        });
      } else {
        rafRef.current = requestAnimationFrame(scanFrame);
      }
    }

    startCamera();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [onResult]);

  if (cameraErr) {
    return (
      <div className={styles.cameraErr}>
        <div className={styles.cameraErrIcon}>📷</div>
        <p>{cameraErr}</p>
      </div>
    );
  }

  return (
    <div className={styles.videoWrap}>
      <video ref={videoRef} className={styles.video} playsInline muted />
      <canvas ref={canvasRef} className={styles.hiddenCanvas} />
      <div className={styles.scanFrame} aria-hidden>
        <div className={styles.corner} data-pos="tl" />
        <div className={styles.corner} data-pos="tr" />
        <div className={styles.corner} data-pos="bl" />
        <div className={styles.corner} data-pos="br" />
        <div className={styles.scanLine} />
      </div>
    </div>
  );
}

function ResultDisplay({
  result,
  onReset,
}: {
  result: { ok: boolean; data: CheckinResult };
  onReset: () => void;
}) {
  const ok = result.ok;
  return (
    <div className={`${styles.result} ${ok ? styles.resultPass : styles.resultFail} animate-fade-in`}
      role="status" aria-live="assertive">
      <div className={styles.resultIcon}>{ok ? '✓' : '✗'}</div>
      <p className={styles.resultLabel}>{ok ? 'PASS' : 'FAIL'}</p>
      <p className={styles.resultMsg}>{result.data.message}</p>
      {ok && result.data.holder_name && (
        <p className={styles.resultSub}>ผู้ถือบัตร: {result.data.holder_name}</p>
      )}
      {ok && result.data.seat_info && (
        <p className={styles.resultSub}>ที่นั่ง: {result.data.seat_info}</p>
      )}
      {result.data.already_checked_in && (
        <p className={styles.alreadyIn}>⚠ บัตรนี้ผ่านการ Check-in ไปแล้ว</p>
      )}
      <button className={styles.resetBtn} onClick={onReset}>
        สแกนใหม่
      </button>
    </div>
  );
}

export default function CheckerPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [result, setResult] = useState<{ ok: boolean; data: CheckinResult } | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [manualErr, setManualErr] = useState('');
  const processingRef = useRef(false);

  const handleToken = useCallback(async (token: string) => {
    if (processingRef.current || !token.trim()) return;
    processingRef.current = true;
    setScanState('processing');
    try {
      const { data } = await checkerApi.checkin(token.trim());
      setResult({ ok: data.success, data });
      setScanState(data.success ? 'pass' : 'fail');
    } catch {
      setResult({ ok: false, data: { success: false, message: 'ระบบขัดข้อง หรือ token ไม่ถูกต้อง' } });
      setScanState('fail');
    }
  }, []);

  const handleQRResult = useCallback((raw: string) => {
    if (scanState !== 'scanning') return;
    setScanState('processing');
    void handleToken(raw);
  }, [scanState, handleToken]);

  function reset() {
    processingRef.current = false;
    setResult(null);
    setScanState('idle');
    setManualToken('');
    setManualErr('');
  }

  async function submitManual() {
    if (!manualToken.trim()) { setManualErr('กรุณากรอก Token'); return; }
    setManualErr('');
    await handleToken(manualToken);
  }

  if (authLoading) {
    return <div className={styles.loadWrap}><div className={styles.spinRing} /></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.loadWrap}>
        <p style={{ color: 'var(--color-text-secondary)' }}>กรุณาเข้าสู่ระบบก่อนใช้งาน Checker</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* gradient top bar for brand */}
      <div className={styles.topBar} aria-hidden />

      <div className={styles.inner}>
        {/* Title */}
        <header className={`${styles.header} animate-fade-in-up`}>
          <div className={styles.badgeChecker}>CHECKER</div>
          <h1 className={`${styles.title} gold-gradient-text`}>Gate Scanner</h1>
          <p className={styles.subtitle}>สแกน QR บัตรผ่านกล้อง หรือป้อน Token ด้วยตนเอง</p>
        </header>

        {/* Main content */}
        {scanState === 'pass' || scanState === 'fail' ? (
          <ResultDisplay result={result!} onReset={reset} />
        ) : (
          <>
            {/* Camera section */}
            <div className={`${styles.cameraSection} animate-fade-in-up stagger-1`}>
              {scanState === 'idle' && (
                <div className={styles.startPrompt}>
                  <div className={styles.startIcon}>📷</div>
                  <p>กดเพื่อเปิดกล้องสแกน QR</p>
                  <button
                    id="btn-start-scan"
                    className={styles.startBtn}
                    onClick={() => setScanState('scanning')}
                  >
                    เปิดกล้อง
                  </button>
                </div>
              )}

              {scanState === 'scanning' && (
                <>
                  <QRScannerView onResult={handleQRResult} />
                  <button className={styles.stopBtn} onClick={reset}>หยุดสแกน</button>
                </>
              )}

              {scanState === 'processing' && (
                <div className={styles.processingWrap}>
                  <div className={styles.spinRing} />
                  <p>กำลังตรวจสอบ…</p>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className={styles.orDivider}>
              <span>หรือ</span>
            </div>

            {/* Manual token input */}
            <div className={`${styles.manualSection} animate-fade-in-up stagger-2`}>
              <label className={styles.manualLabel} htmlFor="manual-token">
                ป้อน Ticket Token
              </label>
              <div className={styles.manualRow}>
                <input
                  id="manual-token"
                  className={styles.manualInput}
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void submitManual()}
                  placeholder="eyJhbGci..."
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
                <button
                  id="btn-manual-checkin"
                  className={styles.manualBtn}
                  onClick={() => void submitManual()}
                  disabled={scanState === 'processing'}
                >
                  Check-in
                </button>
              </div>
              {manualErr && <p className={styles.manualErr}>{manualErr}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
