import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { EditExamForm } from './EditExamForm';

export const dynamic = 'force-dynamic';

export default async function EditExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: { questions: { orderBy: { number: 'asc' } } }
  });

  if (!exam) return notFound();

  return <EditExamForm initialExam={exam} />;
}
