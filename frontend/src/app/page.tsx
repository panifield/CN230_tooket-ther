import styles from './page.module.css';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className={styles.page}>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroBg} aria-hidden />

        <div className={`container ${styles.heroContent}`}>
          <p className={`${styles.eyebrow} animate-fade-in-up`}>
            ♪ TOOKET-THER
          </p>
          <h1 className={`animate-fade-in-up stagger-1`}>
            จองบัตรคอนเสิร์ต
            <br />
            <span className="gold-gradient-text">ง่าย รวดเร็ว ปลอดภัย</span>
          </h1>
          <p className={`${styles.heroSub} animate-fade-in-up stagger-2`}>
            ระบบจองตั๋วคอนเสิร์ตพรีเมียม พร้อมระบบคิวอัจฉริยะตามลำดับความสำคัญ
            และการชำระเงินผ่าน QR Code ที่ปลอดภัย
          </p>
          <div className={`${styles.heroCtas} animate-fade-in-up stagger-3`}>
            <Link href="/auth/login" className="btn btn-primary btn-lg">
              เริ่มต้นจองบัตร
            </Link>
            <Link href="/concerts" className="btn btn-ghost btn-lg">
              ดูคอนเสิร์ตทั้งหมด
            </Link>
          </div>
        </div>

        <div className={styles.heroStats}>
          {[
            { value: '10,000+', label: 'ที่นั่งต่องาน' },
            { value: '< 1s', label: 'ตอบสนองสูงสุด' },
            { value: '100%', label: 'ปลอดภัย' },
          ].map((s, i) => (
            <div key={s.label} className={`${styles.stat} animate-fade-in-up`}
              style={{ animationDelay: `${0.4 + i * 0.1}s` }}>
              <span className={`${styles.statValue} gold-gradient-text`}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <hr className="divider" />

      {/* ── Features ── */}
      <section className={styles.features}>
        <div className="container">
          <h2 className={`${styles.sectionTitle} animate-fade-in-up`}>ทำไมต้อง Tooket-ther?</h2>
          <div className={styles.featureGrid}>
            {features.map((f, i) => (
              <div key={f.title} className={`card animate-fade-in-up stagger-${i + 1}`}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

const features = [
  {
    icon: '⚡',
    title: 'คิวอัจฉริยะ',
    desc: 'ระบบจัดลำดับคิวตามภูมิลำเนา ให้ผู้ใช้ในพื้นที่ได้สิทธิ์ก่อน',
  },
  {
    icon: '🔒',
    title: 'ล็อกที่นั่งแบบ Soft Lock',
    desc: 'จองที่นั่งชั่วคราวพร้อมนับถอยหลัง ป้องกันการจองซ้ำซ้อนด้วย Database transaction',
  },
  {
    icon: '📱',
    title: 'QR Payment',
    desc: 'ชำระเงินผ่าน QR Code ทันที ระบบอัปเดตสถานะแบบ Real-time ผ่าน Webhook',
  },
  {
    icon: '🎫',
    title: 'E-Ticket ดิจิทัล',
    desc: 'ตั๋วดิจิทัลที่มีลายเซ็น JWT ป้องกันการปลอมแปลง สแกนเข้างานได้ทันที',
  },
];
