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
    <div className="container py-12">
      <h1 className="mb-8">試題檢討</h1>
      <AnalyticsView initialExams={exams} />
    </div>
  );
}
