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
    <div className="container py-8 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold m-0 text-white" style={{ letterSpacing: '-0.02em' }}>試卷管理</h2>
          <p className="text-xs opacity-60 m-0 mt-1">建立試卷、派發答題連結與管理收卷進度</p>
        </div>
        <Link 
          href="/teacher/exams/new" 
          className="btn btn-primary flex items-center gap-2 shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
            borderRadius: '9px',
            padding: '0.55rem 1.15rem',
            fontWeight: 600,
          }}
        >
          <PlusCircle size={18} />
          <span>建立新試卷</span>
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
