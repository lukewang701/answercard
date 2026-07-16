'use client';

import { useState, useRef } from 'react';
import { OMRScanner } from '@/components/OMRScanner';
import { AnswerConfirm } from '@/components/AnswerConfirm';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { ReviewDownloadCard } from '@/components/ReviewDownloadCard';

export function StudentScannerFlow({ examId }: { examId: string }) {
  const [scanResult, setScanResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

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

  const handleDownloadReview = async () => {
    if (!cardRef.current || !submissionResult) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: '#0F172A' });
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `${submissionResult.exam?.name || '考試'}_答題檢討_${submissionResult.class}_${submissionResult.studentName}.png`;
      link.click();
    } catch (e) {
      console.error(e);
      alert('產生圖片時發生錯誤');
    } finally {
      setDownloading(false);
    }
  };

  if (submissionResult) {
    return (
      <div className="card w-full max-w-2xl text-center animate-fade-in">
        <h2 className="mb-6 text-success">批改完成！</h2>
        <div className="text-6xl font-bold text-primary mb-2 flex flex-col items-center justify-center">
          <div>{Math.round(submissionResult.totalScore)}</div>
          {submissionResult.exam?.totalScore && submissionResult.exam.totalScore !== 100 && (
            <div className="text-2xl mt-2 text-foreground opacity-80">
              / {submissionResult.exam.totalScore} 
              <span className="text-xl ml-2 opacity-60">
                ({Math.round((submissionResult.totalScore / submissionResult.exam.totalScore) * 100)}%)
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
        
        <div className="flex flex-col gap-3">
          <button 
            onClick={handleDownloadReview} 
            disabled={downloading}
            className="btn btn-primary flex items-center justify-center gap-2"
          >
            {downloading ? '產生中...' : <><Download size={18} /> 下載答題檢討 (錯題)</>}
          </button>
          
          <button onClick={() => window.location.reload()} className="btn btn-secondary">
            掃描另一張
          </button>
        </div>

        <ReviewDownloadCard ref={cardRef} submission={submissionResult} />
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
