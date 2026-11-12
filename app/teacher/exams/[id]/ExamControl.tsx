'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Camera, QrCode, TrendingUp, Download, ArrowLeft, Menu, ChevronDown, BookOpen, BarChart3, FileQuestion, Users, FileEdit, ScanLine } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { RealtimeStats } from './RealtimeStats';

type ExamControlProps = {
  exam: {
    id: string;
    name: string;
    shareCode: string;
    totalScore: number;
    deadline: string | null;
    startTime: string | null;
    allowLateSubmission: boolean;
    lateDeadline: string | null;
    extraOpen: boolean;
    lateMarkEnabled: boolean;
    questions?: any[];
  };
  initialSubmissions: any[];
  initialCheckins: any[];
  classStudents: any[];
  shareUrl: string;
};


export function ExamControl({ exam, initialSubmissions, initialCheckins, classStudents, shareUrl }: ExamControlProps) {
  const [allowScan, setAllowScan] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const router = useRouter();
  const [submissions, setSubmissions] = useState<any[]>(initialSubmissions || []);
  const [checkins, setCheckins] = useState<any[]>(initialCheckins);

  const handleLogout = async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    router.push('/');
  };

  // Polling for real-time updates
  useEffect(() => {
    const poll = async () => {
      try {
        const [subRes, ciRes] = await Promise.all([
          fetch(`/api/exams/${exam.id}/submissions`),
          fetch(`/api/exams/${exam.id}/checkin`),
        ]);
        if (subRes.ok) {
          const d = await subRes.json();
          setSubmissions(d.submissions);
        }
        if (ciRes.ok) {
          const d = await ciRes.json();
          setCheckins(d.checkins);
          setSubmissions(d.submissions);
        }
      } catch { /* silent */ }
    };

    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [exam.id]);

  const qrUrl = allowScan ? `${shareUrl}?scan=1` : shareUrl;
  const qrLabel = allowScan ? '數位答案卡 (含掃描功能)' : '掃描領取數位答案卡';

  const scores = submissions.map((s: any) => s.totalScore);
  const average = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
  const highest = scores.length ? Math.round(Math.max(...scores)) : 0;
  const lowest = scores.length ? Math.round(Math.min(...scores)) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100%', minHeight: 0, padding: '0.5rem 1rem', gap: '0.5rem', boxSizing: 'border-box', overflow: 'hidden' }}>
      
      {/* ── Single Unified Header (方案 A) ── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        flexShrink: 0,
        padding: '0.35rem 0.25rem',
        borderBottom: '1px solid var(--border)',
        position: 'relative',
        zIndex: 50,
      }}>
        {/* Left: Back Button + Exam Title + Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
          <button
            onClick={() => router.push('/teacher')}
            className="btn btn-secondary"
            title="返回試卷管理"
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
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
            <h2 style={{
              margin: 0,
              fontSize: 'clamp(1.05rem, 1.4vw, 1.35rem)',
              fontWeight: 800,
              letterSpacing: '-0.3px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {exam.name}
            </h2>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--success)',
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.35)',
              padding: '0.15rem 0.5rem',
              borderRadius: '9999px',
              flexShrink: 0,
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--success)',
                display: 'inline-block',
                boxShadow: '0 0 6px rgba(34, 197, 94, 0.8)',
              }} />
              監考進行中
            </span>
          </div>
        </div>

        {/* Right: 功能選單 ☰ + 深色切換 + 登出 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
          
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
                    width: '290px',
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
                  {/* 分組 1：本試卷操作 */}
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--muted-foreground)',
                    padding: '0.35rem 0.6rem 0.15rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    本試卷操作
                  </div>

                  <Link
                    href={`/teacher/exams/${exam.id}/scan`}
                    onClick={() => setIsMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      color: 'var(--foreground)',
                      textDecoration: 'none',
                      transition: 'background 0.15s',
                    }}
                    className="hover:bg-accent/20"
                  >
                    <Camera size={17} style={{ color: 'var(--primary)' }} />
                    老師親自掃描
                  </Link>

                  <Link
                    href={`/teacher/exams/${exam.id}/export`}
                    onClick={() => setIsMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      color: 'var(--foreground)',
                      textDecoration: 'none',
                      transition: 'background 0.15s',
                    }}
                    className="hover:bg-accent/20"
                  >
                    <Download size={17} style={{ color: 'var(--primary)' }} />
                    匯出學生成績報表
                  </Link>

                  <Link
                    href={`/teacher/exams/${exam.id}/edit`}
                    onClick={() => setIsMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      color: 'var(--foreground)',
                      textDecoration: 'none',
                      transition: 'background 0.15s',
                    }}
                    className="hover:bg-accent/20"
                  >
                    <FileEdit size={17} style={{ color: 'var(--primary)' }} />
                    編輯試卷題目與設定
                  </Link>

                  {/* 開放學生掃描紙本答案卡開關 */}
                  <div
                    onClick={() => setAllowScan(v => !v)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: allowScan ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                      border: allowScan ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                      transition: 'all 0.15s',
                    }}
                    className="hover:bg-accent/20"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <ScanLine size={17} style={{ color: allowScan ? 'var(--primary)' : 'var(--foreground)' }} />
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>開放學生掃描紙本</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.65 }}>QR Code 帶入相機掃描</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowScan}
                      onChange={(e) => setAllowScan(e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                  </div>

                  {/* 分割線 */}
                  <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '0.4rem 0' }} />

                  {/* 分組 2：後台系統切換 */}
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--muted-foreground)',
                    padding: '0.35rem 0.6rem 0.15rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
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
                      color: 'var(--foreground)',
                      textDecoration: 'none',
                    }}
                    className="hover:bg-accent/20"
                  >
                    <BookOpen size={17} style={{ opacity: 0.75 }} />
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
                      color: 'var(--foreground)',
                      textDecoration: 'none',
                    }}
                    className="hover:bg-accent/20"
                  >
                    <BarChart3 size={17} style={{ opacity: 0.75 }} />
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
                      color: 'var(--foreground)',
                      textDecoration: 'none',
                    }}
                    className="hover:bg-accent/20"
                  >
                    <FileQuestion size={17} style={{ opacity: 0.75 }} />
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
                      color: 'var(--foreground)',
                      textDecoration: 'none',
                    }}
                    className="hover:bg-accent/20"
                  >
                    <Users size={17} style={{ opacity: 0.75 }} />
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

      {/* ── Three Panels ── */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0" style={{ height: '100%', maxHeight: '100%', minHeight: 0, overflow: 'hidden' }}>

        {/* Panel 1: Stats */}
        <div className="card custom-scrollbar" style={{ flex: 1, minWidth: '140px', height: '100%', maxHeight: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: '1rem', overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexShrink: 0 }}>
            <TrendingUp size={22} />
            <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>成績總覽</span>
          </div>
          <div style={{ display: 'grid', gridTemplateRows: 'repeat(4, 1fr)', gap: '0.4rem', flex: 1, minHeight: 0 }}>
            {[
              { label: '已繳交', value: submissions.length, color: 'var(--primary)' },
              { label: '平均分數', value: average, color: 'var(--foreground)' },
              { label: '最高分', value: highest, color: 'var(--success)' },
              { label: '最低分', value: lowest, color: 'var(--danger)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ backgroundColor: 'var(--background)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.75rem', gap: '0.5rem', minHeight: 0 }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.75, whiteSpace: 'nowrap' }}>{label}</div>
                <div style={{ fontSize: 'clamp(1.3rem, 2vw, 2rem)', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 2: QR Code */}
        <div className="card custom-scrollbar" style={{ flex: 3, minWidth: 0, height: '100%', maxHeight: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: '1rem', overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexShrink: 0 }}>
            <QrCode size={22} />
            <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{qrLabel}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, justifyContent: 'flex-start', width: '100%', minHeight: 0 }}>
            <div style={{ backgroundColor: 'white', padding: '0.75rem', borderRadius: '12px', marginBottom: '0.75rem', width: '99%', maxWidth: '418px', flexShrink: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <QRCodeSVG value={qrUrl} size={800} level="H" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>

            <p style={{ fontFamily: 'monospace', fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', letterSpacing: '0.3em', color: 'var(--primary)', fontWeight: 700, margin: '0 0 0.5rem 0', flexShrink: 0 }}>
              {exam.shareCode}
            </p>
            <a href={qrUrl} target="_blank" rel="noreferrer" style={{ fontSize: 'clamp(0.85rem, 1.4vw, 1.1rem)', opacity: 0.75, color: 'var(--primary)', textDecoration: 'underline', wordBreak: 'break-all', display: 'block', textAlign: 'center', marginTop: '0.25rem' }}>
              {qrUrl}
            </a>
          </div>
        </div>

        {/* Panel 3: Submissions / Checkins */}
        <div className="card" style={{ flex: 4, minWidth: 0, height: '100%', maxHeight: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '1rem', overflow: 'hidden', boxSizing: 'border-box' }}>
          <RealtimeStats
            examId={exam.id}
            submissions={submissions}
            checkins={checkins}
            classStudents={classStudents}
            examTotalScore={exam.totalScore}
            examSettings={{
              startTime: exam.startTime,
              deadline: exam.deadline,
              allowLateSubmission: exam.allowLateSubmission,
              lateDeadline: exam.lateDeadline,
              extraOpen: exam.extraOpen,
              lateMarkEnabled: exam.lateMarkEnabled,
            }}
            questions={exam.questions || []}
            onCheckinsChange={setCheckins}
            onSubmissionsChange={setSubmissions}
          />
        </div>
      </div>
    </div>
  );
}
