'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Layers, GraduationCap, BarChart2, Users, LogOut, Sparkles } from 'lucide-react';

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/teacher/login';
  const isExamDashboard = pathname.match(/^\/teacher\/exams\/[^/]+$/);

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

  const navItems = [
    { href: '/teacher', label: '試卷管理', icon: Layers, exact: true },
    { href: '/teacher/grades', label: '成績管理', icon: GraduationCap, exact: false },
    { href: '/teacher/analytics', label: '試題檢討', icon: BarChart2, exact: false },
    { href: '/teacher/classes', label: '班級管理', icon: Users, exact: false },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      {!isExamDashboard && (
        <header
          style={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            flexShrink: 0,
            zIndex: 30,
          }}
        >
          <div 
            className="container py-3 flex flex-col md:flex-row md:justify-between md:items-center gap-3"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}
          >
            {/* Brand Logo & Version Badge */}
            <Link 
              href="/teacher" 
              className="flex items-center gap-2.5 group"
              style={{ flexShrink: 0, whiteSpace: 'nowrap', textDecoration: 'none' }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '9px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)',
                  flexShrink: 0,
                }}
                className="group-hover:scale-105 transition-transform"
              >
                <Sparkles size={18} />
              </div>
              <div className="flex items-center gap-2" style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                  數位答案卡
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    color: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    letterSpacing: '0.02em',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  V2.0
                </span>
              </div>
            </Link>

            {/* Navigation Tabs */}
            <div className="flex gap-1.5 items-center overflow-x-auto whitespace-nowrap w-full md:w-auto pb-1 md:pb-0 custom-scrollbar">
              {navItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                const IconComponent = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      fontSize: '0.88rem',
                      fontWeight: isActive ? 600 : 500,
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      transition: 'all 0.15s ease',
                      backgroundColor: isActive ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
                      color: isActive ? '#60a5fa' : 'var(--foreground)',
                      border: isActive
                        ? '1px solid rgba(59, 130, 246, 0.35)'
                        : '1px solid transparent',
                      boxShadow: isActive ? '0 2px 8px rgba(59, 130, 246, 0.2)' : 'none',
                    }}
                    className={!isActive ? 'hover:bg-white/5 hover:text-white' : ''}
                  >
                    <IconComponent
                      size={16}
                      style={{
                        color: isActive ? '#60a5fa' : 'currentColor',
                        opacity: isActive ? 1 : 0.7,
                      }}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <div
                style={{
                  width: '1px',
                  height: '18px',
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  margin: '0 0.5rem',
                }}
                className="hidden md:block"
              />

              {/* Tools & Logout */}
              <div className="flex items-center gap-2 ml-auto md:ml-0">
                <ThemeToggle />
                <button
                  onClick={handleLogout}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '7px',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    color: '#e2e8f0',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    transition: 'all 0.15s ease',
                  }}
                  className="hover:bg-red-500/15 hover:border-red-500/30 hover:text-red-400"
                  title="登出系統"
                >
                  <LogOut size={14} />
                  <span>登出</span>
                </button>
              </div>
            </div>
          </div>
        </header>
      )}
      <main style={{ flex: 1, minHeight: 0, overflowY: isExamDashboard ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  );
}
