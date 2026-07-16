'use client';

import { useState } from 'react';
import { Save, X } from 'lucide-react';

export function AnswerConfirm({ 
  initialData, 
  onConfirm, 
  onCancel,
  isSubmitting 
}: { 
  initialData: any; 
  onConfirm: (data: any) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [studentInfo, setStudentInfo] = useState(initialData.studentInfo);
  const [answers, setAnswers] = useState<any[]>(initialData.answers);

  const toggleAnswer = (qIndex: number, option: string) => {
    setAnswers(prev => {
      const newAnswers = [...prev];
      const q = newAnswers[qIndex];
      if (q.selectedAnswers.includes(option)) {
        q.selectedAnswers = q.selectedAnswers.filter((a: string) => a !== option);
      } else {
        q.selectedAnswers = [...q.selectedAnswers, option].sort();
      }
      return newAnswers;
    });
  };

  return (
    <div className="card w-full max-w-4xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="m-0 text-primary">確認辨識結果</h2>
        <button onClick={onCancel} className="btn btn-secondary flex items-center gap-2" disabled={isSubmitting}>
          <X size={18} /> 重新掃描
        </button>
      </div>

      <div className="bg-background border rounded-lg p-6 mb-8" style={{ borderColor: 'var(--border)' }}>
        <h3 className="mb-4">學生資料 (可手動修正)</h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm mb-1">入學年</label>
            <input 
              type="text" 
              className="w-full text-center" 
              value={studentInfo.year} 
              onChange={e => setStudentInfo({...studentInfo, year: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">班級</label>
            <input 
              type="text" 
              className="w-full text-center" 
              value={studentInfo.class} 
              onChange={e => setStudentInfo({...studentInfo, class: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">座號</label>
            <input 
              type="text" 
              className="w-full text-center" 
              value={studentInfo.seatNumber} 
              onChange={e => setStudentInfo({...studentInfo, seatNumber: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">姓名</label>
            <input 
              type="text" 
              className="w-full text-center" 
              value={studentInfo.name} 
              onChange={e => setStudentInfo({...studentInfo, name: e.target.value})}
            />
          </div>
        </div>
      </div>

      <div className="bg-background border rounded-lg p-6 mb-8" style={{ borderColor: 'var(--border)' }}>
        <h3 className="mb-4">作答結果</h3>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {answers.map((ans, idx) => (
            <div key={idx} className="flex items-center gap-3 p-2 rounded hover:bg-secondary-hover transition-colors">
              <span className="w-8 text-right text-sm text-foreground opacity-70">{ans.number}.</span>
              <div className="flex gap-1">
                {['A', 'B', 'C', 'D', 'E'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleAnswer(idx, opt)}
                    className={`w-6 h-6 text-xs rounded-sm border flex items-center justify-center transition-colors ${
                      ans.selectedAnswers.includes(opt)
                        ? 'bg-primary text-white border-primary'
                        : 'border-border text-foreground'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-4 sticky bottom-4 p-4 rounded-lg bg-secondary shadow-lg border" style={{ borderColor: 'var(--border)' }}>
        <button 
          onClick={() => onConfirm({ studentInfo, answers })} 
          className="btn btn-primary flex items-center gap-2"
          disabled={isSubmitting}
        >
          <Save size={18} />
          {isSubmitting ? '批改中...' : '確認無誤並批改'}
        </button>
      </div>
    </div>
  );
}
