import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { ExamControl } from './ExamControl';

export const dynamic = 'force-dynamic';

export default async function ExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      questions: true,
      submissions: { 
        include: { answers: true },
        orderBy: { totalScore: 'desc' } 
      },
      checkins: { orderBy: { checkedInAt: 'asc' } },
    }
  });

  if (!exam) return notFound();

  let classStudents: any[] = [];
  if (exam.targetClass) {
    const cls = await prisma.class.findUnique({
      where: { name: exam.targetClass },
      include: { students: { orderBy: { seatNumber: 'asc' } } }
    });
    if (cls) classStudents = cls.students;
  }

  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;
  const shareUrl = `${baseUrl}/s/${exam.shareCode}`;

  return (
    <ExamControl
      exam={{
        id: exam.id,
        name: exam.name,
        shareCode: exam.shareCode,
        totalScore: exam.totalScore,
        deadline: exam.deadline ? exam.deadline.toISOString() : null,
        startTime: exam.startTime ? exam.startTime.toISOString() : null,
        allowLateSubmission: exam.allowLateSubmission,
        lateDeadline: exam.lateDeadline ? exam.lateDeadline.toISOString() : null,
        extraOpen: exam.extraOpen,
        lateMarkEnabled: exam.lateMarkEnabled,
        questions: exam.questions,
      }}
      initialSubmissions={exam.submissions}
      initialCheckins={exam.checkins}
      classStudents={classStudents}
      shareUrl={shareUrl}
    />
  );
}
