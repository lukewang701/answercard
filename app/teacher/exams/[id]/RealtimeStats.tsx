'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Eye, EyeOff, Clock, AlertTriangle, CheckCircle, RotateCcw, X } from 'lucide-react';

type RealtimeStatsProps = {
  examId: string;
  submissions: any[];
  checkins: any[];
  classStudents: any[];
  examTotalScore: number;
  mode: 'digital' | 'self-scan';
  examSettings: {
    deadline: string | null;
    lateDeadline: string | null;
    extraOpen: boolean;
    lateMarkEnabled: boolean;
  };
  questions: any[];
  onCheckinsChange: (checkins: any[]) => void;
  onSubmissionsChange: (submissions: any[]) => void;
};

function toLocalDatetimeInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RealtimeStats({ examId, submissions, checkins, classStudents, examTotalScore, mode, examSettings, questions, onCheckinsChange, onSubmissionsChange }: RealtimeStatsProps) {
  const [showScores, setShowScores] = useState(false);
  const [now, setNow] = useState(new Date());

  // Student Details Modal
  const [studentDetailsTarget, setStudentDetailsTarget] = useState<any | null>(null);

  // Settings state
  const [deadline, setDeadline] = useState(toLocalDatetimeInput(examSettings.deadline));
  const [lateDeadline, setLateDeadline] = useState(toLocalDatetimeInput(examSettings.lateDeadline));
  const [extraOpen, setExtraOpen] = useState(examSettings.extraOpen);
  const [lateMarkEnabled, setLateMarkEnabled] = useState(examSettings.lateMarkEnabled);
  const [savingSettings, setSavingSettings] = useState(false);

  // Recall modal
  const [recallTarget, setRecallTarget] = useState<any | null>(null);
  const [recalling, setRecalling] = useState(false);
  const [deletingSub, setDeletingSub] = useState(false);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const saveSettings = useCallback(async (patch: Partial<{ deadline: string; lateDeadline: string; extraOpen: boolean; lateMarkEnabled: boolean }>) => {
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

  const panelTitle = mode === 'digital' ? '領取答案卡和繳交名單' : '繳交名單';

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: mode === 'digital' ? '0.6rem' : 0 }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
            <Users size={18} /> {panelTitle}
            <span style={{ fontSize: '0.75rem', opacity: 0.5, fontWeight: 400 }}>(即時)</span>
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {deadline && (
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px', backgroundColor: `${phaseLabel[phase].color}22`, color: phaseLabel[phase].color, border: `1px solid ${phaseLabel[phase].color}44` }}>
                {phaseLabel[phase].text}
              </span>
            )}
            <button
              onClick={() => setShowScores(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.65rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500, backgroundColor: showScores ? 'var(--primary)' : 'var(--background)', color: showScores ? 'white' : 'var(--foreground)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              {showScores ? <Eye size={13} /> : <EyeOff size={13} />}
              {showScores ? '隱藏成績' : '顯示成績'}
            </button>
          </div>
        </div>

        {/* ── Settings bar (both modes) ── */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', padding: '0.5rem 0.6rem', background: 'var(--background)', borderRadius: '8px', fontSize: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
              <Clock size={13} style={{ color: 'var(--primary)' }} /> 截止時間
              <input
                type="datetime-local"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                onBlur={e => saveSettings({ deadline: e.target.value })}
                style={{ fontSize: '0.72rem', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--secondary)', color: 'var(--foreground)' }}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
              <AlertTriangle size={13} style={{ color: 'var(--warning)' }} /> 遲交截止
              <input
                type="datetime-local"
                value={lateDeadline}
                onChange={e => setLateDeadline(e.target.value)}
                onBlur={e => saveSettings({ lateDeadline: e.target.value })}
                style={{ fontSize: '0.72rem', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--secondary)', color: 'var(--foreground)' }}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={extraOpen}
                onChange={e => { setExtraOpen(e.target.checked); saveSettings({ extraOpen: e.target.checked }); }}
              />
              開啟補交
            </label>
            {extraOpen && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  checked={lateMarkEnabled}
                  onChange={e => { setLateMarkEnabled(e.target.checked); saveSettings({ lateMarkEnabled: e.target.checked }); }}
                />
                標記遲交並扣5分
              </label>
            )}
          </div>
      </div>

      {/* ── Student Grid ── */}
      {allStudents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
          {mode === 'digital' ? '尚無學生資料，請先在「班級管理」建立班級名單' : '目前還沒有學生繳交試卷'}
        </div>
      ) : (
        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem', alignContent: 'start' }}>

            {allStudents.map(st => (
              <div
                key={st.name}
                onClick={() => {
                  if (st.status === 'submitted') setStudentDetailsTarget(st);
                  else if (st.status === 'checkedin') setRecallTarget(st.checkin);
                }}
                className={`transition-all ${st.status === 'submitted' ? 'cursor-pointer' : st.status === 'checkedin' ? 'cursor-pointer' : ''}`}
                style={{
                  backgroundColor: st.status === 'submitted' ? 'rgba(34,197,94,0.08)' : 'var(--background)',
                  border: `1.5px solid ${st.status === 'submitted' ? 'var(--success)' : st.status === 'checkedin' ? 'var(--warning)' : 'var(--border)'}`,
                  borderRadius: '6px',
                  padding: '0.3rem 0.5rem',
                  opacity: st.status === 'missing' ? 0.55 : 1,
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.1rem',
                  minHeight: 0,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    <span style={{ opacity: 0.55, fontSize: '0.68rem', marginRight: '0.2rem' }}>{st.seatNumber}</span>
                    {st.name}
                  </span>
                  {st.status === 'submitted' && <span style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--success)', background: 'rgba(34,197,94,0.15)', padding: '0.05rem 0.25rem', borderRadius: '3px', flexShrink: 0 }}>繳✓</span>}
                  {st.status === 'checkedin' && <span style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--warning)', background: 'rgba(234,179,8,0.15)', padding: '0.05rem 0.25rem', borderRadius: '3px', flexShrink: 0 }}>領取</span>}
                  {st.status === 'missing' && <span style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--danger)', background: 'rgba(239,68,68,0.1)', padding: '0.05rem 0.25rem', borderRadius: '3px', flexShrink: 0 }}>缺</span>}
                </div>
                {showScores && st.submission && (
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {st.submission.isLate && st.submission.rawScore != null ? (
                      <span style={{ fontSize: '0.68rem' }}>
                        <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{Math.round(st.submission.rawScore)}</span>
                        {' → '}{Math.round(st.submission.totalScore)}
                      </span>
                    ) : Math.round(st.submission.totalScore)}
                  </div>
                )}
              </div>
            ))}

          </div>
        </div>
      )}

      {/* Student Details Modal */}
      {studentDetailsTarget && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setStudentDetailsTarget(null)}>
          <div className="bg-secondary/90 border border-border p-6 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
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
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-sm opacity-70">
                    <th className="py-2 pl-2 w-16">題號</th>
                    <th className="py-2">學生作答</th>
                    <th className="py-2">正確答案</th>
                    <th className="py-2">得分</th>
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
                      <tr key={ans.number} className="border-b border-border/50 hover:bg-background/50">
                        <td className="py-3 pl-2 font-medium">#{ans.number}</td>
                        <td className="py-3">
                          <span className={`font-bold ${ans.isCorrect ? 'text-success' : 'text-danger'}`}>
                            {studentAnsStr || '未作答'}
                          </span>
                        </td>
                        <td className="py-3 opacity-80">{correctAnsStr}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
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
    </div>
  );
}
