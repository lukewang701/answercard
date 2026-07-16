'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

type Phase = 'identity' | 'answering' | 'result';

const OPTIONS = ['A', 'B', 'C', 'D', 'E'];

export function StudentDigitalFlow({
  examId,
  examName,
  totalQuestions,
  targetClass,
}: {
  examId: string;
  examName: string;
  totalQuestions: number;
  targetClass: string;
}) {
  const [phase, setPhase] = useState<Phase>('identity');

  // Identity form
  const [className, setClassName] = useState('');
  const [seatNumber, setSeatNumber] = useState('');
  const [name, setName] = useState('');
  const [identityError, setIdentityError] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkinId, setCheckinId] = useState('');

  // Answering
  const [answers, setAnswers] = useState<string[][]>(Array.from({ length: totalQuestions }, () => []));
  const [currentQ, setCurrentQ] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Result
  const [result, setResult] = useState<any>(null);

  // Live clock
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIdentityError('');
    setCheckingIn(true);
    try {
      const res = await fetch(`/api/exams/${examId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ className, seatNumber: seatNumber.padStart(2, '0'), studentName: name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setIdentityError(data.error || '驗證失敗');
        return;
      }
      setCheckinId(data.checkinId);
      setPhase('answering');
    } catch {
      setIdentityError('網路發生錯誤，請重試');
    } finally {
      setCheckingIn(false);
    }
  };

  const toggleOption = (opt: string) => {
    setAnswers(prev => {
      const next = prev.map((a, i) => {
        if (i !== currentQ) return a;
        return a.includes(opt) ? a.filter(x => x !== opt) : [...a, opt].sort();
      });
      return next;
    });
  };

  const handleSubmit = async () => {
    const unanswered = answers.filter(a => a.length === 0).length;
    if (unanswered > 0) {
      if (!confirm(`還有 ${unanswered} 題未作答，確定要送出嗎？`)) return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = {
        studentInfo: { year: '', class: className, seatNumber: seatNumber.padStart(2, '0'), name },
        answers: answers.map((selected, idx) => ({ number: idx + 1, selectedAnswers: selected })),
        submittedBy: 'student-digital',
        checkinId,
      };
      const res = await fetch(`/api/exams/${examId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSubmitError(data.error || '送出失敗');
        return;
      }
      // Fetch full submission details
      const detailRes = await fetch(`/api/submissions/${data.submission.id}`);
      if (detailRes.ok) {
        const detail = await detailRes.json();
        setResult(detail.submission);
      } else {
        setResult(data.submission);
      }
      setPhase('result');
    } catch {
      setSubmitError('網路發生錯誤，請重試');
    } finally {
      setSubmitting(false);
    }
  };

  const answered = answers.filter(a => a.length > 0).length;
  const progress = Math.round((answered / totalQuestions) * 100);

  // ── Phase: Identity ──────────────────────────────────────────────────────
  if (phase === 'identity') {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--background)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>{examName}</h1>
            <p style={{ opacity: 0.6, fontSize: '0.9rem', margin: 0 }}>請填寫您的資料以領取數位答案卡</p>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <form onSubmit={handleCheckIn}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>班級</label>
                <input
                  type="text"
                  placeholder={targetClass || '例如：203班'}
                  value={className}
                  onChange={e => setClassName(e.target.value)}
                  required
                  style={{ width: '100%', fontSize: '1rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>座號 (兩碼)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="例如：05"
                  value={seatNumber}
                  onChange={e => setSeatNumber(e.target.value.replace(/\D/g, ''))}
                  required
                  style={{ width: '100%', fontSize: '1.5rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', letterSpacing: '0.3em', textAlign: 'center', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>姓名</label>
                <input
                  type="text"
                  placeholder="請輸入您的姓名"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  style={{ width: '100%', fontSize: '1rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', boxSizing: 'border-box' }}
                />
              </div>

              {identityError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', background: 'rgba(239,68,68,0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  <AlertCircle size={18} /> {identityError}
                </div>
              )}

              <button
                type="submit"
                disabled={checkingIn || !className || !seatNumber || !name}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.9rem', fontSize: '1.1rem', fontWeight: 700, borderRadius: '10px' }}
              >
                {checkingIn ? '驗證中...' : '領取數位答案卡'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Phase: Answering ─────────────────────────────────────────────────────
  if (phase === 'answering') {
    const q = currentQ + 1;
    const currentAnswers = answers[currentQ];

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--background)' }}>

        {/* Header */}
        <div style={{ background: 'var(--secondary)', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>{name} · {className} {seatNumber}號</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', opacity: 0.6 }}>
              <Clock size={13} /> {now.toLocaleTimeString()}
            </span>
          </div>
          {/* Progress bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.78rem', opacity: 0.7 }}>
              <span>作答進度</span>
              <span>{answered} / {totalQuestions} 題 ({progress}%)</span>
            </div>
            <div style={{ height: '6px', borderRadius: '3px', background: 'var(--border)' }}>
              <div style={{ height: '100%', borderRadius: '3px', background: 'var(--primary)', width: `${progress}%`, transition: 'width 0.3s' }} />
            </div>
          </div>
        </div>

        {/* Question area - fills available space */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem 1rem', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ fontSize: '0.85rem', opacity: 0.5, display: 'block', marginBottom: '0.25rem' }}>第 {q} 題 / 共 {totalQuestions} 題</span>
            <span style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--primary)' }}>{q}</span>
          </div>

          {/* Answer options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '400px', margin: '0 auto', width: '100%' }}>
            {OPTIONS.map(opt => {
              const selected = currentAnswers.includes(opt);
              return (
                <button
                  key={opt}
                  onClick={() => toggleOption(opt)}
                  style={{
                    padding: '1rem 1.5rem',
                    borderRadius: '12px',
                    border: `2px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                    background: selected ? 'var(--primary)' : 'var(--secondary)',
                    color: selected ? 'white' : 'var(--foreground)',
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    transform: selected ? 'scale(1.02)' : 'scale(1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <span style={{ width: '2rem', height: '2rem', borderRadius: '50%', border: `2px solid ${selected ? 'rgba(255,255,255,0.5)' : 'var(--border)'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                    {opt}
                  </span>
                  <span style={{ opacity: 0.7, fontSize: '0.95rem', fontWeight: 400 }}>選項 {opt}</span>
                  {selected && <CheckCircle size={20} style={{ marginLeft: 'auto', opacity: 0.9 }} />}
                </button>
              );
            })}
          </div>

          {currentAnswers.length > 1 && (
            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 600 }}>
              ⚠️ 複選題：已選 {currentAnswers.join(', ')}
            </div>
          )}
        </div>

        {/* Navigation footer */}
        <div style={{ padding: '1rem', background: 'var(--secondary)', display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
          <button
            onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
            disabled={currentQ === 0}
            className="btn btn-secondary"
            style={{ flex: 1, padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1rem' }}
          >
            <ChevronLeft size={20} /> 上一題
          </button>

          {currentQ < totalQuestions - 1 ? (
            <button
              onClick={() => setCurrentQ(q => Math.min(totalQuestions - 1, q + 1))}
              className="btn btn-primary"
              style={{ flex: 1, padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1rem' }}
            >
              下一題 <ChevronRight size={20} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn btn-primary"
              style={{ flex: 1, padding: '0.85rem', fontSize: '1rem', fontWeight: 700, background: 'var(--success)' }}
            >
              {submitting ? '送出中...' : '✓ 送出答案卡'}
            </button>
          )}
        </div>

        {/* Quick nav dots */}
        <div style={{ padding: '0.5rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem', justifyContent: 'center', background: 'var(--secondary)', borderTop: '1px solid var(--border)' }}>
          {Array.from({ length: totalQuestions }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              style={{
                width: '28px', height: '28px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', border: 'none',
                background: i === currentQ ? 'var(--primary)' : answers[i].length > 0 ? 'rgba(34,197,94,0.3)' : 'var(--border)',
                color: i === currentQ ? 'white' : 'var(--foreground)',
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {submitError && (
          <div style={{ padding: '0.75rem 1rem', color: 'var(--danger)', background: 'rgba(239,68,68,0.1)', textAlign: 'center', fontSize: '0.9rem' }}>
            {submitError}
          </div>
        )}
      </div>
    );
  }

  // ── Phase: Result ────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'var(--background)' }}>
      <div style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ color: 'var(--success)', marginBottom: '1.5rem' }}>答案卡已繳交！</h2>

        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <p style={{ margin: '0 0 0.5rem 0', opacity: 0.7, fontSize: '0.9rem' }}>{className} {seatNumber}號 {name}</p>

          {result?.isLate ? (
            <>
              <div style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '0.25rem' }}>原始分數</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--foreground)', textDecoration: 'line-through', opacity: 0.5 }}>
                {(result.rawScore ?? result.totalScore + result.latePenalty).toFixed(1)}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--warning)', margin: '0.5rem 0', fontWeight: 600 }}>
                遲交扣 {result.latePenalty} 分
              </div>
              <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.25rem' }}>最後分數</div>
              <div style={{ fontSize: '3.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                {result.totalScore.toFixed(1)}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '0.25rem' }}>您的分數</div>
              <div style={{ fontSize: '4rem', fontWeight: 700, color: 'var(--primary)' }}>
                {result?.totalScore != null ? result.totalScore.toFixed(1) : '--'}
              </div>
            </>
          )}
        </div>

        <p style={{ opacity: 0.6, fontSize: '0.85rem' }}>老師已即時收到您的答案卡，可以關閉此頁面了。</p>
      </div>
    </div>
  );
}
