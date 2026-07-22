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

  const exam = await prisma.exam.findUnique({
    where: { shareCode: code.toUpperCase() },
    select: { id: true, name: true, date: true, totalQuestions: true, targetClass: true }
  });

  if (!exam) return notFound();

  const allowPaperScan = scan === '1';

  return (
    <div className="">
      <StudentDigitalFlow
        examId={exam.id}
        examName={exam.name}
        totalQuestions={exam.totalQuestions}
        targetClass={exam.targetClass ?? ''}
        allowPaperScan={allowPaperScan}
      />
    </div>
  );
}
