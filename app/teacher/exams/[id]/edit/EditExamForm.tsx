'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Camera, X } from 'lucide-react';
import Link from 'next/link';
import { OMRScanner } from '@/components/OMRScanner';

interface QuestionDef {
  number: number;
  correctAnswers: string[];
  points: number | '';
}

export function EditExamForm({ initialExam }: { initialExam: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: initialExam.name || '',
    classes: initialExam.targetClass || '', // Single class name
    date: initialExam.date ? new Date(initialExam.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    totalQuestions: initialExam.totalQuestions || 75,
    totalScore: initialExam.totalScore || 100,
    note: initialExam.note || ''
  });

  const [classesList, setClassesList] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch('/api/classes').then(r => r.json()).then(data => {
      setClassesList(data);
    });
  }, []);

  const [questions, setQuestions] = useState<QuestionDef[]>(
    Array.from({ length: formData.totalQuestions }, (_, i) => {
      const existing = initialExam.questions?.find((q: any) => q.number === i + 1);
      let correctAns = [];
      try {
        if (existing?.correctAnswers) {
          correctAns = JSON.parse(existing.correctAnswers);
        }
      } catch (e) {}
      
      return {
        number: i + 1,
        correctAnswers: correctAns,
        points: existing?.points ?? '',
      };
    })
  );

  const [fastInputs, setFastInputs] = useState<string[]>(Array(Math.ceil(formData.totalQuestions / 5)).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const pointsInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize fast inputs based on questions
  useEffect(() => {
    const numGroups = Math.ceil(formData.totalQuestions / 5);
    const newFastInputs = [];
    for (let i = 0; i < numGroups; i++) {
      let newGroupStr = [];
      for (let j = 0; j < 5; j++) {
        const qIndex = i * 5 + j;
        if (qIndex < formData.totalQuestions) {
          const ans = questions[qIndex]?.correctAnswers;
          if (ans && ans.length > 0) {
            newGroupStr.push(ans.join(''));
          } else {
            newGroupStr.push('');
          }
        }
      }
      while (newGroupStr.length > 0 && newGroupStr[newGroupStr.length - 1] === '') {
        newGroupStr.pop();
      }
      newFastInputs.push(newGroupStr.join(' '));
    }
    setFastInputs(newFastInputs);
  }, []); // Run once on mount

  // Update questions array when total questions change
  const handleTotalQuestionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setFormData(prev => ({ ...prev, totalQuestions: '' as unknown as number }));
      return;
    }
    
    let num = parseInt(val);
    if (isNaN(num)) return;
    if (num > 150) num = 150;
    if (num < 0) num = 0;
    
    setFormData(prev => ({ ...prev, totalQuestions: num }));
    
    setQuestions(prev => {
      if (num > prev.length) {
        return [...prev, ...Array.from({ length: num - prev.length }, (_, i) => ({
          number: prev.length + i + 1,
          correctAnswers: [] as string[],
          points: '' as number | '',
        }))];
      }
      return prev; // Never shrink to prevent data loss during typing
    });

    const numGroups = Math.ceil(num / 5);
    setFastInputs(prev => {
      if (numGroups > prev.length) {
        return [...prev, ...Array(numGroups - prev.length).fill('')];
      }
      return prev; // Never shrink
    });
  };

  const handleFastInputChange = (index: number, value: string) => {
    const cleanValue = value.toUpperCase().replace(/[^A-E1-5 \/]/g, '').replace(/^\s+/, '');
    
    let mappedValue = cleanValue.split('').map(c => {
      const map: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E' };
      return map[c] || c;
    }).join('');

    let validTokens = mappedValue.split(' ').filter(Boolean);
    const expectedTokens = Math.min(5, Number(formData.totalQuestions) - index * 5);

    if (validTokens.length > expectedTokens) {
      validTokens = validTokens.slice(0, expectedTokens);
      mappedValue = validTokens.join(' ') + ' ';
    }

    setFastInputs(prev => {
      const next = [...prev];
      next[index] = mappedValue;
      return next;
    });

    setQuestions(prev => {
      const newQ = [...prev];
      for (let i = 0; i < expectedTokens; i++) {
        const qIndex = index * 5 + i;
        if (qIndex < newQ.length) {
          const token = validTokens[i];
          if (token) {
            let parsedTokens = [];
            if (token.includes('/')) {
              const parts = token.split('/').filter(Boolean);
              const formattedParts = parts.map(part => Array.from(new Set(part.split(''))).sort().join(''));
              parsedTokens = [Array.from(new Set(formattedParts)).join('/')];
            } else {
              parsedTokens = Array.from(new Set(token.split(''))).sort();
            }
            newQ[qIndex].correctAnswers = parsedTokens;
          } else {
            newQ[qIndex].correctAnswers = [];
          }
        }
      }
      return newQ;
    });

    if (validTokens.length === expectedTokens && mappedValue.endsWith(' ')) {
      if (index < fastInputs.length - 1) {
        setTimeout(() => {
          inputRefs.current[index + 1]?.focus();
        }, 10);
      }
    }
  };

  const handleFastInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === ' ' || e.key === 'Enter') {
      const val = fastInputs[index];
      const validTokens = val.split(' ').filter(Boolean);
      const expectedTokens = Math.min(5, Number(formData.totalQuestions) - index * 5);
      if (validTokens.length >= expectedTokens) {
        e.preventDefault();
        if (index < fastInputs.length - 1) {
          inputRefs.current[index + 1]?.focus();
        }
      }
    } else if (e.key === 'Backspace' && fastInputs[index] === '') {
      e.preventDefault();
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const toggleAnswer = (qIndex: number, opt: string) => {
    setQuestions(prevQ => {
      const newQ = prevQ.map((q, idx) => {
        if (idx === qIndex) {
          const currentAns = q.correctAnswers;
          if (currentAns.includes(opt)) {
            return { ...q, correctAnswers: currentAns.filter(a => a !== opt) };
          } else {
            return { ...q, correctAnswers: [...currentAns, opt].sort() };
          }
        }
        return q;
      });

      const groupIndex = Math.floor(qIndex / 5);
      let newGroupStr = [];
      for (let i = 0; i < 5; i++) {
        const checkIdx = groupIndex * 5 + i;
        if (checkIdx < newQ.length) {
          const ans = newQ[checkIdx].correctAnswers;
          if (ans.length > 0) {
            newGroupStr.push(ans.join(''));
          } else {
            newGroupStr.push('');
          }
        }
      }
      while (newGroupStr.length > 0 && newGroupStr[newGroupStr.length - 1] === '') {
        newGroupStr.pop();
      }
      
      setFastInputs(prevF => {
        const nextF = [...prevF];
        nextF[groupIndex] = newGroupStr.join(' ');
        return nextF;
      });

      return newQ;
    });
  };

  const updatePoints = (qIndex: number, points: string) => {
    setQuestions(prev => {
      const newQ = [...prev];
      newQ[qIndex].points = points === '' ? '' : Number(points);
      return newQ;
    });
  };

  const handlePointKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, qIndex: number) => {
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      updatePoints(qIndex, e.key);
      if (pointsInputRefs.current[qIndex + 1]) {
        pointsInputRefs.current[qIndex + 1]?.focus();
      }
    }
  };

  const [openSections, setOpenSections] = useState({
    keyboard: true,
    click: true,
    scan: false
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleScanComplete = (result: any) => {
    if (result && result.answers) {
      setQuestions(prev => {
        const newQ = [...prev];
        result.answers.forEach((ans: any) => {
          const qIndex = ans.number - 1;
          if (qIndex >= 0 && qIndex < newQ.length) {
            newQ[qIndex].correctAnswers = [...ans.selectedAnswers];
          }
        });
        return newQ;
      });

      const newFastInputs = [];
      const numGroups = Math.ceil(formData.totalQuestions / 5);
      for (let i = 0; i < numGroups; i++) {
        let newGroupStr = [];
        for (let j = 0; j < 5; j++) {
          const qIndex = i * 5 + j;
          if (qIndex < formData.totalQuestions) {
            const ans = result.answers.find((a: any) => a.number === qIndex + 1);
            if (ans && ans.selectedAnswers.length > 0) {
              newGroupStr.push(ans.selectedAnswers.join(''));
            } else {
              newGroupStr.push('');
            }
          }
        }
        while (newGroupStr.length > 0 && newGroupStr[newGroupStr.length - 1] === '') {
          newGroupStr.pop();
        }
        newFastInputs.push(newGroupStr.join(' '));
      }
      setFastInputs(newFastInputs);
      
      setOpenSections({ keyboard: false, click: true, scan: false });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return alert('請輸入試卷名稱');
    
    setLoading(true);
    try {
      const payload = {
        ...formData,
        questions: questions.slice(0, formData.totalQuestions).map(q => ({
          ...q,
          points: q.points === '' ? null : q.points,
          isMultiple: q.correctAnswers.length > 1
        }))
      };

      const res = await fetch(`/api/exams/${initialExam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveSuccess(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
          router.push(`/teacher/exams/${initialExam.id}`);
          router.refresh();
        }, 2000);
      } else {
        alert(data.error || '儲存失敗');
      }
    } catch (err) {
      alert('網路錯誤');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-8 relative">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/teacher" className="btn btn-secondary px-2">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="m-0 flex-1">編輯試卷</h1>
      </div>

      {saveSuccess && (
        <div className="animate-fade-in" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem', borderRadius: '12px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.4)', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--success)', fontWeight: 600, fontSize: '1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>✅</span>
          <div>
            <div>試卷內容已成功儲存！</div>
            <div style={{ fontWeight: 400, fontSize: '0.85rem', opacity: 0.8 }}>若有已繳交的試卷，系統已自動重新計算分數，正在跳回試卷頁面⋯⋯</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card mb-8">
          <h2 className="mb-4">基本設定</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-1 text-sm">試卷名稱</label>
              <input
                required
                type="text"
                className="w-full"
                placeholder="例如：第一次段考"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block mb-1 text-sm">套用班級</label>
              <select
                className="w-full bg-background border border-border p-2 rounded"
                value={formData.classes}
                onChange={e => setFormData(prev => ({ ...prev, classes: e.target.value }))}
              >
                <option value="">(不指定)</option>
                {classesList.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1 text-sm">考試日期</label>
              <input
                required
                type="date"
                className="w-full"
                value={formData.date}
                onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block mb-1 text-sm">總題數</label>
              <input
                required
                type="number"
                min={1}
                max={150}
                className="w-full"
                value={formData.totalQuestions}
                onChange={handleTotalQuestionsChange}
              />
            </div>
            <div>
              <label className="block mb-1 text-sm">總分 (預設 100 分)</label>
              <input
                required
                type="number"
                min={1}
                className="w-full"
                value={formData.totalScore}
                onChange={e => setFormData(prev => ({ ...prev, totalScore: e.target.value === '' ? '' as unknown as number : parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block mb-1 text-sm">備註 (選填)</label>
            <input
              type="text"
              className="w-full"
              value={formData.note}
              onChange={e => setFormData(prev => ({ ...prev, note: e.target.value }))}
            />
          </div>
          <p className="text-sm text-warning m-0">註：若修改標準答案或配分，系統將自動為「已繳交」的學生重新批改並更新成績。</p>
        </div>

        <div className="card mb-8 p-0 overflow-hidden">
          <button 
            type="button"
            className="w-full p-4 flex justify-between items-center bg-secondary/10 hover:bg-secondary/30 transition-colors text-left border-b border-transparent"
            style={{ borderBottomColor: openSections.keyboard ? 'var(--border)' : 'transparent' }}
            onClick={() => toggleSection('keyboard')}
          >
            <h2 className="m-0 text-lg text-white">鍵盤快速輸入答案</h2>
            <span className="text-foreground/50">{openSections.keyboard ? '▼' : '▶'}</span>
          </button>
          
          {openSections.keyboard && (
            <div className="p-4">
              <p className="text-sm text-foreground opacity-80 mb-4">
                以 5 題為一個單位，支援數字 (1=A, 2=B, 3=C...) 或字母 (A~E)。請以「空格」區隔每題答案，連續輸入不加空格即代表複選 (例如：12 代表 A與B)。若某題有多種可能解答皆給分，可使用「/」區隔 (例如：A/B/AB 代表選A、選B或同時選AB皆可)。當輸入滿該區塊對應的題數並按下空格，系統將自動跳到下一格。
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
                {fastInputs.map((val, idx) => {
                  const startQ = idx * 5 + 1;
                  const endQ = Math.min(startQ + 4, formData.totalQuestions);
                  if (startQ > formData.totalQuestions) return null;
                  
                  return (
                    <div key={idx} className="flex flex-col items-center">
                      <span className="text-xs mb-1 opacity-70">{startQ}-{endQ}</span>
                      <input
                        ref={el => { inputRefs.current[idx] = el; }}
                        type="text"
                        className="text-center font-mono tracking-widest text-lg w-full max-w-[100px]"
                        style={{ backgroundColor: 'var(--background)' }}
                        value={val}
                        onChange={(e) => handleFastInputChange(idx, e.target.value)}
                        onKeyDown={(e) => handleFastInputKeyDown(e, idx)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="card mb-8 p-0 overflow-hidden">
          <button 
            type="button"
            className="w-full p-4 flex justify-between items-center bg-secondary/10 hover:bg-secondary/30 transition-colors text-left border-b border-transparent"
            style={{ borderBottomColor: openSections.click ? 'var(--border)' : 'transparent' }}
            onClick={() => toggleSection('click')}
          >
            <h2 className="m-0 text-lg text-white">點選快速設定答案</h2>
            <span className="text-foreground/50">{openSections.click ? '▼' : '▶'}</span>
          </button>
          
          {openSections.click && (
            <div className="p-4">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1rem', overflowX: 'auto' }}>
                {[0, 1, 2].map(colIndex => {
                  const activeQuestions = questions.slice(0, Number(formData.totalQuestions) || 0);
                  const columnQuestions = activeQuestions.slice(colIndex * 25, (colIndex + 1) * 25);
                  if (columnQuestions.length === 0) return null;
                  
                  return (
                  <div key={colIndex} style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '220px' }}>
                    {columnQuestions.map((q) => (
                      <div key={q.number} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', borderRadius: '6px' }} className="hover:bg-secondary-hover transition-colors group">
                        <input
                          ref={el => { pointsInputRefs.current[q.number - 1] = el; }}
                          type="number"
                          placeholder="配分"
                          style={{ width: '50px', padding: '2px 4px', fontSize: '12px', textAlign: 'center', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--background)' }}
                          value={q.points}
                          onChange={(e) => updatePoints(q.number - 1, e.target.value)}
                          onKeyDown={(e) => handlePointKeyDown(e, q.number - 1)}
                        />
                        
                        <span style={{ fontWeight: 'bold', width: '24px', textAlign: 'right', fontSize: '14px' }}>{q.number}.</span>
                        
                        <div style={{ display: 'flex', gap: '6px', marginLeft: '4px' }}>
                          {['A', 'B', 'C', 'D', 'E'].map(opt => {
                            const isSelected = q.correctAnswers.includes(opt);
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => toggleAnswer(q.number - 1, opt)}
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '50%',
                                  border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                                  backgroundColor: isSelected ? 'var(--primary)' : 'transparent',
                                  color: isSelected ? 'white' : 'var(--foreground)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  opacity: isSelected ? 1 : 0.6,
                                  transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                                  transition: 'all 0.15s ease-in-out',
                                  boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                                }}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {q.correctAnswers.length > 1 && (
                          <span style={{ fontSize: '10px', color: 'var(--warning)', marginLeft: '4px', fontWeight: 'bold' }}>複選</span>
                        )}
                      </div>
                    ))}
                  </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="card mb-8 p-0 overflow-hidden">
          <button 
            type="button"
            className="w-full p-4 flex justify-between items-center bg-secondary/10 hover:bg-secondary/30 transition-colors text-left border-b border-transparent"
            style={{ borderBottomColor: openSections.scan ? 'var(--border)' : 'transparent' }}
            onClick={() => toggleSection('scan')}
          >
            <h2 className="m-0 text-lg flex items-center gap-2 text-white">
              <Camera size={20} className="text-success" />
              掃描標準答案卡建立答案
            </h2>
            <span className="text-foreground/50">{openSections.scan ? '▼' : '▶'}</span>
          </button>
          
          {openSections.scan && (
            <div className="p-4 bg-background">
              <p className="text-sm text-foreground opacity-80 mb-4">
                請將標準答案卡對準鏡頭，系統將自動辨識塗卡內容並為您填入標準答案。
              </p>
              <div className="relative rounded-lg overflow-hidden border border-border bg-black max-w-lg mx-auto">
                <OMRScanner onScanComplete={handleScanComplete} />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4 sticky bottom-4 bg-secondary p-4 rounded-lg border shadow-lg" style={{ borderColor: 'var(--border)', zIndex: 10 }}>
          <Link href="/teacher" className="btn btn-secondary">取消</Link>
          <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={loading}>
            <Save size={18} />
            {loading ? '儲存中...' : '儲存更新'}
          </button>
        </div>
      </form>

    </div>
  );
}
