import type { Metadata } from 'next';
import './globals.css';
import { PwaRegister } from './PwaRegister';

export const metadata: Metadata = {
  title: '數位答案卡',
  description: '快速掃描批改學生答案卡，即時統計成績報表。',
  manifest: '/manifest.json',
  themeColor: '#0F172A',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '數位答案卡',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body suppressHydrationWarning>
        <PwaRegister />
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
