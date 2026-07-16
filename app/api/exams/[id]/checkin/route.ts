import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET: teacher fetches all checkins + submissions for this exam
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('teacher_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [checkins, submissions] = await Promise.all([
      prisma.checkIn.findMany({ where: { examId: id }, orderBy: { checkedInAt: 'asc' } }),
      prisma.submission.findMany({
        where: { examId: id },
        select: { id: true, studentName: true, seatNumber: true, class: true, totalScore: true, rawScore: true, isLate: true, latePenalty: true, submittedAt: true }
      }),
    ]);

    return NextResponse.json({ checkins, submissions });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: student checks in (identity verification)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { studentName, seatNumber, className } = await request.json();

    if (!studentName || !seatNumber || !className) {
      return NextResponse.json({ error: '請填寫完整資料' }, { status: 400 });
    }

    // Verify exam exists
    const exam = await prisma.exam.findUnique({
      where: { id },
      select: { id: true, totalQuestions: true, targetClass: true, deadline: true, lateDeadline: true, extraOpen: true }
    });
    if (!exam) return NextResponse.json({ error: '找不到考試' }, { status: 404 });

    // Check if submission window is open
    const now = new Date();
    const deadline = exam.deadline ? new Date(exam.deadline) : null;
    const lateDeadline = exam.lateDeadline ? new Date(exam.lateDeadline) : null;
    const effectiveEnd = lateDeadline || deadline;

    if (effectiveEnd && now > effectiveEnd && !exam.extraOpen) {
      return NextResponse.json({ error: '繳交時間已截止，無法領取答案卡' }, { status: 403 });
    }

    // Verify student against class roster
    if (exam.targetClass) {
      const cls = await prisma.class.findUnique({
        where: { name: exam.targetClass },
        include: { students: true }
      });
      if (cls) {
        const student = cls.students.find(
          s => s.seatNumber === seatNumber.padStart(2, '0') && s.name === studentName
        );
        if (!student) {
          return NextResponse.json({ error: '座號或姓名不符，請確認後重試' }, { status: 403 });
        }
      }
    }

    // Check if already checked in by someone else with this seat
    const existing = await prisma.checkIn.findUnique({
      where: { examId_seatNumber_className: { examId: id, seatNumber: seatNumber.padStart(2, '0'), className } }
    });
    if (existing && existing.studentName !== studentName) {
      return NextResponse.json({ error: '此座號已有人領取答案卡' }, { status: 409 });
    }

    // Upsert check-in
    const checkIn = await prisma.checkIn.upsert({
      where: { examId_seatNumber_className: { examId: id, seatNumber: seatNumber.padStart(2, '0'), className } },
      update: { studentName, checkedInAt: new Date() },
      create: { examId: id, studentName, seatNumber: seatNumber.padStart(2, '0'), className }
    });

    return NextResponse.json({
      success: true,
      checkinId: checkIn.id,
      totalQuestions: exam.totalQuestions
    });
  } catch (error) {
    console.error('CheckIn error:', error);
    return NextResponse.json({ error: '伺服器發生錯誤' }, { status: 500 });
  }
}
