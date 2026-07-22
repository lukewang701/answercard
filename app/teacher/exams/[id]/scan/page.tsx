'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { OMRScanner } from '@/components/OMRScanner';
import { use } from 'react';
import { AnswerConfirm } from '@/components/AnswerConfirm';

export default function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [scanResult, setScanResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleScanComplete = (result: any) => {
    setScanResult(result);
  };

  const handleConfirm = async (finalData: any) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/exams/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...finalData, submittedBy: 'teacher' }),
      });
      
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setScanResult(null); // Reset for next scan
        }, 2000);
      } else {
        alert('提交失敗');
      }
    } catch (err) {
      alert('網路錯誤');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-8">
      <div className="flex items-center gap-4 mb-8">
        <button type="button" onClick={() => router.back()} className="btn btn-secondary px-2">
          <ArrowLeft size={20} />
        </button>
        <h1 className="m-0">批次掃描答案卡</h1>
      </div>

      {success && (
        <div className="bg-success text-white p-4 rounded-lg mb-8 flex items-center justify-center gap-2 animate-fade-in">
          <CheckCircle size={24} />
          <span className="font-bold text-lg">批改成功！請掃描下一張。</span>
        </div>
      )}

      {!scanResult ? (
        <OMRScanner onScanComplete={handleScanComplete} />
      ) : (
        <AnswerConfirm 
          initialData={scanResult} 
          onConfirm={handleConfirm} 
          onCancel={() => setScanResult(null)}
          isSubmitting={submitting}
        />
      )}
    </div>
  );
}
