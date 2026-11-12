'use client';

import { useState, useMemo, useEffect } from 'react';
import { Folder, Users, FileText, ChevronRight, BarChart2, Play, X, ChevronLeft } from 'lucide-react';

export default function AnalyticsView({ initialExams }: { initialExams: any[] }) {
  const [groupBy, setGroupBy] = useState<'exam' | 'class'>('exam');
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  
  // Selected classes/exams inside a folder for aggregation
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Student performance percent range [minPercent, maxPercent] e.g. [0, 100]
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);

  // Top questions count filter: 'all' | 5 | 10 | 15 | 20
  const [topQuestionCount, setTopQuestionCount] = useState<number | 'all'>('all');

  // Question sorting: 'errorRate' | 'questionNumber'
  const [sortBy, setSortBy] = useState<'errorRate' | 'questionNumber'>('errorRate');

  // Presentation mode
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);

  // 1. Prepare data mapping
  // Since earlier exams might not have baseName/targetClass, we fallback to parsing the name
  const processedExams = useMemo(() => {
    return initialExams.map(exam => {
      let bName = exam.baseName;
      let tClass = exam.targetClass;
      
      if (!bName) {
        // Try to parse "ExamName - ClassName"
        const parts = exam.name.split(' - ');
        if (parts.length > 1) {
          tClass = parts.pop();
          bName = parts.join(' - ');
        } else {
          bName = exam.name;
          tClass = '預設班級';
        }
      }
      return { ...exam, bName, tClass: tClass || '未設定班級' };
    });
  }, [initialExams]);

  // 2. Grouping
  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    processedExams.forEach(exam => {
      const key = groupBy === 'exam' ? exam.bName : exam.tClass;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(exam);
    });

    // Calculate stats per group
    const result = Array.from(map.entries()).map(([key, examsInGroup]) => {
      examsInGroup.sort((a, b) => a.name.localeCompare(b.name, 'zh-TW', { numeric: true }));
      let allSubmissions: any[] = [];
      examsInGroup.forEach(e => allSubmissions.push(...e.submissions));
      
      const scores = allSubmissions.map(s => s.totalScore);
      const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const max = scores.length ? Math.max(...scores) : 0;
      const min = scores.length ? Math.min(...scores) : 0;

      return {
        key,
        exams: examsInGroup,
        submissionsCount: scores.length,
        avg,
        max,
        min
      };
    });
    
    result.sort((a, b) => a.key.localeCompare(b.key, 'zh-TW', { numeric: true }));
    return result;
  }, [processedExams, groupBy]);

  // Reset active folder when grouping changes
  const handleGroupChange = (e: any) => {
    setGroupBy(e.target.value);
    setActiveFolder(null);
  };

  const handleOpenFolder = (groupKey: string, exams: any[]) => {
    setActiveFolder(groupKey);
    // Auto-select all sub-items
    setSelectedItems(exams.map(e => e.id));
    // Reset filters to defaults
    setScoreRange([0, 100]);
    setTopQuestionCount('all');
    setSortBy('errorRate');
    setCurrentSlideIdx(0);
    setIsPresentationMode(false);
  };

  const toggleSelection = (examId: string) => {
    setSelectedItems(prev => 
      prev.includes(examId) 
        ? prev.filter(id => id !== examId)
        : [...prev, examId]
    );
  };

  const currentGroup = useMemo(() => {
    if (!activeFolder) return null;
    return groups.find(g => g.key === activeFolder) || null;
  }, [activeFolder, groups]);

  const selectedExams = useMemo(() => {
    if (!currentGroup) return [];
    return currentGroup.exams.filter(e => selectedItems.includes(e.id));
  }, [currentGroup, selectedItems]);

  const handleSelectAllClasses = () => {
    if (!currentGroup) return;
    setSelectedItems(currentGroup.exams.map(e => e.id));
  };

  const handleClearAllClasses = () => {
    setSelectedItems([]);
  };

  // All submissions in selected exams, sorted by totalScore descending
  const allSelectedSubmissions = useMemo(() => {
    const list: any[] = [];
    selectedExams.forEach(e => {
      if (Array.isArray(e.submissions)) {
        list.push(...e.submissions);
      }
    });
    return list.sort((a, b) => b.totalScore - a.totalScore);
  }, [selectedExams]);

  // Filtered submissions based on scoreRange [minP, maxP]
  const { filteredSubmissions, totalStudentCount, filteredCount, scoreMin, scoreMax } = useMemo(() => {
    const total = allSelectedSubmissions.length;
    if (total === 0) {
      return { filteredSubmissions: [], totalStudentCount: 0, filteredCount: 0, scoreMin: 0, scoreMax: 0 };
    }
    const [minP, maxP] = scoreRange;
    const startIdx = Math.floor((minP / 100) * total);
    const endIdx = maxP === 100 ? total : Math.ceil((maxP / 100) * total);
    
    const sliced = allSelectedSubmissions.slice(startIdx, Math.max(startIdx + 1, endIdx));
    const scores = sliced.map(s => s.totalScore);
    const sMin = scores.length ? Math.min(...scores) : 0;
    const sMax = scores.length ? Math.max(...scores) : 0;

    return {
      filteredSubmissions: sliced,
      totalStudentCount: total,
      filteredCount: sliced.length,
      scoreMin: sMin,
      scoreMax: sMax,
    };
  }, [allSelectedSubmissions, scoreRange]);

  // 3. Compute Item Analysis for active folder and selected items
  const itemAnalysis = useMemo(() => {
    if (!activeFolder || selectedExams.length === 0) return [];

    const baseExam = selectedExams[0];
    if (!baseExam || !Array.isArray(baseExam.questions)) return [];

    // Map question number -> stats
    const statsMap = new Map<number, {
      number: number,
      correctAnswers: string[],
      totalAnswers: number,
      wrongCount: number,
      optionsCount: Record<string, number>,
      rank: number,
      errorRate: number,
    }>();

    baseExam.questions.forEach((q: any) => {
      statsMap.set(q.number, {
        number: q.number,
        correctAnswers: JSON.parse(q.correctAnswers || '[]'),
        totalAnswers: 0,
        wrongCount: 0,
        optionsCount: { 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0, '未作答': 0 },
        rank: 0,
        errorRate: 0,
      });
    });

    // Aggregate filtered submissions
    filteredSubmissions.forEach((sub: any) => {
      sub.answers.forEach((ans: any) => {
        const stat = statsMap.get(ans.number);
        if (stat) {
          stat.totalAnswers++;
          if (!ans.isCorrect) stat.wrongCount++;

          const sel = ans.selectedAnswers || '';
          if (sel === '') {
            stat.optionsCount['未作答'] = (stat.optionsCount['未作答'] || 0) + 1;
          } else {
            const opts = sel.split('');
            opts.forEach((o: string) => {
              if (stat.optionsCount[o] !== undefined) {
                stat.optionsCount[o]++;
              } else {
                stat.optionsCount[o] = 1;
              }
            });
          }
        }
      });
    });

    // Calculate error rates
    const calculated = Array.from(statsMap.values()).map(stat => {
      const errorRate = stat.totalAnswers > 0 ? (stat.wrongCount / stat.totalAnswers) * 100 : 0;
      return { ...stat, errorRate };
    });

    // 1. Sort by errorRate descending to assign global rank
    calculated.sort((a, b) => b.errorRate - a.errorRate);
    calculated.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    // 2. Filter by question count (Top N by error rate)
    let questionsToShow = calculated;
    if (topQuestionCount !== 'all') {
      questionsToShow = calculated.slice(0, topQuestionCount);
    }

    // 3. Re-sort if user chose 'questionNumber'
    if (sortBy === 'questionNumber') {
      questionsToShow = [...questionsToShow].sort((a, b) => a.number - b.number);
    }

    return questionsToShow;
  }, [activeFolder, selectedExams, filteredSubmissions, topQuestionCount, sortBy]);

  // Keyboard navigation for presentation mode
  useEffect(() => {
    if (!isPresentationMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPresentationMode(false);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrentSlideIdx(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        setCurrentSlideIdx(prev => Math.min((itemAnalysis?.length || 1) - 1, prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPresentationMode, itemAnalysis]);

  return (
    <div>
      {/* Dual slider custom thumb styling */}
      <style>{`
        .dual-slider-thumb::-webkit-slider-thumb {
          appearance: none;
          pointer-events: auto;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ffffff;
          border: 3px solid var(--primary);
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(0,0,0,0.5);
          transition: transform 0.1s;
        }
        .dual-slider-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.18);
        }
        .dual-slider-thumb::-moz-range-thumb {
          pointer-events: auto;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ffffff;
          border: 3px solid var(--primary);
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(0,0,0,0.5);
        }
      `}</style>

      {/* Header & Controls */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="m-0 flex items-center gap-2" style={{ color: '#ffffff', fontSize: '1.35rem', fontWeight: 600 }}>
          <BarChart2 className="text-primary" size={24} />
          {activeFolder ? (
            <>
              <button
                style={{
                  fontSize: 'inherit',
                  fontWeight: 'inherit',
                  color: '#ffffff',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
                className="hover:underline hover:opacity-80 transition-opacity"
                onClick={() => setActiveFolder(null)}
              >
                所有資料夾
              </button>
              <ChevronRight size={18} style={{ color: '#ffffff', opacity: 0.6 }} />
              <span style={{ fontSize: 'inherit', fontWeight: 'inherit', color: '#ffffff' }}>{activeFolder}</span>
            </>
          ) : (
            <span style={{ fontSize: 'inherit', fontWeight: 'inherit', color: '#ffffff' }}>所有資料夾</span>
          )}
        </h2>

        {!activeFolder && (
          <div className="flex items-center gap-3 bg-secondary/30 p-1 rounded-lg">
            <label className="text-sm pl-2">分類方式：</label>
            <select 
              value={groupBy}
              onChange={handleGroupChange}
              className="bg-background border-border text-sm py-1 px-3 rounded"
            >
              <option value="exam">依「考試」分群</option>
              <option value="class">依「班級」分群</option>
            </select>
          </div>
        )}
      </div>

      {/* View: Folders Grid */}
      {!activeFolder && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {groups.map(group => {
            const hasSubmissions = group.submissionsCount > 0;
            return (
              <div 
                key={group.key} 
                className="card cursor-pointer transition-all duration-200 group flex flex-col justify-between hover:border-primary/50 hover:shadow-lg"
                style={{
                  backgroundColor: 'var(--secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '1.25rem',
                  gap: '1rem',
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: hasSubmissions ? 1 : 0.88,
                }}
                onClick={() => handleOpenFolder(group.key, group.exams)}
              >
                {/* Header: Icon + Title + Submissions Badge */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div 
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '11px',
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.15) 100%)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          color: '#60a5fa',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                        className="group-hover:scale-105 transition-transform"
                      >
                        {groupBy === 'exam' ? <BarChart2 size={24} /> : <Users size={24} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="m-0 text-white font-bold truncate" style={{ fontSize: '1.25rem', letterSpacing: '-0.01em' }}>
                          {group.key}
                        </h3>
                        <p className="text-xs opacity-60 m-0 mt-0.5 truncate">
                          {group.exams.length} 個{groupBy === 'exam' ? '班級' : '考試'} • {group.submissionsCount} 份繳交
                        </p>
                      </div>
                    </div>

                    <span 
                      style={{
                        backgroundColor: hasSubmissions ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                        color: hasSubmissions ? '#60a5fa' : '#94a3b8',
                        border: hasSubmissions ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '9999px',
                        padding: '0.2rem 0.6rem',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {hasSubmissions ? `${group.submissionsCount} 卷` : '未收卷'}
                    </span>
                  </div>

                  {/* Group Mini Stats: 3 KPI Blocks or Empty State */}
                  {hasSubmissions ? (
                    <div className="grid grid-cols-3 gap-2">
                      <div 
                        style={{
                          backgroundColor: 'rgba(59, 130, 246, 0.08)',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                          borderRadius: '10px',
                          padding: '0.65rem 0.5rem',
                          textAlign: 'center',
                        }}
                      >
                        <div className="text-xs opacity-60 mb-0.5">平均</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#60a5fa', letterSpacing: '-0.02em' }}>
                          {group.avg}
                        </div>
                      </div>

                      <div 
                        style={{
                          backgroundColor: 'rgba(16, 185, 129, 0.08)',
                          border: '1px solid rgba(16, 185, 129, 0.2)',
                          borderRadius: '10px',
                          padding: '0.65rem 0.5rem',
                          textAlign: 'center',
                        }}
                      >
                        <div className="text-xs opacity-60 mb-0.5">最高</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399', letterSpacing: '-0.02em' }}>
                          {group.max}
                        </div>
                      </div>

                      <div 
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: '10px',
                          padding: '0.65rem 0.5rem',
                          textAlign: 'center',
                        }}
                      >
                        <div className="text-xs opacity-60 mb-0.5">最低</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f87171', letterSpacing: '-0.02em' }}>
                          {group.min}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div 
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        border: '1px dashed rgba(255, 255, 255, 0.12)',
                        borderRadius: '10px',
                        padding: '0.9rem',
                        textAlign: 'center',
                      }}
                    >
                      <div className="text-xs opacity-50">尚未有學生繳卷 • 暫無統計數據</div>
                    </div>
                  )}
                </div>

                {/* Footer action link */}
                <div 
                  className="pt-3 border-t flex items-center justify-between"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
                >
                  <span 
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: hasSubmissions ? '#60a5fa' : '#94a3b8',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                    className="group-hover:translate-x-1 transition-transform"
                  >
                    <span>{hasSubmissions ? '進入試題檢討' : '查看試卷資訊'}</span>
                    <ChevronRight size={16} />
                  </span>

                  <span className="text-xs opacity-50">
                    {groupBy === 'exam' ? '點擊展開分析' : '檢視班級表現'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View: Folder Details (Item Analysis) */}
      {activeFolder && (
        <div className="animate-fade-in">
          {/* Multi-Dimensional Filter Control Panel */}
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* 1. Class Selection */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                  選擇要合併分析的{groupBy === 'exam' ? '班級' : '考試'}：
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={handleSelectAllClasses}
                    style={{
                      padding: '0.2rem 0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      color: '#ffffff',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                    }}
                    className="hover:bg-white/15 transition-colors"
                  >
                    全選
                  </button>
                  <button
                    onClick={handleClearAllClasses}
                    style={{
                      padding: '0.2rem 0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      color: '#ffffff',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                    }}
                    className="hover:bg-white/15 transition-colors"
                  >
                    清除
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1.25rem' }}>
                {groups.find(g => g.key === activeFolder)?.exams.map(exam => (
                  <label 
                    key={exam.id} 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      cursor: 'pointer',
                      fontSize: '1.05rem',
                      color: '#ffffff',
                      userSelect: 'none',
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={selectedItems.includes(exam.id)}
                      onChange={() => toggleSelection(exam.id)}
                      style={{
                        width: '16px',
                        height: '16px',
                        accentColor: 'var(--primary)',
                        cursor: 'pointer',
                        margin: 0,
                      }}
                    />
                    <span>{groupBy === 'exam' ? exam.tClass : exam.bName}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 2. Student Performance Range Filter */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.1rem' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.75rem' }}>
                依學生表現篩選群體：
              </div>

              {/* Preset range buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {[
                  { label: '全體學生 (100%)', range: [0, 100] as [number, number] },
                  { label: '成績前 25%', range: [0, 25] as [number, number] },
                  { label: '成績前 50%', range: [0, 50] as [number, number] },
                  { label: '成績後 50%', range: [50, 100] as [number, number] },
                  { label: '成績後 25%', range: [75, 100] as [number, number] },
                ].map(preset => {
                  const isActive = scoreRange[0] === preset.range[0] && scoreRange[1] === preset.range[1];
                  return (
                    <button
                      key={preset.label}
                      onClick={() => setScoreRange(preset.range)}
                      style={{
                        padding: '0.35rem 0.85rem',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: isActive ? 700 : 400,
                        backgroundColor: isActive ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                        color: '#ffffff',
                        border: isActive ? '1px solid var(--primary)' : '1px solid var(--border)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      className={isActive ? '' : 'hover:bg-white/10'}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Dual Range Slider */}
              <div style={{ maxWidth: '620px', padding: '0.25rem 0.5rem' }}>
                <div style={{ position: 'relative', height: '32px', display: 'flex', alignItems: 'center' }}>
                  {/* Background Track */}
                  <div style={{ position: 'absolute', left: 0, right: 0, height: '6px', borderRadius: '3px', backgroundColor: 'var(--border)' }} />
                  {/* Active Highlighted Range */}
                  <div style={{
                    position: 'absolute',
                    left: `${scoreRange[0]}%`,
                    width: `${scoreRange[1] - scoreRange[0]}%`,
                    height: '6px',
                    borderRadius: '3px',
                    backgroundColor: 'var(--primary)',
                  }} />
                  {/* Min range input */}
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={scoreRange[0]}
                    onChange={e => {
                      const val = Math.min(Number(e.target.value), scoreRange[1]);
                      setScoreRange([val, scoreRange[1]]);
                    }}
                    className="dual-slider-thumb"
                    style={{
                      position: 'absolute',
                      left: 0,
                      width: '100%',
                      margin: 0,
                      appearance: 'none',
                      background: 'transparent',
                      pointerEvents: 'none',
                      zIndex: scoreRange[0] > 50 ? 5 : 3,
                    }}
                  />
                  {/* Max range input */}
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={scoreRange[1]}
                    onChange={e => {
                      const val = Math.max(Number(e.target.value), scoreRange[0]);
                      setScoreRange([scoreRange[0], val]);
                    }}
                    className="dual-slider-thumb"
                    style={{
                      position: 'absolute',
                      left: 0,
                      width: '100%',
                      margin: 0,
                      appearance: 'none',
                      background: 'transparent',
                      pointerEvents: 'none',
                      zIndex: 4,
                    }}
                  />
                </div>

                {/* Range Label & Realtime Student Count Hint */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', gap: '0.5rem', fontSize: '0.88rem' }}>
                  <span style={{ color: 'var(--foreground)', opacity: 0.85 }}>
                    目前區間：前 <strong style={{ color: '#ffffff' }}>{scoreRange[0]}%</strong> ~ 前 <strong style={{ color: '#ffffff' }}>{scoreRange[1]}%</strong>
                  </span>
                  <span style={{ color: '#34d399', fontWeight: 600 }}>
                    💡 符合資格 {filteredCount} 人 / 總應考 {totalStudentCount} 人
                    {filteredCount > 0 ? ` (成績分佈：${scoreMin} ~ ${scoreMax} 分)` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Question Count & Sorting */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.1rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Question Count Filter */}
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.5rem' }}>
                  依錯誤率篩選題數：
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {[
                    { label: '全部題目', value: 'all' as const },
                    { label: '前 5 題', value: 5 },
                    { label: '前 10 題', value: 10 },
                    { label: '前 15 題', value: 15 },
                    { label: '前 20 題', value: 20 },
                  ].map(opt => {
                    const isSelected = topQuestionCount === opt.value;
                    return (
                      <button
                        key={opt.label}
                        onClick={() => setTopQuestionCount(opt.value)}
                        style={{
                          padding: '0.35rem 0.8rem',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          fontWeight: isSelected ? 700 : 400,
                          backgroundColor: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                          color: '#ffffff',
                          border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        className={isSelected ? '' : 'hover:bg-white/10'}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sorting Order */}
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.5rem' }}>
                  目前篩選題目的排序方式：
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setSortBy('errorRate')}
                    style={{
                      padding: '0.35rem 0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: sortBy === 'errorRate' ? 700 : 400,
                      backgroundColor: sortBy === 'errorRate' ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                      color: '#ffffff',
                      border: sortBy === 'errorRate' ? '1px solid var(--primary)' : '1px solid var(--border)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.2s',
                    }}
                    className={sortBy === 'errorRate' ? '' : 'hover:bg-white/10'}
                  >
                    依錯誤率高至低
                  </button>
                  <button
                    onClick={() => setSortBy('questionNumber')}
                    style={{
                      padding: '0.35rem 0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: sortBy === 'questionNumber' ? 700 : 400,
                      backgroundColor: sortBy === 'questionNumber' ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                      color: '#ffffff',
                      border: sortBy === 'questionNumber' ? '1px solid var(--primary)' : '1px solid var(--border)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.2s',
                    }}
                    className={sortBy === 'questionNumber' ? '' : 'hover:bg-white/10'}
                  >
                    依題號順序 (1~N)
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Item Analysis Table */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 className="m-0 flex items-center gap-2" style={{ color: '#ffffff', fontSize: '1.15rem' }}>
                <FileText size={20} className="text-primary" />
                題目錯誤率分析表
                <span className="text-xs font-normal opacity-60 ml-2">
                  (共 {itemAnalysis?.length || 0} 題，{sortBy === 'errorRate' ? '依錯誤率排序' : '依題號順序排序'})
                </span>
              </h3>

              <button
                onClick={() => { setIsPresentationMode(true); setCurrentSlideIdx(0); }}
                disabled={!itemAnalysis || itemAnalysis.length === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.45rem 1.1rem',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  backgroundColor: !itemAnalysis || itemAnalysis.length === 0 ? 'var(--border)' : 'var(--primary)',
                  color: '#ffffff',
                  cursor: !itemAnalysis || itemAnalysis.length === 0 ? 'not-allowed' : 'pointer',
                  boxShadow: !itemAnalysis || itemAnalysis.length === 0 ? 'none' : '0 2px 10px rgba(59, 130, 246, 0.4)',
                  transition: 'all 0.2s',
                }}
                className={!itemAnalysis || itemAnalysis.length === 0 ? '' : 'hover:brightness-110'}
              >
                <Play size={15} fill="currentColor" />
                進入簡報檢討模式
              </button>
            </div>

            {itemAnalysis?.length === 0 ? (
              <div className="text-center py-8 opacity-50">請至少選擇一個班級項目，或目前篩選條件下無作答紀錄</div>
            ) : (
              <div className="overflow-x-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', opacity: 0.6, fontWeight: 600, whiteSpace: 'nowrap' }}>排名</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', opacity: 0.6, fontWeight: 600, whiteSpace: 'nowrap' }}>題號</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center', opacity: 0.6, fontWeight: 600, whiteSpace: 'nowrap', minWidth: '120px' }}>錯誤率</th>
                      {['A', 'B', 'C', 'D', 'E'].map(opt => (
                        <th key={opt} style={{ padding: '0.5rem 0.75rem', textAlign: 'center', opacity: 0.6, fontWeight: 600, minWidth: '64px' }}>{opt}</th>
                      ))}
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center', opacity: 0.6, fontWeight: 600, whiteSpace: 'nowrap' }}>未作答</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemAnalysis?.map((stat, idx) => {
                      const rowBg = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)';
                      const isTop3 = stat.rank <= 3;
                      return (
                        <tr key={stat.number} style={{ backgroundColor: rowBg, borderBottom: '1px solid var(--border)' }}>
                          {/* Rank */}
                          <td style={{ padding: '0.6rem 0.75rem' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: '1.75rem', height: '1.75rem', borderRadius: '50%', fontSize: '0.75rem', fontWeight: 700,
                              background: isTop3 ? 'var(--danger)' : 'var(--secondary)',
                              color: isTop3 ? 'white' : 'var(--foreground)'
                            }}>#{stat.rank}</span>
                          </td>
                          {/* Q Number */}
                          <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>第 {stat.number} 題</td>
                          {/* Error Rate Bar */}
                          <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                              <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'var(--secondary)', overflow: 'hidden', minWidth: '60px' }}>
                                <div style={{ height: '100%', borderRadius: '4px', width: `${stat.errorRate}%`, background: isTop3 ? 'var(--danger)' : 'var(--warning)', transition: 'width 0.4s' }} />
                              </div>
                              <span style={{ fontWeight: 700, color: isTop3 ? 'var(--danger)' : 'var(--warning)', minWidth: '3rem', textAlign: 'center' }}>
                                {Math.round(stat.errorRate)}%
                              </span>
                            </div>
                          </td>
                          {/* Per-option cells */}
                          {['A', 'B', 'C', 'D', 'E'].map(opt => {
                            const count = stat.optionsCount[opt] || 0;
                            const pct = stat.totalAnswers ? Math.round((count / stat.totalAnswers) * 100) : 0;
                            const isCorrect = stat.correctAnswers.includes(opt);
                            return (
                              <td key={opt} style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                                <div style={{
                                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                                  padding: '0.3rem 0.4rem', borderRadius: '6px',
                                  background: isCorrect ? 'rgba(34,197,94,0.12)' : pct > 30 ? 'rgba(239,68,68,0.08)' : 'transparent',
                                  border: isCorrect ? '1px solid rgba(34,197,94,0.4)' : '1px solid transparent',
                                }}>
                                  <span style={{ fontWeight: 700, fontSize: '0.8rem', color: isCorrect ? 'var(--success)' : pct > 30 ? 'var(--danger)' : 'var(--foreground)' }}>
                                    {pct}%
                                  </span>
                                  <div style={{ width: '36px', height: '5px', borderRadius: '3px', background: 'var(--secondary)', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: '3px', background: isCorrect ? 'var(--success)' : pct > 30 ? 'var(--danger)' : 'var(--border)' }} />
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                          {/* 未作答 */}
                          <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                            {stat.optionsCount['未作答'] > 0 ? (
                              <span style={{ fontSize: '0.78rem', opacity: 0.6 }}>
                                {Math.round((stat.optionsCount['未作答'] / stat.totalAnswers) * 100)}%
                              </span>
                            ) : <span style={{ opacity: 0.2 }}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Presentation Mode Fullscreen Overlay ── */}
      {isPresentationMode && itemAnalysis && itemAnalysis.length > 0 && (() => {
        const currentQ = itemAnalysis[currentSlideIdx];
        if (!currentQ) return null;

        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: '#0a101d',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.25rem 2.5rem',
            overflow: 'hidden',
          }}>
            {/* Top Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '0.85rem',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                <span style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}>
                  <Play size={12} fill="currentColor" /> 簡報檢討模式
                </span>
                <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '1.15rem' }}>
                  {activeFolder}
                </span>
                <span style={{ color: 'var(--foreground)', opacity: 0.7, fontSize: '0.85rem' }}>
                  (分析群體：{scoreRange[0] === 0 && scoreRange[1] === 100 ? '全體學生' : `前 ${scoreRange[0]}% ~ ${scoreRange[1]}%`}，共 {filteredCount} 人)
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  進度：第 <strong style={{ color: 'var(--primary)' }}>{currentSlideIdx + 1}</strong> / {itemAnalysis.length} 題
                </span>
                <button
                  onClick={() => setIsPresentationMode(false)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.4rem 0.85rem',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  className="hover:bg-red-500/25 transition-colors"
                >
                  <X size={16} /> 退出簡報 (Esc)
                </button>
              </div>
            </div>

            {/* Upper Half: Question Details & Distribution Bars */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '1rem 0',
              maxWidth: '960px',
              width: '100%',
              margin: '0 auto',
            }}>
              {/* Question Header Card */}
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.25rem 1.75rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px' }}>
                    第 {currentQ.number} 題
                  </div>
                  <div style={{
                    padding: '0.4rem 0.95rem',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(16, 185, 129, 0.18)',
                    border: '1px solid rgba(16, 185, 129, 0.45)',
                    color: '#34d399',
                    fontSize: '1.15rem',
                    fontWeight: 800,
                  }}>
                    正確答案：{currentQ.correctAnswers.join(', ') || '無'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '2px' }}>全班錯誤率</div>
                    <div style={{
                      fontSize: '2rem',
                      fontWeight: 800,
                      color: currentQ.errorRate >= 50 ? 'var(--danger)' : currentQ.errorRate >= 25 ? 'var(--warning)' : 'var(--success)',
                    }}>
                      {Math.round(currentQ.errorRate)}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '2px' }}>錯誤率排名</div>
                    <div style={{
                      fontSize: '1.6rem',
                      fontWeight: 700,
                      color: currentQ.rank <= 3 ? 'var(--danger)' : '#ffffff',
                    }}>
                      #{currentQ.rank}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border)', paddingLeft: '1.25rem' }}>
                    <div style={{ fontSize: '0.85rem', opacity: 0.75 }}>總作答：<strong style={{ color: '#ffffff' }}>{currentQ.totalAnswers}</strong> 人</div>
                    <div style={{ fontSize: '0.85rem', color: '#f87171' }}>答錯：<strong>{currentQ.wrongCount}</strong> 人</div>
                    <div style={{ fontSize: '0.85rem', color: '#34d399' }}>答對：<strong>{currentQ.totalAnswers - currentQ.wrongCount}</strong> 人</div>
                  </div>
                </div>
              </div>

              {/* Big Option Distribution Bars */}
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.25rem 1.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--foreground)', opacity: 0.8, marginBottom: '0.25rem' }}>
                  各選項作答分佈：
                </div>

                {['A', 'B', 'C', 'D', 'E', '未作答'].map(opt => {
                  const count = currentQ.optionsCount[opt] || 0;
                  const pct = currentQ.totalAnswers ? Math.round((count / currentQ.totalAnswers) * 100) : 0;
                  const isCorrect = currentQ.correctAnswers.includes(opt);
                  const isTrap = !isCorrect && pct >= 30;

                  return (
                    <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {/* Option Label Badge */}
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        flexShrink: 0,
                        backgroundColor: isCorrect ? 'var(--success)' : isTrap ? 'var(--danger)' : 'rgba(255,255,255,0.08)',
                        color: isCorrect || isTrap ? '#ffffff' : 'var(--foreground)',
                      }}>
                        {opt === '未作答' ? '—' : opt}
                      </div>

                      {/* Bar Container */}
                      <div style={{
                        flex: 1,
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        overflow: 'hidden',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 0.85rem',
                      }}>
                        {/* Progress Fill */}
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${pct}%`,
                          borderRadius: '7px',
                          backgroundColor: isCorrect
                            ? 'rgba(16, 185, 129, 0.45)'
                            : isTrap
                            ? 'rgba(239, 68, 68, 0.4)'
                            : 'rgba(255,255,255,0.1)',
                          transition: 'width 0.4s ease-out',
                        }} />

                        {/* Text Overlay inside Bar */}
                        <div style={{
                          position: 'relative',
                          zIndex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                        }}>
                          <span style={{
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            color: isCorrect ? '#34d399' : isTrap ? '#f87171' : '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}>
                            {opt === '未作答' ? '未作答' : `選項 ${opt}`}
                            {isCorrect && (
                              <span style={{ fontSize: '0.8rem', padding: '0.1rem 0.45rem', borderRadius: '4px', backgroundColor: 'var(--success)', color: '#ffffff' }}>
                                ★ 正確答案
                              </span>
                            )}
                            {isTrap && (
                              <span style={{ fontSize: '0.8rem', padding: '0.1rem 0.45rem', borderRadius: '4px', backgroundColor: 'var(--danger)', color: '#ffffff' }}>
                                ⚠️ 誘答陷阱
                              </span>
                            )}
                          </span>

                          <span style={{ fontWeight: 800, fontSize: '1rem', color: '#ffffff' }}>
                            {pct}% <span style={{ fontSize: '0.85rem', opacity: 0.7, fontWeight: 500 }}>({count}人)</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Lower Half: Controls & Jump Selector */}
            <div style={{
              flexShrink: 0,
              paddingTop: '0.85rem',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              maxWidth: '960px',
              width: '100%',
              margin: '0 auto',
            }}>
              {/* Prev / Next Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  onClick={() => setCurrentSlideIdx(i => Math.max(0, i - 1))}
                  disabled={currentSlideIdx === 0}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.4rem',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    backgroundColor: currentSlideIdx === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)',
                    color: currentSlideIdx === 0 ? 'rgba(255,255,255,0.3)' : '#ffffff',
                    border: '1px solid var(--border)',
                    cursor: currentSlideIdx === 0 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                  className={currentSlideIdx === 0 ? '' : 'hover:bg-white/20'}
                >
                  <ChevronLeft size={20} /> 上一題
                </button>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                    第 {currentSlideIdx + 1} 題 / 共 {itemAnalysis.length} 題
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '2px' }}>
                    可使用鍵盤 ← / → 或無線簡報筆切換
                  </div>
                </div>

                <button
                  onClick={() => setCurrentSlideIdx(i => Math.min(itemAnalysis.length - 1, i + 1))}
                  disabled={currentSlideIdx === itemAnalysis.length - 1}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.4rem',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    backgroundColor: currentSlideIdx === itemAnalysis.length - 1 ? 'rgba(255,255,255,0.05)' : 'var(--primary)',
                    color: currentSlideIdx === itemAnalysis.length - 1 ? 'rgba(255,255,255,0.3)' : '#ffffff',
                    border: '1px solid transparent',
                    cursor: currentSlideIdx === itemAnalysis.length - 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                  className={currentSlideIdx === itemAnalysis.length - 1 ? '' : 'hover:brightness-110'}
                >
                  下一題 <ChevronRight size={20} />
                </button>
              </div>

              {/* Quick Jump Chips */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                overflowX: 'auto',
                padding: '0.35rem 0',
              }}>
                <span style={{ fontSize: '0.8rem', opacity: 0.6, flexShrink: 0, marginRight: '0.25rem' }}>
                  快速跳題：
                </span>
                {itemAnalysis.map((q, idx) => {
                  const isCurrent = idx === currentSlideIdx;
                  return (
                    <button
                      key={q.number}
                      onClick={() => setCurrentSlideIdx(idx)}
                      style={{
                        flexShrink: 0,
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: isCurrent ? 700 : 500,
                        backgroundColor: isCurrent ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                        color: isCurrent ? '#ffffff' : 'var(--foreground)',
                        border: isCurrent ? '1px solid var(--primary)' : '1px solid var(--border)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      第{q.number}題 ({Math.round(q.errorRate)}%)
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
