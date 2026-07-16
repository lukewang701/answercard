import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '答案卡掃描批改系統',
  description: '快速掃描批改學生答案卡，即時統計成績報表。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body suppressHydrationWarning>
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
