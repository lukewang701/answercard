'use client';

import { useState, useMemo } from 'react';
import { Folder, Users, FileText, ChevronRight, BarChart2 } from 'lucide-react';

export default function AnalyticsView({ initialExams }: { initialExams: any[] }) {
  const [groupBy, setGroupBy] = useState<'exam' | 'class'>('exam');
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  
  // By default all classes/exams inside a folder are selected for aggregation
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

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
  };

  const toggleSelection = (examId: string) => {
    setSelectedItems(prev => 
      prev.includes(examId) 
        ? prev.filter(id => id !== examId)
        : [...prev, examId]
    );
  };

  // 3. Compute Item Analysis for active folder and selected items
  const itemAnalysis = useMemo(() => {
    if (!activeFolder) return null;
    const group = groups.find(g => g.key === activeFolder);
    if (!group) return null;

    const selectedExams = group.exams.filter(e => selectedItems.includes(e.id));
    if (selectedExams.length === 0) return [];

    // Assuming all exams in the group have the same question structure (which they should if they share baseName)
    // We use the first selected exam as the baseline for question numbers and correct answers
    const baseExam = selectedExams[0];
    
    // Map question number -> stats
    const statsMap = new Map<number, {
      number: number,
      correctAnswers: string[],
      totalAnswers: number,
      wrongCount: number,
      optionsCount: Record<string, number>
    }>();

    // Initialize map
    baseExam.questions.forEach((q: any) => {
      statsMap.set(q.number, {
        number: q.number,
        correctAnswers: JSON.parse(q.correctAnswers || '[]'),
        totalAnswers: 0,
        wrongCount: 0,
        optionsCount: { 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0, '未作答': 0 }
      });
    });

    // Aggregate submissions
    selectedExams.forEach(exam => {
      exam.submissions.forEach((sub: any) => {
        sub.answers.forEach((ans: any) => {
          const stat = statsMap.get(ans.number);
          if (stat) {
            stat.totalAnswers++;
            if (!ans.isCorrect) stat.wrongCount++;
            
            // Selected answers is e.g. "A,B" or just "A" or ""
            let sel = ans.selectedAnswers || '';
            if (sel === '') {
              stat.optionsCount['未作答'] = (stat.optionsCount['未作答'] || 0) + 1;
            } else {
              // Count each chosen option. For multi-select, it adds to multiple.
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
    });

    // Format output and calculate error rate
    const result = Array.from(statsMap.values()).map(stat => {
      const errorRate = stat.totalAnswers > 0 ? (stat.wrongCount / stat.totalAnswers) * 100 : 0;
      return { ...stat, errorRate };
    });

    // Sort by error rate descending
    return result.sort((a, b) => b.errorRate - a.errorRate);

  }, [activeFolder, groups, selectedItems]);

  return (
    <div>
      {/* Header & Controls */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="m-0 flex items-center gap-2">
          <BarChart2 className="text-primary" />
          {activeFolder ? (
            <>
              <button className="text-foreground/70 hover:text-primary" onClick={() => setActiveFolder(null)}>
                所有資料夾
              </button>
              <ChevronRight size={18} className="opacity-50" />
              <span>{activeFolder}</span>
            </>
          ) : (
            '所有資料夾'
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
          {groups.map(group => (
            <div 
              key={group.key} 
              className="card cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all group"
              onClick={() => handleOpenFolder(group.key, group.exams)}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-primary/10 text-primary rounded-xl group-hover:scale-110 transition-transform">
                  {groupBy === 'exam' ? <Folder size={32} /> : <Users size={32} />}
                </div>
                <div className="flex-1">
                  <h3 className="m-0 mb-1 text-lg">{group.key}</h3>
                  <p className="text-sm opacity-70 m-0">
                    包含 {group.exams.length} 份試卷 • 共 {group.submissionsCount} 人繳交
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border">
                <div className="text-center">
                  <div className="text-xs opacity-70 mb-1">平均分</div>
                  <div className="font-bold text-primary">{group.avg}</div>
                </div>
                <div className="text-center border-l border-border">
                  <div className="text-xs opacity-70 mb-1">最高分</div>
                  <div className="font-bold text-success">{group.max}</div>
                </div>
                <div className="text-center border-l border-border">
                  <div className="text-xs opacity-70 mb-1">最低分</div>
                  <div className="font-bold text-danger">{group.min}</div>
                </div>
              </div>
            </div>
          ))}
          {groups.length === 0 && (
            <div className="col-span-full text-center py-12 opacity-50">
              目前還沒有任何考試成績資料
            </div>
          )}
        </div>
      )}

      {/* View: Folder Details (Item Analysis) */}
      {activeFolder && (
        <div className="animate-fade-in">
          {/* Filters inside folder */}
          <div className="card mb-6 p-4 bg-secondary/10">
            <h3 className="text-sm mb-3">選擇要合併分析的{groupBy === 'exam' ? '班級' : '考試'}：</h3>
            <div className="flex flex-wrap gap-3">
              {groups.find(g => g.key === activeFolder)?.exams.map(exam => (
                <label key={exam.id} className="flex items-center gap-2 cursor-pointer bg-background px-3 py-2 rounded border border-border hover:border-primary/50 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={selectedItems.includes(exam.id)}
                    onChange={() => toggleSelection(exam.id)}
                    className="accent-primary"
                  />
                  <span className="text-sm">{groupBy === 'exam' ? exam.tClass : exam.bName}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Item Analysis Table */}
          <div className="card">
            <h3 className="mb-4 flex items-center gap-2">
              <FileText size={20} className="text-primary" />
              題目錯誤率分析表
              <span className="text-xs font-normal opacity-60 ml-2">(由高至低排列)</span>
            </h3>

            {itemAnalysis?.length === 0 ? (
              <div className="text-center py-8 opacity-50">請至少選擇一個分析項目，或目前尚無繳交紀錄</div>
            ) : (
              <div className="overflow-x-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', opacity: 0.6, fontWeight: 600, whiteSpace: 'nowrap' }}>排名</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', opacity: 0.6, fontWeight: 600, whiteSpace: 'nowrap' }}>題號</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', opacity: 0.6, fontWeight: 600, whiteSpace: 'nowrap', minWidth: '120px' }}>錯誤率</th>
                      {['A', 'B', 'C', 'D', 'E'].map(opt => (
                        <th key={opt} style={{ padding: '0.5rem 0.75rem', textAlign: 'center', opacity: 0.6, fontWeight: 600, minWidth: '64px' }}>{opt}</th>
                      ))}
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center', opacity: 0.6, fontWeight: 600, whiteSpace: 'nowrap' }}>未作答</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemAnalysis?.map((stat, idx) => {
                      const rowBg = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)';
                      const isTop3 = idx < 3;
                      return (
                        <tr key={stat.number} style={{ backgroundColor: rowBg, borderBottom: '1px solid var(--border)' }}>
                          {/* Rank */}
                          <td style={{ padding: '0.6rem 0.75rem' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: '1.75rem', height: '1.75rem', borderRadius: '50%', fontSize: '0.75rem', fontWeight: 700,
                              background: isTop3 ? 'var(--danger)' : 'var(--secondary)',
                              color: isTop3 ? 'white' : 'var(--foreground)'
                            }}>#{idx + 1}</span>
                          </td>
                          {/* Q Number */}
                          <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>第 {stat.number} 題</td>
                          {/* Error Rate Bar */}
                          <td style={{ padding: '0.6rem 0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 700, color: isTop3 ? 'var(--danger)' : 'var(--warning)', minWidth: '2.5rem', textAlign: 'left' }}>
                                {Math.round(stat.errorRate)}%
                              </span>
                              <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'var(--secondary)', overflow: 'hidden', minWidth: '60px' }}>
                                <div style={{ height: '100%', borderRadius: '4px', width: `${stat.errorRate}%`, background: isTop3 ? 'var(--danger)' : 'var(--warning)', transition: 'width 0.4s' }} />
                              </div>
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
    </div>
  );
}
