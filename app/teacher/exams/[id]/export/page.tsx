import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ExportClient } from './ExportClient';

export const dynamic = 'force-dynamic';

export default async function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      submissions: {
        orderBy: { totalScore: 'desc' },
        include: { answers: true }
      },
      questions: {
        orderBy: { number: 'asc' }
      }
    }
  });

  if (!exam) return notFound();

  // Calculate statistics per question
  const questionStats = exam.questions.map(q => {
    let correctCount = 0;
    exam.submissions.forEach(sub => {
      const ans = sub.answers.find(a => a.number === q.number);
      if (ans && ans.isCorrect) correctCount++;
    });
    
    return {
      number: q.number,
      correctRate: exam.submissions.length > 0 
        ? Math.round((correctCount / exam.submissions.length) * 100) 
        : 0
    };
  });

  return (
    <div className="container py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/teacher/exams/${exam.id}`} className="btn btn-secondary px-2">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="m-0">匯出成績報表 - {exam.name}</h1>
      </div>

      <ExportClient 
        exam={exam} 
        questionStats={questionStats} 
      />
    </div>
  );
}
