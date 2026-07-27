import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { StudentDigitalFlow } from './StudentDigitalFlow';

export const dynamic = 'force-dynamic';

export default async function StudentExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ mode?: string; scan?: string }>;
}) {
  const { code } = await params;
  const { scan } = await searchParams;

  let exam: any = null;
  try {
    exam = await prisma.exam.findUnique({
      where: { shareCode: code.toUpperCase() },
      select: { id: true, name: true, date: true, totalQuestions: true, targetClass: true, startTime: true, deadline: true, optionMappings: true, showOptionMappings: true, allowLateSubmission: true, lateDeadline: true }
    });
  } catch (err: any) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#f87171', fontFamily: 'monospace', padding: '2rem', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>⚠️ 資料庫錯誤（請截圖回報）</div>
        <pre style={{ fontSize: '0.8rem', opacity: 0.8, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxWidth: '600px' }}>{err?.message ?? String(err)}</pre>
      </div>
    );
  }

  if (!exam) return notFound();

  if (exam.startTime && new Date() < exam.startTime) {
    const startTimeStr = new Date(exam.startTime).toLocaleString('zh-TW', { dateStyle: 'medium', timeStyle: 'short' });
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>考試尚未開始</h2>
          <p style={{ opacity: 0.7, lineHeight: 1.5 }}>
            本測驗將於 <strong>{startTimeStr}</strong> 開放作答。<br />
            請於時間到達後再重新整理頁面。
          </p>
        </div>
      </div>
    );
  }

  const allowPaperScan = scan === '1';

  return (
    <div className="">
      <StudentDigitalFlow
        examId={exam.id}
        examName={exam.name}
        totalQuestions={exam.totalQuestions}
        targetClass={exam.targetClass ?? ''}
        allowPaperScan={allowPaperScan}
        deadline={exam.deadline ? exam.deadline.toISOString() : undefined}
        allowLateSubmission={exam.allowLateSubmission}
        lateDeadline={exam.lateDeadline ? exam.lateDeadline.toISOString() : undefined}
        optionMappings={exam.showOptionMappings && exam.optionMappings ? JSON.parse(exam.optionMappings) : undefined}
      />
    </div>
  );
}
