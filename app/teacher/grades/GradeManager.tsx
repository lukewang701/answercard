'use client';

import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Download, Search, CheckSquare, Square } from 'lucide-react';

export function GradeManager({ exams, classes }: { exams: any[], classes: any[] }) {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExams, setSelectedExams] = useState<string[]>([]);

  // Filter exams based on class and search term
  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      // Basic search match
      const matchSearch = exam.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Class match: checking if the exam's targetClass matches, 
      // or if any submissions are from this class
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
  }, [exams, selectedClass, searchTerm, classes]);

  const handleSelectAll = () => {
    if (selectedExams.length === filteredExams.length) {
      setSelectedExams([]); // deselect all
    } else {
      setSelectedExams(filteredExams.map(e => e.id)); // select all
    }
  };

  const toggleExam = (id: string) => {
    setSelectedExams(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleDownload = () => {
    if (selectedExams.length === 0) {
      alert('請先選擇至少一份試卷');
      return;
    }

    const examsToExport = exams.filter(e => selectedExams.includes(e.id));
    const wb = XLSX.utils.book_new();

    let allClassNames = new Set<string>();
    let allExamNames = new Set<string>();

    examsToExport.forEach(exam => {
      // Sort submissions by seat number
      const sortedSubmissions = [...exam.submissions].sort((a, b) => {
        const seatA = parseInt(a.seatNumber) || 0;
        const seatB = parseInt(b.seatNumber) || 0;
        return seatA - seatB;
      });

      const scoreData = sortedSubmissions.map((sub: any, index: number) => {
        allClassNames.add(sub.class);
        
        return {
          年級: sub.year,
          班級: sub.class,
          座號: sub.seatNumber,
          姓名: sub.studentName,
          是否遲交: sub.isLate ? '是' : '否',
          原始分數: sub.isLate ? (sub.rawScore != null ? sub.rawScore.toFixed(1) : (sub.totalScore + (sub.latePenalty ?? 5)).toFixed(1)) : sub.totalScore.toFixed(1),
          遲交扣分: sub.isLate ? `-${sub.latePenalty ?? 5}` : '-',
          最後分數: sub.totalScore.toFixed(1),
          ...(exam.totalScore !== 100 ? {
            '百分比(%)': ((sub.totalScore / exam.totalScore) * 100).toFixed(1) + '%'
          } : {}),
          名次: index + 1
        };
      });

      // Sheet name max length is 31 chars
      let safeName = exam.name.replace(/[\\/*?:"<>|]/g, '').substring(0, 31);
      allExamNames.add(exam.name);
      
      const ws = XLSX.utils.json_to_sheet(scoreData);
      
      // If safeName already exists in workbook, append a number
      let finalName = safeName;
      let counter = 1;
      while (wb.SheetNames.includes(finalName)) {
        finalName = `${safeName.substring(0, 28)}_${counter}`;
        counter++;
      }
      
      XLSX.utils.book_append_sheet(wb, ws, finalName);
    });

    // Build filename
    const classStr = selectedClass ? classes.find(c => c.id === selectedClass)?.name || '自訂班級' : '多班級';
    const isSingleExam = examsToExport.length === 1;
    const examStr = isSingleExam ? examsToExport[0].name : `共${examsToExport.length}份試卷`;
    
    const fileName = `${classStr}_${examStr}_成績匯總.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="card">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-sm mb-1 opacity-70">搜尋試卷名稱</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" size={18} />
            <input 
              type="text" 
              placeholder="輸入關鍵字..." 
              className="w-full pl-10"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 md:max-w-xs">
          <label className="block text-sm mb-1 opacity-70">依班級篩選</label>
          <select 
            className="w-full"
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
          >
            <option value="">所有班級</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button onClick={handleDownload} className="btn btn-primary flex items-center gap-2 w-full md:w-auto justify-center">
            <Download size={18} />
            下載所選成績 ({selectedExams.length})
          </button>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-secondary p-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <button onClick={handleSelectAll} className="text-primary hover:opacity-80 transition-opacity flex items-center gap-2">
              {selectedExams.length === filteredExams.length && filteredExams.length > 0 ? (
                <CheckSquare size={20} />
              ) : (
                <Square size={20} />
              )}
              <span className="font-medium">全選</span>
            </button>
            <span className="text-sm opacity-70 ml-4">共 {filteredExams.length} 份試卷</span>
          </div>
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto">
          {filteredExams.length === 0 ? (
            <div className="p-8 text-center opacity-50">找不到符合條件的試卷</div>
          ) : (
            <div className="divide-y divide-border">
              {filteredExams.map(exam => (
                <div 
                  key={exam.id} 
                  className={`p-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors cursor-pointer ${selectedExams.includes(exam.id) ? 'bg-secondary/20' : ''}`}
                  onClick={() => toggleExam(exam.id)}
                >
                  <div className="text-primary">
                    {selectedExams.includes(exam.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="m-0 text-foreground font-semibold text-lg truncate">{exam.name}</h3>
                    <div className="text-sm opacity-60 flex gap-4 mt-1">
                      <span>日期: {new Date(exam.date).toLocaleDateString()}</span>
                      <span>已繳交: {exam.submissions.length} 份</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
