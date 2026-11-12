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
      <div 
        className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-end"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ width: '260px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.45rem', opacity: 0.8, color: '#ffffff', fontWeight: 600 }}>
              搜尋試卷名稱
            </label>
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                height: '38px',
                boxSizing: 'border-box',
              }}
            >
              <Search size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <input 
                type="text" 
                placeholder="輸入關鍵字..." 
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  width: '100%',
                  padding: 0,
                }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {/* Class Filter Select */}
          <div style={{ width: '180px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.45rem', opacity: 0.8, color: '#ffffff', fontWeight: 600 }}>
              依班級篩選
            </label>
            <select 
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.85rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '0.88rem',
                color: '#ffffff',
                height: '38px',
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
            >
              <option value="" style={{ background: '#0f172a', color: '#fff' }}>所有班級</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id} style={{ background: '#0f172a', color: '#fff' }}>{cls.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Download Button */}
        <button 
          onClick={handleDownload}
          disabled={selectedExams.length === 0}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 1.25rem',
            borderRadius: '9px',
            fontSize: '0.88rem',
            fontWeight: 600,
            cursor: selectedExams.length > 0 ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s ease',
            backgroundColor: selectedExams.length > 0 ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)',
            color: selectedExams.length > 0 ? '#ffffff' : '#94a3b8',
            border: selectedExams.length > 0 ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: selectedExams.length > 0 ? '0 4px 14px rgba(59, 130, 246, 0.35)' : 'none',
            height: '38px',
            boxSizing: 'border-box',
          }}
        >
          <Download size={16} />
          <span>下載所選成績 ({selectedExams.length})</span>
        </button>
      </div>

      {/* Table Header Tab */}
      <div className="flex items-center gap-4 text-sm font-medium mb-3 pl-1" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ color: '#60a5fa', fontWeight: 700 }}>全部試卷</span>
        <span className="opacity-60">共 {filteredExams.length} 份</span>
      </div>

      {/* ── Table Container ── */}
      <div 
        style={{
          backgroundColor: 'var(--secondary)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        
        {/* Column Headers */}
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: '40px 2.5fr 1.2fr 1.2fr 1.2fr 40px', 
            gap: '0.75rem', 
            padding: '0.85rem 1.25rem', 
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)', 
            fontSize: '0.85rem', 
            fontWeight: 600, 
            opacity: 0.8, 
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <button onClick={handleSelectAll} style={{ padding: '0.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {selectedExams.length === filteredExams.length && filteredExams.length > 0 ? (
              <CheckSquare size={18} style={{ color: '#60a5fa' }} />
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

        {/* Rows (Natural height without awkward scrollbar) */}
        <div>
          {filteredExams.map(exam => {
            const pct = exam.totalExpected > 0 ? Math.round((exam.submitted / exam.totalExpected) * 100) : 0;
            const pctColor = pct === 100 ? '#34d399' : pct === 0 ? '#94a3b8' : '#60a5fa';
            return (
              <div 
                key={exam.id} 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '40px 2.5fr 1.2fr 1.2fr 1.2fr 40px', 
                  gap: '0.75rem', 
                  padding: '0.9rem 1.25rem', 
                  alignItems: 'center', 
                  fontSize: '0.875rem', 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)', 
                  backgroundColor: selectedExams.includes(exam.id) ? 'rgba(59, 130, 246, 0.08)' : 'transparent', 
                  cursor: 'default', 
                  transition: 'background 0.15s' 
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = selectedExams.includes(exam.id) ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255,255,255,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = selectedExams.includes(exam.id) ? 'rgba(59, 130, 246, 0.08)' : 'transparent')}
              >
                <button onClick={(e) => toggleExam(exam.id, e)} style={{ padding: '0.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: selectedExams.includes(exam.id) ? '#60a5fa' : 'var(--foreground)' }}>
                  {selectedExams.includes(exam.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', color: '#ffffff' }} onClick={() => window.location.href = `/teacher/exams/${exam.id}`}>
                  <FileText size={18} style={{ color: '#60a5fa', flexShrink: 0 }} />
                  <span className="truncate">{exam.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', opacity: 0.75, fontSize: '0.85rem' }}>
                  <Calendar size={14} />
                  <span>{new Date(exam.date).toLocaleDateString('zh-TW')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Users size={14} style={{ opacity: 0.6 }} />
                  <span style={{ color: pctColor, fontWeight: 600 }}>
                    {exam.submitted} / {exam.totalExpected} 
                    <span style={{ opacity: 0.7, fontSize: '0.75rem', marginLeft: '0.25rem', fontWeight: 400 }}>
                      ({pct}%)
                    </span>
                  </span>
                </div>
                <div style={{ fontWeight: 600, color: exam.average !== null ? '#60a5fa' : 'var(--foreground)', opacity: exam.average !== null ? 1 : 0.4 }}>
                  {exam.average !== null ? `${exam.average.toFixed(1)} 分` : '—'}
                </div>
                <button style={{ padding: '0.25rem', opacity: 0.5, cursor: 'pointer' }} onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.opacity='1')} onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.opacity='0.5')}>
                  <MoreVertical size={16} />
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

