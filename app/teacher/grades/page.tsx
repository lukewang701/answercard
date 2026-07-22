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
    orderBy: { name: 'asc' }
  });

  return (
    <div className="container py-12">
      <h1 className="mb-8">成績管理</h1>
      <GradeManager exams={exams} classes={classes} />
    </div>
  );
}
