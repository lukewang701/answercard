'use client';

import { useState } from 'react';
import { OMRScanner } from '@/components/OMRScanner';
import { AnswerConfirm } from '@/components/AnswerConfirm';

export function StudentScannerFlow({ examId }: { examId: string }) {
  const [scanResult, setScanResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);

  const handleScanComplete = (result: any) => {
    setScanResult(result);
  };

  const handleConfirm = async (finalData: any) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/exams/${examId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...finalData, submittedBy: 'student' }),
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        // Fetch detailed results (in a real app, the API would return the detailed grading)
        // For now we just fetch the submission we just created
        const resultRes = await fetch(`/api/submissions/${data.submission.id}`);
        if (resultRes.ok) {
          const resultData = await resultRes.json();
          setSubmissionResult(resultData.submission);
        } else {
          setSubmissionResult(data.submission);
        }
      } else {
        alert(data.error || '提交失敗');
      }
    } catch (err) {
      alert('網路錯誤');
    } finally {
      setSubmitting(false);
    }
  };

  if (submissionResult) {
    return (
      <div className="card w-full max-w-2xl text-center animate-fade-in">
        <h2 className="mb-6 text-success">批改完成！</h2>
        <div className="text-6xl font-bold text-primary mb-2 flex flex-col items-center justify-center">
          <div>{submissionResult.totalScore.toFixed(1)}</div>
          {submissionResult.exam?.totalScore && submissionResult.exam.totalScore !== 100 && (
            <div className="text-2xl mt-2 text-foreground opacity-80">
              / {submissionResult.exam.totalScore} 
              <span className="text-xl ml-2 opacity-60">
                ({((submissionResult.totalScore / submissionResult.exam.totalScore) * 100).toFixed(1)}%)
              </span>
            </div>
          )}
        </div>
        {!submissionResult.exam?.totalScore || submissionResult.exam?.totalScore === 100 ? (
          <p className="mb-6 opacity-70">分</p>
        ) : (
          <div className="mb-6"></div>
        )}
        
        <div className="bg-background rounded p-4 mb-6 text-left">
          <p className="mb-1"><strong>學生：</strong> {submissionResult.year}年{submissionResult.class}班 {submissionResult.seatNumber}號 {submissionResult.studentName}</p>
          <p className="mb-0 text-sm">老師已即時收到你的成績，辛苦了！可以關閉此頁面。</p>
        </div>
        
        <button onClick={() => window.location.reload()} className="btn btn-secondary">
          掃描另一張
        </button>
      </div>
    );
  }

  if (!scanResult) {
    return <OMRScanner onScanComplete={handleScanComplete} />;
  }

  return (
    <AnswerConfirm 
      initialData={scanResult} 
      onConfirm={handleConfirm} 
      onCancel={() => setScanResult(null)}
      isSubmitting={submitting}
    />
  );
}
