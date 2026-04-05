import type { Metadata } from 'next';
import './globals.css';
import '../styles/components.css';
import { AuthProvider } from '@/contexts/AuthContext';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'Tooket-ther — ระบบจองบัตรคอนเสิร์ต',
  description: 'จองบัตรคอนเสิร์ตออนไลน์ง่าย รวดเร็ว ปลอดภัย',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="grain-overlay">
        <AuthProvider>
          <Header />
          <main style={{ paddingTop: 'var(--header-height)' }}>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
