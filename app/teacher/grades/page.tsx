import prisma from '@/lib/prisma';
import { GradeManager } from './GradeManager';

export const dynamic = 'force-dynamic';

export default async function GradesPage() {
  const exams = await prisma.exam.findMany({
    orderBy: { date: 'desc' },
    include: {
      submissions: true
    }
  });

  const classes = await prisma.class.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { students: true } } }
  });

  return (
    <div className="container py-8 max-w-6xl">
      <div className="mb-6">
        <h1 style={{ color: '#ffffff', fontSize: '1.75rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>成績管理</h1>
        <p className="text-xs opacity-60 m-0 mt-1">匯總班級成績、統計應考與缺考人數並匯出 Excel 報表</p>
      </div>
      <GradeManager exams={exams} classes={classes} />
    </div>
  );
}
