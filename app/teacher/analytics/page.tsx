import prisma from '@/lib/prisma';
import AnalyticsView from './AnalyticsView';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const exams = await prisma.exam.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      submissions: {
        include: { answers: true }
      },
      questions: true
    }
  });

  return (
    <div className="container py-8 max-w-6xl">
      <div className="mb-6">
        <h1 style={{ color: '#ffffff', fontSize: '1.75rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>試題檢討</h1>
        <p className="text-xs opacity-60 m-0 mt-1">匯總各班作答數據、診斷試題鑑別度與全屏簡報檢討</p>
      </div>
      <AnalyticsView initialExams={exams} />
    </div>
  );
}
