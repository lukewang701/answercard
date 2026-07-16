import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { StudentScannerFlow } from './StudentScannerFlow';
import { StudentDigitalFlow } from './StudentDigitalFlow';

export const dynamic = 'force-dynamic';

export default async function StudentExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { code } = await params;
  const { mode } = await searchParams;

  const exam = await prisma.exam.findUnique({
    where: { shareCode: code.toUpperCase() },
    select: { id: true, name: true, date: true, totalQuestions: true, targetClass: true }
  });

  if (!exam) return notFound();

  const isDigital = mode === 'digital';

  return (
    <div className={isDigital ? '' : 'container py-8 min-h-screen flex flex-col items-center'}>
      {!isDigital && (
        <div className="card w-full max-w-2xl mb-8 text-center animate-fade-in">
          <h2 className="text-primary mb-2">{exam.name}</h2>
          <p className="text-sm mb-0">考試日期: {new Date(exam.date).toLocaleDateString()} | 總題數: {exam.totalQuestions} 題</p>
        </div>
      )}

      {isDigital ? (
        <StudentDigitalFlow
          examId={exam.id}
          examName={exam.name}
          totalQuestions={exam.totalQuestions}
          targetClass={exam.targetClass ?? ''}
        />
      ) : (
        <StudentScannerFlow examId={exam.id} />
      )}
    </div>
  );
}
