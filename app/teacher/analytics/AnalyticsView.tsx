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
      const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
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

          {/* Item Analysis List */}
          <div className="card">
            <h3 className="mb-6 flex items-center gap-2">
              <FileText size={20} className="text-primary" />
              題目錯誤率分析表
              <span className="text-xs font-normal opacity-60 ml-2">(由高至低排列)</span>
            </h3>

            {itemAnalysis?.length === 0 ? (
              <div className="text-center py-8 opacity-50">請至少選擇一個分析項目，或目前尚無繳交紀錄</div>
            ) : (
              <div className="space-y-4">
                {itemAnalysis?.map((stat, idx) => (
                  <div key={stat.number} className="p-4 rounded-lg border border-border bg-secondary/5 flex flex-col md:flex-row md:items-center gap-4">
                    
                    {/* Rank & Q Number */}
                    <div className="flex items-center gap-4 min-w-[120px]">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx < 3 ? 'bg-danger text-white' : 'bg-secondary text-foreground'}`}>
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="text-sm opacity-70">第 {stat.number} 題</div>
                        <div className="font-bold text-danger">{stat.errorRate.toFixed(1)}%</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex-1 max-w-[200px]">
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-danger rounded-full" style={{ width: `${stat.errorRate}%` }}></div>
                      </div>
                    </div>

                    {/* Options Breakdown */}
                    <div className="flex-1 flex flex-wrap gap-2 text-xs">
                      {['A', 'B', 'C', 'D', 'E'].map(opt => {
                        const count = stat.optionsCount[opt] || 0;
                        const pct = stat.totalAnswers ? Math.round((count / stat.totalAnswers) * 100) : 0;
                        const isCorrect = stat.correctAnswers.includes(opt);
                        
                        if (count === 0 && !isCorrect) return null; // Hide unused wrong options to save space
                        
                        return (
                          <div key={opt} className={`px-2 py-1 rounded flex items-center gap-1 border ${isCorrect ? 'bg-success/10 border-success/30 text-success' : 'bg-background border-border opacity-70'}`}>
                            <span className="font-bold">{opt}</span>
                            <span>{pct}%</span>
                          </div>
                        );
                      })}
                      {stat.optionsCount['未作答'] > 0 && (
                        <div className="px-2 py-1 rounded bg-background border border-border opacity-70 flex items-center gap-1">
                          <span>未作答</span>
                          <span>{Math.round((stat.optionsCount['未作答'] / stat.totalAnswers) * 100)}%</span>
                        </div>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
