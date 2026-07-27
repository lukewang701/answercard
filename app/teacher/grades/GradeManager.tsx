'use client';

import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Download, Search, CheckSquare, Square, FileText, Calendar, Users, TrendingUp, Clock, MoreVertical, ChevronDown } from 'lucide-react';

export function GradeManager({ exams, classes }: { exams: any[], classes: any[] }) {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  
  // Sorting state
  const [sortField, setSortField] = useState<'name' | 'date' | 'submitted' | 'average'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const processedExams = useMemo(() => {
    return exams.map(exam => {
      let targetClassStr = exam.targetClass;
      if (!targetClassStr) {
        const match = exam.name.match(/\b(\d{3})\b/);
        if (match) targetClassStr = match[1];
      }
      const cls = classes.find(c => c.name === targetClassStr);
      const totalExpected = cls?._count?.students || exam.submissions.length || 0;
      const submitted = exam.submissions.length;
      
      const sum = exam.submissions.reduce((acc: number, sub: any) => {
        const penalty = sub.isLate ? (sub.latePenalty ?? 5) : 0;
        const raw = sub.isLate && sub.rawScore != null ? sub.rawScore : sub.totalScore;
        const finalScore = sub.isLate ? Math.max(0, raw - penalty) : sub.totalScore;
        return acc + finalScore;
      }, 0);
      
      const average = submitted > 0 ? sum / submitted : null;
      
      return {
        ...exam,
        totalExpected,
        submitted,
        average,
        lastUpdated: exam.submissions.length > 0 
          ? Math.max(...exam.submissions.map((s: any) => new Date(s.submittedAt).getTime()))
          : new Date(exam.date).getTime()
      };
    });
  }, [exams, classes]);

  const filteredExams = useMemo(() => {
    let result = processedExams.filter(exam => {
      const matchSearch = exam.name.toLowerCase().includes(searchTerm.toLowerCase());
      let matchClass = true;
      if (selectedClass) {
        const cls = classes.find(c => c.id === selectedClass);
        if (cls) {
          const hasClassSubmission = exam.submissions.some((s: any) => s.class === cls.name);
          const isTargetClass = exam.targetClass === cls.name || exam.name.includes(cls.name);
          matchClass = hasClassSubmission || isTargetClass;
        }
      }
      return matchSearch && matchClass;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'date') cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      else if (sortField === 'submitted') cmp = (a.submitted / (a.totalExpected || 1)) - (b.submitted / (b.totalExpected || 1));
      else if (sortField === 'average') cmp = (a.average || 0) - (b.average || 0);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [processedExams, selectedClass, searchTerm, classes, sortField, sortOrder]);

  const toggleSort = (field: 'name' | 'date' | 'submitted' | 'average') => {
    if (sortField === field) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('desc'); }
  };

  const handleSelectAll = () => {
    if (selectedExams.length === filteredExams.length) setSelectedExams([]);
    else setSelectedExams(filteredExams.map(e => e.id));
  };

  const toggleExam = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedExams(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleDownload = () => {
    if (selectedExams.length === 0) {
      alert('請先選擇至少一份試卷');
      return;
    }
    const examsToExport = exams.filter(e => selectedExams.includes(e.id));
    const wb = XLSX.utils.book_new();

    examsToExport.forEach(exam => {
      const sortedSubmissions = [...exam.submissions].sort((a, b) => {
        const seatA = parseInt(a.seatNumber) || 0;
        const seatB = parseInt(b.seatNumber) || 0;
        return seatA - seatB;
      });

      const scoreData = sortedSubmissions.map((sub: any, index: number) => {
        const penalty = sub.isLate ? (sub.latePenalty ?? 5) : 0;
        const raw = sub.isLate && sub.rawScore != null ? sub.rawScore : sub.totalScore;
        const finalScore = sub.isLate ? Math.max(0, raw - penalty) : sub.totalScore;
        
        return {
          年級: sub.year, 班級: sub.class, 座號: sub.seatNumber, 姓名: sub.studentName,
          是否遲交: sub.isLate ? '是' : '否', 原始分數: raw.toFixed(1),
          遲交扣分: sub.isLate ? `-${penalty}` : '-', 最後分數: finalScore.toFixed(1),
          ...(exam.totalScore !== 100 ? { '百分比(%)': ((finalScore / exam.totalScore) * 100).toFixed(1) + '%' } : {}),
          名次: index + 1
        };
      });

      let safeName = exam.name.replace(/[\\/*?:"<>|]/g, '').substring(0, 31);
      const ws = XLSX.utils.json_to_sheet(scoreData);
      let finalName = safeName;
      let counter = 1;
      while (wb.SheetNames.includes(finalName)) {
        finalName = `${safeName.substring(0, 28)}_${counter}`;
        counter++;
      }
      XLSX.utils.book_append_sheet(wb, ws, finalName);
    });

    const classStr = selectedClass ? classes.find(c => c.id === selectedClass)?.name || '自訂班級' : '多班級';
    const isSingleExam = examsToExport.length === 1;
    const examStr = isSingleExam ? examsToExport[0].name : `共${examsToExport.length}份試卷`;
    XLSX.writeFile(wb, `${classStr}_${examStr}_成績匯總.xlsx`);
  };

  const totalExams = filteredExams.length;
  const totalSubmitted = filteredExams.reduce((sum, e) => sum + e.submitted, 0);
  const totalExpected = filteredExams.reduce((sum, e) => sum + (e.totalExpected || e.submitted), 0);
  const totalScoreSum = filteredExams.reduce((sum, e) => sum + (e.average || 0) * e.submitted, 0);
  const overallAverage = totalSubmitted > 0 ? totalScoreSum / totalSubmitted : null;
  const latestUpdate = filteredExams.length > 0 ? Math.max(...filteredExams.map(e => e.lastUpdated)) : null;

  return (
    <div className="w-full">
      
      {/* ── Top Bar ── */}
      <div className="flex flex-col md:flex-row gap-6 mb-8 justify-between items-end">
        <div className="flex gap-6 w-full md:w-auto">
          <div className="w-64">
            <label className="block text-sm mb-2 opacity-80 text-foreground font-medium">搜尋試卷名稱</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" size={16} />
              <input 
                type="text" 
                placeholder="輸入關鍵字..." 
                className="w-full pl-9 py-2 bg-transparent border border-border rounded-md text-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="w-48">
            <label className="block text-sm mb-2 opacity-80 text-foreground font-medium">依班級篩選</label>
            <select 
              className="w-full py-2 bg-transparent border border-border rounded-md text-sm appearance-none"
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%24%2024%22%20fill%3D%22none%22%20stroke%3D%22%23666%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px' }}
            >
              <option value="">所有班級</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button onClick={handleDownload} className="btn flex items-center gap-2 py-2 px-5 rounded-md shadow-sm transition-colors text-white border-none" style={{ backgroundColor: '#3b82f6' }}>
          <Download size={16} />
          下載所選成績 ({selectedExams.length})
        </button>
      </div>

      {/* Table Header Tab */}
      <div className="flex items-center gap-4 text-sm font-medium mb-3 pl-2">
        <span className="text-[#3b82f6] font-bold">全部</span>
        <span className="opacity-70">共 {filteredExams.length} 份試卷</span>
      </div>

      {/* ── Table Container ── */}
      <div className="bg-transparent rounded-lg border border-border overflow-hidden">
        
        {/* Column Headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 2fr 1fr 1fr 1fr auto', gap: '1rem', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontSize: '0.85rem', fontWeight: 600, opacity: 0.8, alignItems: 'center' }}>
          <button onClick={handleSelectAll} style={{ padding: '0.25rem', cursor: 'pointer', display: 'flex' }}>
            {selectedExams.length === filteredExams.length && filteredExams.length > 0 ? (
              <CheckSquare size={18} />
            ) : (
              <Square size={18} />
            )}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }} onClick={() => toggleSort('name')}>
            試卷名稱 <ChevronDown size={14} style={{ transform: sortField==='name'&&sortOrder==='asc' ? 'rotate(180deg)' : 'none' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }} onClick={() => toggleSort('date')}>
            日期 <ChevronDown size={14} style={{ transform: sortField==='date'&&sortOrder==='asc' ? 'rotate(180deg)' : 'none' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }} onClick={() => toggleSort('submitted')}>
            已繳交 <ChevronDown size={14} style={{ transform: sortField==='submitted'&&sortOrder==='asc' ? 'rotate(180deg)' : 'none' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }} onClick={() => toggleSort('average')}>
            平均分數 <ChevronDown size={14} style={{ transform: sortField==='average'&&sortOrder==='asc' ? 'rotate(180deg)' : 'none' }} />
          </div>
          <div style={{ width: '2rem' }}></div>
        </div>

        {/* Rows */}
        <div style={{ overflowY: 'auto', maxHeight: '50vh', borderTop: 'none' }}>
          {filteredExams.map(exam => {
            const pct = exam.totalExpected > 0 ? Math.round((exam.submitted / exam.totalExpected) * 100) : 0;
            const pctColor = pct === 100 ? '#22c55e' : pct === 0 ? '#ef4444' : 'var(--foreground)';
            return (
              <div key={exam.id} style={{ display: 'grid', gridTemplateColumns: 'auto 2fr 1fr 1fr 1fr auto', gap: '1rem', padding: '1rem 1.5rem', alignItems: 'center', fontSize: '0.875rem', borderBottom: '1px solid var(--border)', backgroundColor: selectedExams.includes(exam.id) ? 'rgba(255,255,255,0.04)' : 'transparent', cursor: 'default', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = selectedExams.includes(exam.id) ? 'rgba(255,255,255,0.04)' : 'transparent')}
              >
                <button onClick={(e) => toggleExam(exam.id, e)} style={{ padding: '0.25rem', cursor: 'pointer', display: 'flex', color: 'var(--foreground)' }}>
                  {selectedExams.includes(exam.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }} onClick={() => window.location.href = `/teacher/exams/${exam.id}`}>
                  <FileText size={20} style={{ color: '#3b82f6', flexShrink: 0 }} />
                  {exam.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.8 }}>
                  <Calendar size={16} />
                  {new Date(exam.date).toLocaleDateString()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={16} style={{ opacity: 0.7 }} />
                  <span style={{ color: pctColor }}>{exam.submitted} / {exam.totalExpected} <span style={{ opacity: 0.7, fontSize: '0.75rem' }}>({pct}%)</span></span>
                </div>
                <div style={{ fontWeight: 500, color: exam.average !== null ? '#3b82f6' : 'var(--foreground)', opacity: exam.average !== null ? 1 : 0.4 }}>
                  {exam.average !== null ? `${exam.average.toFixed(1)} 分` : '—'}
                </div>
                <button style={{ padding: '0.25rem', opacity: 0.5, cursor: 'pointer' }} onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.opacity='1')} onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.opacity='0.5')}>
                  <MoreVertical size={18} />
                </button>
              </div>
            );
          })}
          {filteredExams.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>沒有符合條件的試卷</div>
          )}
        </div>
      </div>

      {/* ── Summary Footer ── */}
      <div className="mt-6 bg-transparent border border-border rounded-lg p-5 grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="flex items-center gap-4">
          <FileText size={32} className="text-[#3b82f6]" strokeWidth={1.5} />
          <div>
            <div className="text-sm opacity-70 mb-1">總試卷數</div>
            <div className="text-xl font-bold">{totalExams}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Users size={32} className="text-[#3b82f6]" strokeWidth={1.5} />
          <div>
            <div className="text-sm opacity-70 mb-1">已繳交總數</div>
            <div className="text-xl font-bold flex items-baseline gap-2">
              {totalSubmitted} / {totalExpected}
              <span className="text-sm font-normal opacity-70">
                ({totalExpected > 0 ? Math.round((totalSubmitted / totalExpected) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <TrendingUp size={32} className="text-[#22c55e]" strokeWidth={1.5} />
          <div>
            <div className="text-sm opacity-70 mb-1">平均分數 (已繳交)</div>
            <div className={`text-xl font-bold ${overallAverage !== null ? 'text-[#22c55e]' : 'opacity-50'}`}>
              {overallAverage !== null ? `${overallAverage.toFixed(1)} 分` : '—'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Clock size={32} className="text-[#f97316]" strokeWidth={1.5} />
          <div>
            <div className="text-sm opacity-70 mb-1">最近更新</div>
            <div className="text-sm font-medium">
              {latestUpdate ? new Date(latestUpdate).toLocaleString('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '無'}
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}

