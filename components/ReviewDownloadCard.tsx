'use client';

import { forwardRef } from 'react';
import { XCircle, CheckCircle } from 'lucide-react';

export const ReviewDownloadCard = forwardRef<HTMLDivElement, { submission: any }>(
  ({ submission }, ref) => {
    if (!submission) return null;

    const { exam, answers } = submission;
    
    // 找出答錯的題目
    const wrongAnswers = answers?.filter((a: any) => !a.isCorrect).sort((a: any, b: any) => a.number - b.number) || [];

    return (
      <div 
        ref={ref} 
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: '600px', // 固定寬度確保圖片比例一致
          background: '#0F172A', 
          color: '#F8FAFC',
          padding: '2rem',
          borderRadius: '16px',
          fontFamily: 'sans-serif',
          zIndex: -1,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#38BDF8' }}>
            答題檢討報告
          </h2>
          <p style={{ opacity: 0.8, fontSize: '1.1rem', margin: '0 0 1rem 0' }}>
            {submission.year}年{submission.class}班 {submission.seatNumber}號 {submission.studentName}
          </p>
          <div style={{ display: 'inline-block', background: '#1E293B', padding: '1rem 2rem', borderRadius: '12px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '0.2rem' }}>您的分數</div>
            <div style={{ fontSize: '3.5rem', fontWeight: 700, color: '#38BDF8', lineHeight: 1 }}>
              {Math.round(submission.totalScore)}
            </div>
          </div>
        </div>

        {wrongAnswers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(34,197,94,0.1)', color: '#4ADE80', borderRadius: '12px' }}>
            <CheckCircle size={48} style={{ margin: '0 auto 1rem auto' }} />
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>全對！表現非常優異！</div>
          </div>
        ) : (
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <XCircle size={18} color="#F87171" />
              答錯題目一覽
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              {wrongAnswers.map((ans: any) => {
                const question = exam?.questions?.find((q: any) => q.number === ans.number);
                let correctAnsStr = '';
                if (question) {
                   try {
                     const parsed = JSON.parse(question.correctAnswers);
                     correctAnsStr = parsed.join(' / ');
                   } catch {
                     correctAnsStr = question.correctAnswers;
                   }
                }

                let studentAnsStr = '';
                try {
                   studentAnsStr = JSON.parse(ans.selectedAnswers).join('') || '未作答';
                } catch {
                   studentAnsStr = ans.selectedAnswers || '未作答';
                }

                return (
                  <div key={ans.number} style={{ background: '#1E293B', padding: '1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, width: '40px' }}>#{ans.number}</div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem', marginLeft: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', opacity: 0.6, width: '60px' }}>你的作答</span>
                        <span style={{ fontWeight: 600, color: '#F87171' }}>{studentAnsStr}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', opacity: 0.6, width: '60px' }}>正確答案</span>
                        <span style={{ fontWeight: 600, color: '#4ADE80' }}>{correctAnsStr}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.8rem', opacity: 0.4 }}>
          產出時間：{new Date().toLocaleString('zh-TW')}
        </div>
      </div>
    );
  }
);

ReviewDownloadCard.displayName = 'ReviewDownloadCard';
