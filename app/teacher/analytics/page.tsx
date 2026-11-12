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
    <div className="container py-8">
      <h1 style={{ color: '#ffffff', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.25rem' }}>試題檢討</h1>
      <AnalyticsView initialExams={exams} />
    </div>
  );
}
