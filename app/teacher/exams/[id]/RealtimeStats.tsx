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
  onCheckinsChange: (checkins: any[]) => void;
};

function toLocalDatetimeInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RealtimeStats({ examId, submissions, checkins, classStudents, examTotalScore, mode, examSettings, onCheckinsChange }: RealtimeStatsProps) {
  const [showScores, setShowScores] = useState(false);
  const [now, setNow] = useState(new Date());

  // Settings state
  const [deadline, setDeadline] = useState(toLocalDatetimeInput(examSettings.deadline));
  const [lateDeadline, setLateDeadline] = useState(toLocalDatetimeInput(examSettings.lateDeadline));
  const [extraOpen, setExtraOpen] = useState(examSettings.extraOpen);
  const [lateMarkEnabled, setLateMarkEnabled] = useState(examSettings.lateMarkEnabled);
  const [savingSettings, setSavingSettings] = useState(false);

  // Recall modal
  const [recallTarget, setRecallTarget] = useState<any | null>(null);
  const [recalling, setRecalling] = useState(false);

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
            {mode === 'digital' && deadline && (
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

        {/* ── Settings bar (digital mode only) ── */}
        {mode === 'digital' && (
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
        )}
      </div>

      {/* ── Student Grid ── */}
      {allStudents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
          {mode === 'digital' ? '尚無學生資料，請先在「班級管理」建立班級名單' : '目前還沒有學生繳交試卷'}
        </div>
      ) : (
        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 align-content-start">

            {/* Submitted students */}
            {allStudents.filter(s => s.status === 'submitted').map(s => {
              const sub = s.submission;
              return (
                <div key={s.name} style={{ backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: '8px', padding: '0.6rem', border: '1px solid var(--success)', position: 'relative' }}>
                  <span style={{ position: 'absolute', top: '0.4rem', right: '0.4rem', fontSize: '0.62rem', fontWeight: 700, color: 'var(--success)', background: 'rgba(34,197,94,0.15)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>已繳交</span>
                  {sub?.isLate && (
                    <span style={{ position: 'absolute', bottom: '0.4rem', right: '0.4rem', fontSize: '0.6rem', fontWeight: 700, color: 'var(--warning)', background: 'rgba(234,179,8,0.15)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>遲交 -{sub.latePenalty}</span>
                  )}
                  <div style={{ fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.15rem' }}>{s.seatNumber}號</div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.name}</div>
                  {showScores && sub && (
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.2rem' }}>
                      {sub.isLate && sub.rawScore != null ? (
                        <span style={{ fontSize: '0.7rem' }}>
                          <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{sub.rawScore.toFixed(1)}</span>
                          {' → '}{sub.totalScore.toFixed(1)}
                        </span>
                      ) : sub.totalScore.toFixed(1)}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Checked-in (digital mode) */}
            {mode === 'digital' && allStudents.filter(s => s.status === 'checkedin').map(s => (
              <div
                key={s.name}
                onClick={() => setRecallTarget(s.checkin)}
                style={{ backgroundColor: 'var(--secondary)', borderRadius: '8px', padding: '0.6rem', border: '1px solid var(--border)', position: 'relative', cursor: 'pointer' }}
                title="點擊可收回答案卡"
              >
                <span style={{ position: 'absolute', top: '0.4rem', right: '0.4rem', fontSize: '0.62rem', fontWeight: 700, color: 'var(--foreground)', background: 'var(--background)', padding: '0.1rem 0.35rem', borderRadius: '4px', border: '1px solid var(--border)' }}>已領取</span>
                <div style={{ fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.15rem' }}>{s.seatNumber}號</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.name}</div>
              </div>
            ))}

            {/* Missing students */}
            {allStudents.filter(s => s.status === 'missing').map(s => (
              <div key={s.name} style={{ backgroundColor: 'var(--background)', borderRadius: '8px', padding: '0.6rem', border: '1px dashed var(--danger)', position: 'relative', opacity: 0.7 }}>
                <span style={{ position: 'absolute', top: '0.4rem', right: '0.4rem', fontSize: '0.62rem', fontWeight: 700, color: 'var(--danger)', background: 'rgba(239,68,68,0.1)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>缺交</span>
                <div style={{ fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.15rem' }}>{s.seatNumber}號</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--danger)' }}>{s.name}</div>
              </div>
            ))}
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
