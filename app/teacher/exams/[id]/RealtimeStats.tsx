'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Eye, EyeOff, Clock, AlertTriangle, CheckCircle, RotateCcw, X, Settings } from 'lucide-react';
import { DateTimePicker } from '@/components/DateTimePicker';

function formatTimeShort(dateStr: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function getCountdown(targetDate: Date | null, now: Date) {
  if (!targetDate) return null;
  const diff = targetDate.getTime() - now.getTime();
  if (diff <= 0) return { diff: 0, text: '剩餘 00分 00秒', isPast: true };
  const totalSeconds = Math.floor(diff / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return {
    diff,
    text: `剩餘 ${totalMinutes}分 ${String(seconds).padStart(2, '0')}秒`,
    isPast: false,
  };
}

type RealtimeStatsProps = {
  examId: string;
  submissions: any[];
  checkins: any[];
  classStudents: any[];
  examTotalScore: number;
  examSettings: {
    startTime: string | null;
    deadline: string | null;
    allowLateSubmission: boolean;
    lateDeadline: string | null;
    extraOpen: boolean;
    lateMarkEnabled: boolean;
  };
  questions: any[];
  onCheckinsChange: (checkins: any[]) => void;
  onSubmissionsChange: (submissions: any[]) => void;
};

export function RealtimeStats({ examId, submissions, checkins, classStudents, examTotalScore, examSettings, questions, onCheckinsChange, onSubmissionsChange }: RealtimeStatsProps) {
  const [showScores, setShowScores] = useState(false);
  const [now, setNow] = useState(new Date());

  // Student Details Modal
  const [studentDetailsTarget, setStudentDetailsTarget] = useState<any | null>(null);

  // Settings state
  const [startTime, setStartTime] = useState(examSettings.startTime || '');
  const [deadline, setDeadline] = useState(examSettings.deadline || '');
  const [allowLateSubmission, setAllowLateSubmission] = useState(examSettings.allowLateSubmission);
  const [lateDeadline, setLateDeadline] = useState(examSettings.lateDeadline || '');
  const [lateMarkEnabled, setLateMarkEnabled] = useState(examSettings.lateMarkEnabled);       // for allowLateSubmission
  const [extraOpen, setExtraOpen] = useState(examSettings.extraOpen);
  const [extraOpenLateMark, setExtraOpenLateMark] = useState(examSettings.lateMarkEnabled);  // for extraOpen
  const [savingSettings, setSavingSettings] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Recall modal
  const [recallTarget, setRecallTarget] = useState<any | null>(null);
  const [recalling, setRecalling] = useState(false);
  const [deletingSub, setDeletingSub] = useState(false);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Sync time settings from server for cross-device sync
  useEffect(() => {
    const syncSettings = async () => {
      try {
        const res = await fetch(`/api/exams/${examId}/settings`);
        if (!res.ok) return;
        const data = await res.json();
        setStartTime(data.startTime || '');
        setDeadline(data.deadline || '');
        setAllowLateSubmission(data.allowLateSubmission ?? false);
        setLateDeadline(data.lateDeadline || '');
        setLateMarkEnabled(data.lateMarkEnabled ?? false);
        setExtraOpen(data.extraOpen ?? false);
      } catch { /* silent */ }
    };
    const t = setInterval(syncSettings, 5000);
    return () => clearInterval(t);
  }, [examId]);

  const saveSettings = useCallback(async (patch: Partial<{ startTime: string; deadline: string; allowLateSubmission: boolean; lateDeadline: string; extraOpen: boolean; lateMarkEnabled: boolean; extraOpenLateMark: boolean }>) => {
    setSavingSettings(true);
    try {
      await fetch(`/api/exams/${examId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    } catch { /* silent */ } finally {
      setSavingSettings(false);
    }
  }, [examId]);

  // Compute submission phase
  const deadlineDate = deadline ? new Date(deadline) : null;
  const lateDeadlineDate = lateDeadline ? new Date(lateDeadline) : null;
  const effectiveEnd = lateDeadlineDate || deadlineDate;

  let phase: 'open' | 'late' | 'closed' | 'extra' = 'open';
  if (deadlineDate && now > deadlineDate) {
    if (lateDeadlineDate && now <= lateDeadlineDate) {
      phase = 'late';
    } else if (extraOpen) {
      phase = 'extra';
    } else {
      phase = 'closed';
    }
  }

  const phaseLabel: Record<typeof phase, { text: string; color: string }> = {
    open: { text: '正常繳交中', color: 'var(--success)' },
    late: { text: '遲交時間', color: 'var(--warning)' },
    closed: { text: '已截止', color: 'var(--danger)' },
    extra: { text: '補交開放中', color: 'var(--primary)' },
  };

  const deadlineTimeStr = formatTimeShort(deadline);
  const lateDeadlineTimeStr = formatTimeShort(lateDeadline);
  const normalCountdown = getCountdown(deadlineDate, now);
  const lateCountdown = getCountdown(lateDeadlineDate, now);

  const isNormalPhase = Boolean(deadlineDate && now <= deadlineDate);
  const isLatePhase = Boolean(phase === 'late' || (deadlineDate && lateDeadlineDate && now > deadlineDate && now <= lateDeadlineDate));
  const isExamEnded = Boolean(
    deadlineDate &&
    now > deadlineDate &&
    (!allowLateSubmission || (lateDeadlineDate && now > lateDeadlineDate)) &&
    !extraOpen
  );

  // Build combined student list
  const submittedMap = new Map(submissions.map(s => [s.studentName, s]));
  const checkinMap = new Map(checkins.map(c => [c.studentName, c]));

  const allStudents = classStudents.length > 0
    ? classStudents.map(cs => {
        const sub = submittedMap.get(cs.name);
        const ci = checkinMap.get(cs.name);
        return {
          name: cs.name,
          seatNumber: cs.seatNumber,
          status: sub ? 'submitted' : ci ? 'checkedin' : 'missing',
          submission: sub || null,
          checkin: ci || null,
        };
      })
    : submissions.map(s => ({ name: s.studentName, seatNumber: s.seatNumber, status: 'submitted', submission: s, checkin: null }));

  const panelTitle = '領取答案卡和繳交名單';

  const handleRecall = async () => {
    if (!recallTarget) return;
    setRecalling(true);
    try {
      await fetch(`/api/exams/${examId}/checkin/${recallTarget.id}`, { method: 'DELETE' });
      onCheckinsChange(checkins.filter(c => c.id !== recallTarget.id));
      setRecallTarget(null);
    } catch { /* silent */ } finally {
      setRecalling(false);
    }
  };

  const handleDeleteSubmission = async () => {
    if (!studentDetailsTarget?.submission) return;
    if (!confirm(`確定要刪除 ${studentDetailsTarget.name} 的試卷並允許重考嗎？`)) return;
    
    setDeletingSub(true);
    try {
      const res = await fetch(`/api/exams/${examId}/submissions/${studentDetailsTarget.submission.id}`, { method: 'DELETE' });
      if (res.ok) {
        onSubmissionsChange(submissions.filter(s => s.id !== studentDetailsTarget.submission.id));
        setStudentDetailsTarget(null);
      } else {
        alert('刪除失敗');
      }
    } catch { 
      alert('刪除失敗');
    } finally {
      setDeletingSub(false);
    }
  };

  const renderDualCards = (inModal = false) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.6rem' }}>
      {/* Left Card: 08:55 前繳交 (不扣分) */}
      <div style={{
        backgroundColor: inModal ? 'var(--background)' : 'var(--secondary)',
        border: `2px solid ${deadlineDate && now > deadlineDate ? 'var(--border)' : 'var(--success)'}`,
        borderRadius: '12px',
        overflow: 'hidden',
        minHeight: inModal ? '95px' : '115px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: isNormalPhase ? '0 0 0 2px rgba(16, 185, 129, 0.6), 0 0 14px 2px rgba(16, 185, 129, 0.5)' : 'none',
        animation: isNormalPhase ? 'pulseGlowGreen 2.5s ease-in-out infinite' : 'none',
        opacity: deadlineDate && now > deadlineDate ? 0.6 : 1,
        transition: 'opacity 0.3s',
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: deadlineDate && now > deadlineDate ? 'rgba(100, 116, 139, 0.12)' : 'rgba(16, 185, 129, 0.18)',
          borderBottom: `1px solid ${deadlineDate && now > deadlineDate ? 'var(--border)' : 'rgba(16, 185, 129, 0.3)'}`,
          padding: '0.6rem 0.85rem',
          display: 'flex',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', width: '100%' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: deadlineDate && now > deadlineDate ? 'var(--border)' : 'var(--success)',
              display: 'inline-block',
              flexShrink: 0,
            }} />
            <span style={{
              fontWeight: 800,
              fontSize: inModal ? '1rem' : 'clamp(0.95rem, 1.25vw, 1.28rem)',
              color: deadlineDate && now > deadlineDate ? 'var(--foreground)' : 'var(--success)',
              lineHeight: 1.2,
            }}>
              {deadlineTimeStr ? `${deadlineTimeStr} 前繳交 (不扣分)` : '未設定截止時間 (不扣分)'}
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: inModal ? '0.6rem' : '0.85rem', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{
            fontSize: inModal ? '1.5rem' : 'clamp(1.4rem, 2.2vw, 2.1rem)',
            fontWeight: 900,
            fontFamily: 'monospace',
            color: deadlineDate && now > deadlineDate ? 'var(--foreground)' : 'var(--success)',
            letterSpacing: '-0.5px',
          }}>
            {!deadlineDate ? '未設定截止時間' : (deadlineDate && now <= deadlineDate ? normalCountdown?.text : '已截止')}
          </div>
        </div>
      </div>

      {/* Right Card: 08:55 ~ 09:00 前繳交 (扣5分) */}
      <div style={{
        backgroundColor: inModal ? 'var(--background)' : 'var(--secondary)',
        border: `2px solid ${allowLateSubmission ? (isLatePhase ? 'var(--warning)' : 'rgba(245, 158, 11, 0.6)') : 'var(--border)'}`,
        borderRadius: '12px',
        overflow: 'hidden',
        minHeight: inModal ? '95px' : '115px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: isLatePhase ? '0 0 0 2px rgba(245, 158, 11, 0.6), 0 0 14px 2px rgba(245, 158, 11, 0.5)' : 'none',
        animation: isLatePhase ? 'pulseGlowAmber 2.5s ease-in-out infinite' : 'none',
        opacity: allowLateSubmission ? (phase === 'closed' ? 0.5 : 1) : 0.45,
        transition: 'opacity 0.3s',
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: allowLateSubmission ? 'rgba(245, 158, 11, 0.18)' : 'rgba(100, 116, 139, 0.1)',
          borderBottom: `1px solid ${allowLateSubmission ? 'rgba(245, 158, 11, 0.3)' : 'var(--border)'}`,
          padding: '0.6rem 0.85rem',
          display: 'flex',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', width: '100%' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: allowLateSubmission ? 'var(--warning)' : 'var(--border)',
              display: 'inline-block',
              flexShrink: 0,
            }} />
            <span style={{
              fontWeight: 800,
              fontSize: inModal ? '1rem' : 'clamp(0.95rem, 1.25vw, 1.28rem)',
              color: allowLateSubmission ? 'var(--warning)' : 'var(--foreground)',
              lineHeight: 1.2,
            }}>
              {allowLateSubmission
                ? (deadlineTimeStr && lateDeadlineTimeStr
                  ? `${deadlineTimeStr} ~ ${lateDeadlineTimeStr} 前繳交 (扣5分)`
                  : (lateDeadlineTimeStr ? `${lateDeadlineTimeStr} 前繳交 (扣5分)` : '補交時段 (扣5分)'))
                : (extraOpen ? '手動補交開放中 (扣5分)' : '未開放補交 (扣5分)')}
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: inModal ? '0.6rem' : '0.85rem', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{
            fontSize: inModal ? '1.5rem' : 'clamp(1.4rem, 2.2vw, 2.1rem)',
            fontWeight: 900,
            fontFamily: 'monospace',
            color: allowLateSubmission ? 'var(--warning)' : 'var(--foreground)',
            letterSpacing: '-0.5px',
          }}>
            {allowLateSubmission
              ? (lateDeadlineDate
                ? (lateDeadlineDate && now <= lateDeadlineDate ? lateCountdown?.text : '已完全截止')
                : '未設定補交截止')
              : (extraOpen ? '手動開放中' : '未開啟補交')}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100%', minHeight: 0, overflow: 'hidden' }}>

      {/* ── Glow animations for active countdown card (勻稱環繞卡片上下左右) ── */}
      <style>{`
        @keyframes pulseGlowGreen {
          0%, 100% {
            box-shadow: 
              0 0 0 1.5px rgba(16, 185, 129, 0.6),
              0 0 8px 1px rgba(16, 185, 129, 0.4),
              inset 0 0 8px rgba(16, 185, 129, 0.15);
            border-color: rgba(16, 185, 129, 0.7);
          }
          50% {
            box-shadow: 
              0 0 0 3px rgba(16, 185, 129, 1),
              0 0 18px 3px rgba(16, 185, 129, 0.85),
              0 0 32px 6px rgba(16, 185, 129, 0.45),
              inset 0 0 12px rgba(16, 185, 129, 0.25);
            border-color: rgba(16, 185, 129, 1);
          }
        }
        @keyframes pulseGlowAmber {
          0%, 100% {
            box-shadow: 
              0 0 0 1.5px rgba(245, 158, 11, 0.6),
              0 0 8px 1px rgba(245, 158, 11, 0.4),
              inset 0 0 8px rgba(245, 158, 11, 0.15);
            border-color: rgba(245, 158, 11, 0.7);
          }
          50% {
            box-shadow: 
              0 0 0 3px rgba(245, 158, 11, 1),
              0 0 20px 3px rgba(245, 158, 11, 0.85),
              0 0 35px 6px rgba(245, 158, 11, 0.5),
              inset 0 0 12px rgba(245, 158, 11, 0.25);
            border-color: rgba(245, 158, 11, 1);
          }
        }
      `}</style>

      {/* ── Top Countdown Cards (Shown only while exam is active) ── */}
      {!isExamEnded && (
        <div style={{ flexShrink: 0, padding: '6px 6px 3px 6px', margin: '-4px -4px 0.35rem -4px' }}>
          {renderDualCards(false)}
        </div>
      )}

      {/* ── Header: 領取答案卡和繳交名單 ── */}
      <div style={{ flexShrink: 0, marginBottom: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '1rem' }}>
            <Users size={18} /> {panelTitle}
            <button
              onClick={() => setShowScores(v => !v)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 500,
                backgroundColor: showScores ? 'var(--primary)' : 'var(--background)',
                color: showScores ? 'white' : 'var(--foreground)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {showScores ? <Eye size={12} /> : <EyeOff size={12} />}
              {showScores ? '隱藏成績' : '顯示成績'}
            </button>
          </h3>

          <button
            onClick={() => setShowSettingsModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.3rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: 'var(--primary)',
              color: 'white',
              cursor: 'pointer',
              border: 'none',
              boxShadow: 'var(--shadow-sm)',
              transition: 'opacity 0.2s',
            }}
          >
            <Clock size={13} />
            時間設定
          </button>
        </div>
      </div>

      {/* ── Student Grid ── */}
      {allStudents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
          尚無學生資料，請先在「班級管理」建立班級名單
        </div>
      ) : (
        <div className="custom-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem', alignContent: 'start' }}>

            {allStudents.map(st => (
              <div
                key={st.name}
                onClick={() => {
                  if (st.status === 'submitted') setStudentDetailsTarget(st);
                  else if (st.status === 'checkedin') setRecallTarget(st.checkin);
                }}
                className={`transition-all duration-300 ${st.status === 'submitted' ? 'cursor-pointer hover:bg-success/20' : st.status === 'checkedin' ? 'cursor-pointer animate-pulse' : ''}`}
                style={{
                  backgroundColor: st.status === 'submitted' ? 'rgba(34,197,94,0.16)' : st.status === 'checkedin' ? 'rgba(56, 189, 248, 0.14)' : 'rgba(148, 163, 184, 0.08)',
                  border: st.status === 'submitted' ? '2px solid rgba(34,197,94,0.85)' : st.status === 'checkedin' ? '2px solid rgba(56,189,248,0.95)' : '1.5px solid rgba(148, 163, 184, 0.5)',
                  boxShadow: st.status === 'submitted' ? '0 0 6px rgba(34,197,94,0.2)' : st.status === 'checkedin' ? '0 0 10px rgba(56,189,248,0.3)' : 'none',
                  borderRadius: '6px',
                  padding: '0.4rem 0.5rem',
                  opacity: 1,
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  minHeight: '44px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: st.status === 'missing' ? 'var(--foreground)' : 'var(--foreground)' }}>
                    <span style={{ opacity: 0.5, fontSize: '0.7rem', marginRight: '0.2rem' }}>{st.seatNumber}</span>
                    {st.name}
                  </span>
                  
                  {st.status === 'submitted' && (
                    showScores && st.submission ? (
                      <span style={{ 
                        fontSize: '0.75rem', fontWeight: 800, padding: '0.1rem 0.35rem', borderRadius: '4px', flexShrink: 0,
                        backgroundColor: st.submission.totalScore >= 60 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.15)',
                        color: st.submission.totalScore >= 60 ? 'var(--success)' : 'var(--danger)',
                        border: `1px solid ${st.submission.totalScore >= 60 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`
                      }}>
                        {st.submission.isLate && st.submission.rawScore != null ? (
                          <span>
                            <span style={{ textDecoration: 'line-through', opacity: 0.6, fontSize: '0.65rem', marginRight: '2px' }}>{Math.round(st.submission.rawScore)}</span>
                            {Math.round(st.submission.totalScore)}
                          </span>
                        ) : Math.round(st.submission.totalScore)}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--success)', background: 'rgba(34,197,94,0.15)', padding: '0.1rem 0.3rem', borderRadius: '4px', flexShrink: 0, border: '1px solid rgba(34,197,94,0.3)' }}>✅ 繳交</span>
                    )
                  )}

                  {st.status === 'checkedin' && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#38BDF8', background: 'rgba(56,189,248,0.15)', padding: '0.1rem 0.3rem', borderRadius: '4px', flexShrink: 0, border: '1px solid rgba(56,189,248,0.3)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#38BDF8', display: 'inline-block', animation: 'pulse 1.5s infinite' }}></span>
                      作答中
                    </span>
                  )}

                  {st.status === 'missing' && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--foreground)', opacity: 0.4, padding: '0.1rem 0.2rem', flexShrink: 0 }}>未繳交</span>
                  )}
                </div>
              </div>
            ))}

          </div>
        </div>
      )}

      {/* Student Details Modal */}
      {studentDetailsTarget && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setStudentDetailsTarget(null)}>
          <div className="bg-secondary/90 border border-border p-6 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="m-0 text-xl font-bold mb-1">{studentDetailsTarget.seatNumber}號 {studentDetailsTarget.name} - 作答詳情</h3>
                <div className="text-sm opacity-70">
                  總分：<span className="text-primary font-bold text-lg">{Math.round(studentDetailsTarget.submission.totalScore)}</span>
                  {studentDetailsTarget.submission.isLate && <span className="text-danger ml-2">(遲交扣 {studentDetailsTarget.submission.latePenalty} 分)</span>}
                </div>
              </div>
              <button onClick={() => setStudentDetailsTarget(null)} className="text-foreground/50 hover:text-foreground">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="border-b border-border text-sm opacity-70">
                    <th className="py-2 px-2 text-center w-16">題號</th>
                    <th className="py-2 px-2 text-center">學生作答</th>
                    <th className="py-2 px-2 text-center">正確答案</th>
                    <th className="py-2 px-2 text-center">得分</th>
                  </tr>
                </thead>
                <tbody>
                  {studentDetailsTarget.submission.answers.sort((a: any, b: any) => a.number - b.number).map((ans: any) => {
                    const q = questions.find((x: any) => x.number === ans.number);
                    let correctAnsStr = q?.correctAnswers || '';
                    try { correctAnsStr = JSON.parse(correctAnsStr).join(' / '); } catch {}
                    
                    let studentAnsStr = ans.selectedAnswers;
                    try { studentAnsStr = JSON.parse(studentAnsStr).join(''); } catch {}
                    
                    return (
                      <tr key={ans.number} className="border-b border-border/50 hover:bg-background/50 transition-colors">
                        <td className="py-3 px-2 font-medium">#{ans.number}</td>
                        <td className="py-3 px-2">
                          <span className={`font-bold ${ans.isCorrect ? 'text-success' : 'text-danger'}`}>
                            {studentAnsStr || '未作答'}
                          </span>
                        </td>
                        <td className="py-3 px-2 opacity-80">{correctAnsStr}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-center gap-2">
                            {ans.isCorrect ? <CheckCircle size={16} className="text-success" /> : <X size={16} className="text-danger" />}
                            <span className="text-sm">{Number(ans.pointsEarned.toFixed(2))} 分</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 pt-4 border-t border-border flex justify-between">
              <button 
                className="btn btn-secondary text-danger hover:bg-danger/10" 
                onClick={handleDeleteSubmission}
                disabled={deletingSub}
              >
                {deletingSub ? '刪除中...' : '刪除試卷並允許重考'}
              </button>
              <button className="btn btn-secondary" onClick={() => setStudentDetailsTarget(null)}>關閉</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Recall Modal ── */}
      {recallTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '360px', width: '100%', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RotateCcw size={20} /> 收回答案卡
              </h3>
              <button onClick={() => setRecallTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground)' }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem', opacity: 0.85 }}>
              確認要收回 <strong style={{ color: 'var(--primary)' }}>{recallTarget.seatNumber}號 {recallTarget.studentName}</strong> 的答案卡嗎？<br />
              <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>學生的答案卡將失效，可重新掃碼領取。</span>
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setRecallTarget(null)} className="btn btn-secondary" disabled={recalling}>取消</button>
              <button
                onClick={handleRecall}
                className="btn btn-primary"
                style={{ background: 'var(--warning)', color: 'black' }}
                disabled={recalling}
              >
                {recalling ? '收回中...' : '確認收回'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings Modal ── */}
      {showSettingsModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem',
        }}>
          <div className="card" style={{
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: 0,
            borderRadius: '16px',
            backgroundColor: 'var(--secondary)',
            border: '1.5px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.1rem 1.4rem',
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'rgba(0,0,0,0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Clock size={24} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800 }}>考試時間設定</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground)', opacity: 0.7, padding: '0.2rem' }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="custom-scrollbar" style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '1.25rem', overflowY: 'auto' }}>
              
              {/* 作答終止時在彈窗頂部呈現兩個時間卡片 */}
              {isExamEnded && (
                <div style={{
                  padding: '0.85rem',
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--muted-foreground)', marginBottom: '0.6rem' }}>
                    作答時間狀態（考試已終止，可在此調整截止時間以重啟考試）
                  </div>
                  {renderDualCards(true)}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <DateTimePicker
                  label="開始時間"
                  value={startTime}
                  onChange={v => { setStartTime(v); saveSettings({ startTime: v }); }}
                  icon={<Clock size={18} style={{ color: 'var(--primary)' }} />}
                  large={true}
                />
                <DateTimePicker
                  label="截止時間"
                  value={deadline}
                  onChange={v => { setDeadline(v); saveSettings({ deadline: v }); }}
                  icon={<Clock size={18} style={{ color: 'var(--primary)' }} />}
                  large={true}
                />
              </div>

              {/* 補交設定區塊 */}
              <div style={{
                padding: '1.1rem',
                backgroundColor: 'var(--background)',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontWeight: 700, fontSize: '1.25rem' }}>
                  <input
                    type="checkbox"
                    checked={allowLateSubmission}
                    onChange={e => { setAllowLateSubmission(e.target.checked); saveSettings({ allowLateSubmission: e.target.checked }); }}
                    style={{ width: '22px', height: '22px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  允許截止時間後補交
                </label>

                {allowLateSubmission && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    paddingLeft: '1.2rem',
                    borderLeft: '3px solid var(--warning)',
                  }}>
                    <DateTimePicker
                      label="補交截止時間"
                      value={lateDeadline}
                      onChange={v => {
                        if (v && deadline && new Date(v) <= new Date(deadline)) {
                          alert('補交截止時間必須晚於截止時間！');
                          return;
                        }
                        setLateDeadline(v);
                        saveSettings({ lateDeadline: v });
                      }}
                      icon={<AlertTriangle size={18} style={{ color: 'var(--warning)' }} />}
                      large={true}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '1.15rem' }}>
                      <input
                        type="checkbox"
                        checked={lateMarkEnabled}
                        onChange={e => { setLateMarkEnabled(e.target.checked); saveSettings({ lateMarkEnabled: e.target.checked }); }}
                        style={{ width: '20px', height: '20px', accentColor: 'var(--warning)', cursor: 'pointer' }}
                      />
                      標記遲交並扣5分
                    </label>
                  </div>
                )}
              </div>

              {/* 手動補交開關 */}
              <div style={{
                padding: '1.1rem',
                backgroundColor: 'var(--background)',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.8rem',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontWeight: 700, fontSize: '1.25rem' }}>
                  <input
                    type="checkbox"
                    checked={extraOpen}
                    onChange={e => { setExtraOpen(e.target.checked); saveSettings({ extraOpen: e.target.checked }); }}
                    style={{ width: '22px', height: '22px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  開啟補交 (手動覆寫開關)
                </label>
                {extraOpen && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', paddingLeft: '1.6rem', fontSize: '1.15rem' }}>
                    <input
                      type="checkbox"
                      checked={extraOpenLateMark}
                      onChange={e => { setExtraOpenLateMark(e.target.checked); saveSettings({ extraOpenLateMark: e.target.checked }); }}
                      style={{ width: '20px', height: '20px', accentColor: 'var(--warning)', cursor: 'pointer' }}
                    />
                    標記遲交並扣5分
                  </label>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '0.9rem 1.4rem',
              borderTop: '1px solid var(--border)',
              backgroundColor: 'rgba(0,0,0,0.15)',
            }}>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="btn btn-primary"
                style={{ fontSize: '1.2rem', padding: '0.55rem 1.8rem', borderRadius: '8px' }}
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
