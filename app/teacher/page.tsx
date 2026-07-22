import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { PlusCircle } from 'lucide-react';
import ExamListView from './ExamListView';

export const dynamic = 'force-dynamic';

export default async function TeacherDashboard() {
  const exams = await prisma.exam.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      submissions: {
        select: { totalScore: true }
      },
      _count: {
        select: { submissions: true }
      }
    }
  });

  const classCount = await prisma.class.count();
  if (classCount === 0) {
    redirect('/teacher/classes?welcome=1');
  }

  return (
    <div className="container py-12">
      <div className="flex justify-between items-center mb-8">
        <h1>試卷管理</h1>
        <Link href="/teacher/exams/new" className="btn btn-primary flex items-center gap-2">
          <PlusCircle size={20} />
          建立新試卷
        </Link>
      </div>

      {exams.length === 0 ? (
        <div className="card text-center py-12">
          <p className="mb-4">目前還沒有建立任何試卷</p>
          <Link href="/teacher/exams/new" className="btn btn-primary">
            立即建立第一份試卷
          </Link>
        </div>
      ) : (
        <ExamListView initialExams={exams} />
      )}
    </div>
  );
}
