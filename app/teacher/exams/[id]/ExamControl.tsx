'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { Camera, QrCode, TrendingUp, Download, Smartphone, Users, ArrowLeft } from 'lucide-react';
import { RealtimeStats } from './RealtimeStats';

type ExamControlProps = {
  exam: {
    id: string;
    name: string;
    shareCode: string;
    totalScore: number;
    deadline: string | null;
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

type Mode = 'digital' | 'self-scan';

export function ExamControl({ exam, initialSubmissions, initialCheckins, classStudents, shareUrl }: ExamControlProps) {
  const [mode, setMode] = useState<Mode>('digital');
  const [submissions, setSubmissions] = useState<any[]>(initialSubmissions);
  const [checkins, setCheckins] = useState<any[]>(initialCheckins);

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

  const digitalQrUrl = `${shareUrl}?mode=digital`;
  const qrUrl = mode === 'digital' ? digitalQrUrl : shareUrl;
  const qrLabel = mode === 'digital' ? '掃描領取數位答案卡' : '學生自助掃描碼';

  const scores = submissions.map((s: any) => s.totalScore);
  const average = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
  const highest = scores.length ? Math.round(Math.max(...scores)) : 0;
  const lowest = scores.length ? Math.round(Math.min(...scores)) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0.75rem 1.25rem', gap: '0.75rem', boxSizing: 'border-box' }}>
      
      {/* ── Top Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, flexWrap: 'wrap' }}>
        <Link href="/teacher" className="btn btn-secondary px-2" style={{ padding: '0.35rem 0.6rem' }}>
          <ArrowLeft size={18} />
        </Link>
        <h2 className="m-0 flex-1" style={{ fontSize: '1.2rem', fontWeight: 700, minWidth: 0 }}>{exam.name}</h2>

        {/* Mode switcher */}
        <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--secondary)', borderRadius: '10px', padding: '0.3rem' }}>
          <button
            onClick={() => setMode('digital')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.3rem 0.75rem', borderRadius: '7px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', border: 'none',
              background: mode === 'digital' ? 'var(--primary)' : 'transparent',
              color: mode === 'digital' ? 'white' : 'var(--foreground)',
              transition: 'all 0.2s',
            }}
          >
            <Smartphone size={15} /> 學生填寫數位答案卡
          </button>
          <button
            onClick={() => setMode('self-scan')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.3rem 0.75rem', borderRadius: '7px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', border: 'none',
              background: mode === 'self-scan' ? 'var(--primary)' : 'transparent',
              color: mode === 'self-scan' ? 'white' : 'var(--foreground)',
              transition: 'all 0.2s',
            }}
          >
            <QrCode size={15} /> 學生自助掃描
          </button>
        </div>

        <Link href={`/teacher/exams/${exam.id}/scan`} className="btn btn-secondary flex items-center gap-2" style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}>
          <Camera size={16} /> 老師親自掃描
        </Link>
        <Link href={`/teacher/exams/${exam.id}/export`} className="btn btn-secondary flex items-center gap-2" style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}>
          <Download size={16} /> 匯出報表
        </Link>
      </div>

      {/* ── Three Panels ── */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">

        {/* Panel 1: QR Code */}
        <div className="card" style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', textAlign: 'center', padding: '1rem', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', flexShrink: 0 }}>
            <QrCode size={22} />
            <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{qrLabel}</span>
          </div>

          <div style={{ backgroundColor: 'white', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.75rem', width: '80%', maxWidth: '300px', flexShrink: 1 }}>
            <QRCodeSVG value={qrUrl} size={600} level="H" style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>

          <p style={{ fontFamily: 'monospace', fontSize: 'clamp(1.2rem, 2.5vw, 2rem)', letterSpacing: '0.2em', color: 'var(--primary)', fontWeight: 700, margin: '0 0 0.4rem 0', flexShrink: 0 }}>
            {exam.shareCode}
          </p>
          <a href={qrUrl} target="_blank" rel="noreferrer" style={{ fontSize: 'clamp(0.85rem, 1.4vw, 1.1rem)', opacity: 0.75, color: 'var(--primary)', textDecoration: 'underline', wordBreak: 'break-all', display: 'block', textAlign: 'center', marginTop: '0.25rem' }}>
            {qrUrl}
          </a>
        </div>

        {/* Panel 2: Stats */}
        <div className="card" style={{ flex: '0 0 auto', width: '18%', minWidth: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: '1rem', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexShrink: 0 }}>
            <TrendingUp size={22} />
            <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>成績總覽</span>
          </div>
          <div style={{ display: 'grid', gridTemplateRows: 'repeat(4, 1fr)', gap: '0.5rem', flex: 1 }}>
            {[
              { label: '已繳交', value: submissions.length, color: 'var(--primary)' },
              { label: '平均分數', value: average, color: 'var(--foreground)' },
              { label: '最高分', value: highest, color: 'var(--success)' },
              { label: '最低分', value: lowest, color: 'var(--danger)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ flex: 1, backgroundColor: 'var(--background)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.5rem' }}>
                <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.2rem' }}>{label}</div>
                <div style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.5rem)', fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 3: Submissions / Checkins */}
        <div className="card" style={{ flex: 3, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '1rem', overflow: 'hidden' }}>
          <RealtimeStats
            examId={exam.id}
            submissions={submissions}
            checkins={checkins}
            classStudents={classStudents}
            examTotalScore={exam.totalScore}
            mode={mode}
            examSettings={{
              deadline: exam.deadline,
              lateDeadline: exam.lateDeadline,
              extraOpen: exam.extraOpen,
              lateMarkEnabled: exam.lateMarkEnabled,
            }}
            questions={exam.questions || []}
            onCheckinsChange={setCheckins}
          />
        </div>
      </div>
    </div>
  );
}
