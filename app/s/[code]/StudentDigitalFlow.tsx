'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Clock, Download, Camera, Edit2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { ReviewDownloadCard } from '@/components/ReviewDownloadCard';
import { OMRScanner } from '@/components/OMRScanner';

type Phase = 'identity' | 'answering' | 'result';

const OPTIONS = ['A', 'B', 'C', 'D', 'E'];

export function StudentDigitalFlow({
  examId,
  examName,
  totalQuestions,
  targetClass,
  allowPaperScan = false,
}: {
  examId: string;
  examName: string;
  totalQuestions: number;
  targetClass: string;
  allowPaperScan?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>('identity');

  // Identity form
  const [className, setClassName] = useState('');
  const [seatNumber, setSeatNumber] = useState('');
  const [name, setName] = useState('');
  const [identityError, setIdentityError] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkinId, setCheckinId] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [isRecalled, setIsRecalled] = useState(false);

  useEffect(() => {
    let did = sessionStorage.getItem('student_device_id');
    if (!did) {
      did = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('student_device_id', did);
    }
    setDeviceId(did);
  }, []);

  // Answering — page-based (5 questions per page)
  const [answers, setAnswers] = useState<string[][]>(Array.from({ length: totalQuestions }, () => []));
  const [currentPage, setCurrentPage] = useState(0);
  const QUESTIONS_PER_PAGE = 5;
  const totalPages = Math.ceil(totalQuestions / QUESTIONS_PER_PAGE);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  
  // Tab for scanner vs manual
  const [answeringTab, setAnsweringTab] = useState<'manual' | 'scanner'>('manual');

  const handleScanComplete = (result: any) => {
    if (result.success && result.answers) {
      const newAnswers = [...answers];
      result.answers.forEach((ans: any) => {
        const qIdx = ans.number - 1;
        if (qIdx >= 0 && qIdx < totalQuestions) {
          newAnswers[qIdx] = ans.selectedAnswers;
        }
      });
      setAnswers(newAnswers);
      setAnsweringTab('manual');
      alert('已自動填寫掃描結果，請確認答案是否正確再送出！');
    }
  };

  // Result
  const [result, setResult] = useState<any>(null);

  // Live clock and polling status
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (phase !== 'answering' || !checkinId || !deviceId) return;
    
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/exams/${examId}/checkin/${checkinId}/status?deviceId=${deviceId}`);
        if (!res.ok) {
           setIsRecalled(true);
           return;
        }
        const data = await res.json();
        if (!data.valid) {
          setIsRecalled(true);
        }
      } catch (e) {
        // Ignore temporary network errors
      }
    };

    const t = setInterval(checkStatus, 5000);
    return () => clearInterval(t);
  }, [phase, examId, checkinId, deviceId]);

  // Download review
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const handleDownloadReview = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: '#0F172A' });
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `${examName}_答題檢討_${className}_${name}.png`;
      link.click();
    } catch (e) {
      console.error(e);
      alert('產生圖片時發生錯誤');
    } finally {
      setDownloading(false);
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIdentityError('');
    setCheckingIn(true);
    try {
      const res = await fetch(`/api/exams/${examId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ className, seatNumber: seatNumber.padStart(2, '0'), studentName: name, deviceId }),
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

  const toggleOption = (qIndex: number, opt: string) => {
    setAnswers(prev => {
      const next = [...prev];
      const cur = next[qIndex];
      next[qIndex] = cur.includes(opt) ? cur.filter(x => x !== opt) : [...cur, opt].sort();
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
    const pageStart = currentPage * QUESTIONS_PER_PAGE;
    const pageEnd = Math.min(pageStart + QUESTIONS_PER_PAGE, totalQuestions);
    const pageQuestions = Array.from({ length: pageEnd - pageStart }, (_, i) => pageStart + i);
    const isLastPage = currentPage === totalPages - 1;

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--background)' }}>
        
        {isRecalled && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem 1.5rem', textAlign: 'center', border: '1px solid var(--danger)' }}>
              <AlertCircle size={64} className="text-danger mx-auto mb-4" />
              <h2 style={{ margin: '0 0 1rem 0', color: 'var(--danger)', fontSize: '1.4rem' }}>此張答案卡已被收回</h2>
              <p style={{ opacity: 0.8, marginBottom: '2rem', lineHeight: 1.5 }}>請下載正確答案卡</p>
              <button className="btn btn-primary w-full" onClick={() => window.location.reload()}>返回首頁</button>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ background: 'var(--secondary)', padding: '0.6rem 1rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.82rem', opacity: 0.7 }}>{name} · {className} {seatNumber}號</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', opacity: 0.55 }}>
              <Clock size={12} /> {now.toLocaleTimeString()}
            </span>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.75rem', opacity: 0.65 }}>
              <span>作答進度</span>
              <span>{answered} / {totalQuestions} 題 ({progress}%)</span>
            </div>
            <div style={{ height: '5px', borderRadius: '3px', background: 'var(--border)' }}>
              <div style={{ height: '100%', borderRadius: '3px', background: 'var(--primary)', width: `${progress}%`, transition: 'width 0.3s' }} />
            </div>
          </div>
        </div>

        {allowPaperScan && (
          <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 1rem', background: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
            <button 
              onClick={() => setAnsweringTab('manual')}
              style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border)', background: answeringTab === 'manual' ? 'var(--primary)' : 'var(--secondary)', color: answeringTab === 'manual' ? 'white' : 'var(--foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.9rem' }}
            >
              <Edit2 size={16} /> 直接填寫
            </button>
            <button 
              onClick={() => setAnsweringTab('scanner')}
              style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border)', background: answeringTab === 'scanner' ? 'var(--primary)' : 'var(--secondary)', color: answeringTab === 'scanner' ? 'white' : 'var(--foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.9rem' }}
            >
              <Camera size={16} /> 掃描紙本答案卡
            </button>
          </div>
        )}

        {answeringTab === 'scanner' ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            <div className="mb-4 text-sm text-foreground/80 p-3 bg-secondary rounded-lg">
              請將鏡頭對準您的紙本答案卡，系統會自動辨識選項並填入下方。若辨識結果有誤，您可以隨後在「直接填寫」中手動修改。
            </div>
            <OMRScanner onScanComplete={handleScanComplete} />
          </div>
        ) : (
          <>
            {/* Questions for this page */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem' }}>
              {pageQuestions.map(qIdx => {
                const qNum = qIdx + 1;
                const currentAnswers = answers[qIdx];
                return (
                  <div key={qIdx} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                    {/* Question label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '1.8rem', height: '1.8rem', borderRadius: '50%', fontSize: '0.85rem', fontWeight: 700, flexShrink: 0,
                        background: currentAnswers.length > 0 ? 'var(--primary)' : 'var(--secondary)',
                        color: currentAnswers.length > 0 ? 'white' : 'var(--foreground)'
                      }}>{qNum}</span>
                      <span style={{ fontSize: '0.82rem', opacity: 0.55 }}>第 {qNum} 題{currentAnswers.length > 1 ? ` (複選：${currentAnswers.join(',')})` : ''}</span>
                    </div>
                    {/* Option buttons in a row */}
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {OPTIONS.map(opt => {
                        const selected = currentAnswers.includes(opt);
                        return (
                          <button
                            key={opt}
                            onClick={() => toggleOption(qIdx, opt)}
                            style={{
                              flex: 1, padding: '0.65rem 0', borderRadius: '8px', fontSize: '1rem', fontWeight: 700,
                              border: `2px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                              background: selected ? 'var(--primary)' : 'var(--secondary)',
                              color: selected ? 'white' : 'var(--foreground)',
                              cursor: 'pointer', transition: 'all 0.12s',
                            }}
                          >{opt}</button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Navigation footer */}
            <div style={{ padding: '0.75rem 1rem', background: 'var(--secondary)', display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.95rem' }}
              >
                <ChevronLeft size={18} /> 上一頁
              </button>

              {!isLastPage ? (
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.95rem' }}
                >
                  下一頁 <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.75rem', fontSize: '0.95rem', fontWeight: 700, background: 'var(--success)' }}
                >
                  {submitting ? '送出中...' : '✓ 送出答案卡'}
                </button>
              )}
            </div>

            {/* Page nav dots */}
            <div style={{ padding: '0.4rem 1rem 0.6rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem', justifyContent: 'center', background: 'var(--secondary)', borderTop: '1px solid var(--border)' }}>
              {Array.from({ length: totalPages }, (_, i) => {
                const pStart = i * QUESTIONS_PER_PAGE;
                const pEnd = Math.min(pStart + QUESTIONS_PER_PAGE, totalQuestions);
                const pageAnswered = answers.slice(pStart, pEnd).every(a => a.length > 0);
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    style={{
                      padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: i === currentPage ? 'var(--primary)' : pageAnswered ? 'rgba(34,197,94,0.3)' : 'var(--border)',
                      color: i === currentPage ? 'white' : 'var(--foreground)',
                    }}
                  >
                    第{i + 1}頁
                  </button>
                );
              })}
            </div>

            {submitError && (
              <div style={{ padding: '0.75rem 1rem', color: 'var(--danger)', background: 'rgba(239,68,68,0.1)', textAlign: 'center', fontSize: '0.9rem' }}>
                {submitError}
              </div>
            )}
          </>
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
                {Math.round(result.rawScore ?? (result.totalScore + result.latePenalty))}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--warning)', margin: '0.5rem 0', fontWeight: 600 }}>
                遲交扣 {result.latePenalty} 分
              </div>
              <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.25rem' }}>最後分數</div>
              <div style={{ fontSize: '3.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                {Math.round(result.totalScore)}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '0.25rem' }}>您的分數</div>
              <div style={{ fontSize: '4rem', fontWeight: 700, color: 'var(--primary)' }}>
                {result?.totalScore != null ? Math.round(result.totalScore) : '--'}
              </div>
            </>
          )}
        </div>

        <p style={{ opacity: 0.6, fontSize: '0.85rem', marginBottom: '1.5rem' }}>老師已即時收到您的答案卡，可以關閉此頁面了。</p>

        <button 
          onClick={handleDownloadReview}
          disabled={downloading}
          className="btn btn-secondary" 
          style={{ width: '100%', padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600 }}
        >
          {downloading ? '產生中...' : <><Download size={18} /> 下載答題檢討 (錯題)</>}
        </button>

        <ReviewDownloadCard ref={cardRef} submission={{ ...result, exam: { name: examName, ...result?.exam } }} />
      </div>
    </div>
  );
}

