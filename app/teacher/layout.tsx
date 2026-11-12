'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Sparkles,
  ArrowLeft,
  Menu,
  ChevronDown,
  BookOpen,
  BarChart3,
  FileQuestion,
  Users,
} from 'lucide-react';

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  // Determine current page title and whether it's a subpage
  const getPageInfo = (path: string) => {
    if (path === '/teacher') return { title: '試卷管理', isSubpage: false };
    if (path.startsWith('/teacher/grades')) return { title: '成績管理', isSubpage: false };
    if (path.startsWith('/teacher/analytics')) return { title: '試題檢討', isSubpage: false };
    if (path.startsWith('/teacher/classes')) return { title: '班級管理', isSubpage: false };
    if (path === '/teacher/exams/new') return { title: '建立新試卷', isSubpage: true };
    if (path.endsWith('/edit')) return { title: '編輯試卷', isSubpage: true };
    if (path.endsWith('/scan')) return { title: '紙本答案卡掃描', isSubpage: true };
    if (path.endsWith('/export')) return { title: '匯出成績報表', isSubpage: true };
    if (path.startsWith('/teacher/exams/')) return { title: '監考主控台', isSubpage: true };
    return { title: '教師管理系統', isSubpage: false };
  };

  const pageInfo = getPageInfo(pathname);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      {!isExamDashboard && (
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.45rem 1rem',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--background)',
            position: 'relative',
            zIndex: 50,
            flexShrink: 0,
          }}
        >
          {/* Left: Brand Logo or Back Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, zIndex: 1 }}>
            {pageInfo.isSubpage ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <button
                  onClick={() => router.back()}
                  className="btn btn-secondary"
                  title="返回上一頁"
                  style={{
                    padding: '0.35rem 0.6rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <ArrowLeft size={18} />
                </button>
                <Link
                  href="/teacher"
                  className="hidden sm:flex items-center gap-2 group"
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                    }}
                  >
                    <Sparkles size={15} />
                  </div>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--foreground)' }}>
                    數位答案卡
                  </span>
                </Link>
              </div>
            ) : (
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
                  <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
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
            )}
          </div>

          {/* Center: Current Page Name */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: 'clamp(1rem, 1.3vw, 1.25rem)',
                fontWeight: 700,
                color: 'var(--foreground)',
                letterSpacing: '0.5px',
                whiteSpace: 'nowrap',
              }}
            >
              {pageInfo.title}
            </span>
          </div>

          {/* Right: 功能選單 ☰ + 深色切換 + 登出 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0, zIndex: 1 }}>
            {/* 功能選單按鍵 */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIsMenuOpen(v => !v)}
                className="btn btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.35rem 0.8rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  backgroundColor: isMenuOpen ? 'var(--primary)' : 'var(--secondary)',
                  color: isMenuOpen ? 'white' : 'var(--foreground)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-in-out',
                }}
              >
                <Menu size={16} />
                <span>功能選單</span>
                <ChevronDown
                  size={14}
                  style={{
                    transform: isMenuOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                />
              </button>

              {/* 下拉選單內容 */}
              {isMenuOpen && (
                <>
                  {/* 點擊遮罩 (Backdrop) */}
                  <div
                    onClick={() => setIsMenuOpen(false)}
                    style={{
                      position: 'fixed',
                      inset: 0,
                      zIndex: 99,
                    }}
                  />

                  <div
                    className="custom-scrollbar"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      right: 0,
                      width: '260px',
                      backgroundColor: 'var(--secondary)',
                      border: '1.5px solid var(--border)',
                      borderRadius: '12px',
                      boxShadow: 'var(--shadow-lg)',
                      padding: '0.6rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      zIndex: 100,
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--muted-foreground)',
                        padding: '0.35rem 0.6rem 0.15rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      後台系統切換
                    </div>

                    <Link
                      href="/teacher"
                      onClick={() => setIsMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        color: pathname === '/teacher' ? 'var(--primary)' : 'var(--foreground)',
                        backgroundColor: pathname === '/teacher' ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                        textDecoration: 'none',
                      }}
                      className="hover:bg-accent/20"
                    >
                      <BookOpen size={17} style={{ opacity: 0.85 }} />
                      試卷管理
                    </Link>

                    <Link
                      href="/teacher/grades"
                      onClick={() => setIsMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        color: pathname.startsWith('/teacher/grades') ? 'var(--primary)' : 'var(--foreground)',
                        backgroundColor: pathname.startsWith('/teacher/grades') ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                        textDecoration: 'none',
                      }}
                      className="hover:bg-accent/20"
                    >
                      <BarChart3 size={17} style={{ opacity: 0.85 }} />
                      成績管理
                    </Link>

                    <Link
                      href="/teacher/analytics"
                      onClick={() => setIsMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        color: pathname.startsWith('/teacher/analytics') ? 'var(--primary)' : 'var(--foreground)',
                        backgroundColor: pathname.startsWith('/teacher/analytics') ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                        textDecoration: 'none',
                      }}
                      className="hover:bg-accent/20"
                    >
                      <FileQuestion size={17} style={{ opacity: 0.85 }} />
                      試題檢討
                    </Link>

                    <Link
                      href="/teacher/classes"
                      onClick={() => setIsMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        color: pathname.startsWith('/teacher/classes') ? 'var(--primary)' : 'var(--foreground)',
                        backgroundColor: pathname.startsWith('/teacher/classes') ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                        textDecoration: 'none',
                      }}
                      className="hover:bg-accent/20"
                    >
                      <Users size={17} style={{ opacity: 0.85 }} />
                      班級管理
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* 深色模式切換 */}
            <ThemeToggle />

            {/* 登出按鈕 */}
            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{
                fontSize: '0.85rem',
                padding: '0.35rem 0.85rem',
                borderRadius: '8px',
                fontWeight: 600,
              }}
            >
              登出
            </button>
          </div>
        </header>
      )}
      <main style={{ flex: 1, minHeight: 0, overflowY: isExamDashboard ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  );
}
