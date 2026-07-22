'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { InactivityLock } from './InactivityLock';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/teacher/login';

  const handleLogout = async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    router.push('/');
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      <header style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--secondary)', flexShrink: 0 }}>
        <div className="container py-4 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <Link href="/teacher">
            <h2 className="text-primary m-0" style={{ fontSize: '1.25rem', marginBottom: 0 }}>數位答案卡 - 老師後台</h2>
          </Link>
          <div className="flex gap-6 items-center overflow-x-auto whitespace-nowrap w-full md:w-auto pb-2 md:pb-0 custom-scrollbar">
            <Link href="/teacher" className={`text-sm ${pathname === '/teacher' ? 'font-bold text-primary' : 'text-foreground hover:text-primary transition-colors'}`}>
              試卷管理
            </Link>
            <Link href="/teacher/grades" className={`text-sm ${pathname.startsWith('/teacher/grades') ? 'font-bold text-primary' : 'text-foreground hover:text-primary transition-colors'}`}>
              成績管理
            </Link>
            <Link href="/teacher/analytics" className={`text-sm ${pathname.startsWith('/teacher/analytics') ? 'font-bold text-primary' : 'text-foreground hover:text-primary transition-colors'}`}>
              試題檢討
            </Link>
            <Link href="/teacher/classes" className={`text-sm ${pathname.startsWith('/teacher/classes') ? 'font-bold text-primary' : 'text-foreground hover:text-primary transition-colors'}`}>
              班級管理
            </Link>
            <div className="w-px h-4 bg-border mx-2 hidden md:block"></div>
            <ThemeToggle />
            <button onClick={handleLogout} className="btn btn-secondary text-sm px-3 py-1">登出</button>
          </div>
        </div>
      </header>
      <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <InactivityLock />
        {children}
      </main>
    </div>
  );
}
