'use client';

import { useState, useEffect, forwardRef } from 'react';
import { XCircle, CheckCircle } from 'lucide-react';

export const ReviewDownloadCard = forwardRef<HTMLDivElement, { submission: any }>(
  ({ submission }, ref) => {
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
      setIsDesktop(window.innerWidth >= 768);
    }, []);

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
          width: isDesktop ? '1000px' : '600px',
          background: '#0F172A', 
          color: '#F8FAFC',
          padding: '2.5rem',
          borderRadius: '16px',
          fontFamily: 'sans-serif',
          zIndex: -1,
          display: isDesktop ? 'flex' : 'block',
          gap: '2.5rem',
          alignItems: 'flex-start'
        }}
      >
        <div style={{ width: isDesktop ? '300px' : '100%', textAlign: 'center', marginBottom: isDesktop ? '0' : '2rem', flexShrink: 0 }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0 0 1rem 0', color: '#38BDF8' }}>
            答題檢討報告
          </h2>
          <p style={{ opacity: 0.8, fontSize: '1.2rem', margin: '0 0 1.5rem 0' }}>
            {submission.year}年{submission.class}班<br/>
            {submission.seatNumber}號 {submission.studentName}
          </p>
          <div style={{ display: 'inline-block', background: '#1E293B', padding: '1.5rem 2.5rem', borderRadius: '16px', border: '1px solid #334155', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ fontSize: '1.1rem', opacity: 0.7, marginBottom: '0.5rem' }}>您的分數</div>
            <div style={{ fontSize: '5rem', fontWeight: 700, color: '#38BDF8', lineHeight: 1 }}>
              {Math.round(submission.totalScore)}
            </div>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem', opacity: 0.4 }}>
            產出時間：<br/>{new Date().toLocaleString('zh-TW')}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {wrongAnswers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(34,197,94,0.1)', color: '#4ADE80', borderRadius: '16px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <CheckCircle size={64} style={{ margin: '0 auto 1.5rem auto' }} />
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>全對！表現非常優異！</div>
            </div>
          ) : (
            <div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', borderBottom: '1px solid #334155', paddingBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <XCircle size={24} color="#F87171" />
                答錯題目一覽
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: '1rem' }}>
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
                    <div key={ans.number} style={{ background: '#1E293B', padding: '1rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #334155' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, width: '45px' }}>#{ans.number}</div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem', marginLeft: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>你的作答</span>
                          <span style={{ fontWeight: 600, color: '#F87171', fontSize: '1.1rem' }}>{studentAnsStr}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>正確答案</span>
                          <span style={{ fontWeight: 600, color: '#4ADE80', fontSize: '1.1rem' }}>{correctAnsStr}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

ReviewDownloadCard.displayName = 'ReviewDownloadCard';
