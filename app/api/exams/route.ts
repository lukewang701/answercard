import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

function generateShareCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(
  request: Request
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('teacher_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { name, classes, date, totalQuestions, totalScore = 100, note, questions } = data;

    // Parse classes string (e.g. "101, 102, 103" -> ["101", "102", "103"])
    // If empty or whitespace, we still want to create at least 1 exam
    let classList = (classes || '').split(',').map((c: string) => c.trim()).filter(Boolean);
    if (classList.length === 0) {
      classList = ['']; // 1 default exam with no class suffix
    }

    const createdExams = [];

    for (const className of classList) {
      // Generate unique share code
      let shareCode = generateShareCode();
      let isUnique = false;
      while (!isUnique) {
        const existing = await prisma.exam.findUnique({ where: { shareCode } });
        if (!existing) isUnique = true;
        else shareCode = generateShareCode();
      }

      const examName = className ? `${name} - ${className}` : name;

      const exam = await prisma.exam.create({
        data: {
          name: examName,
          baseName: name,
          targetClass: className || null,
          date: new Date(date),
          totalQuestions,
          totalScore: Number(totalScore) || 100,
          note,
          shareCode,
          questions: {
            create: questions.map((q: any) => ({
              number: q.number,
              correctAnswers: JSON.stringify(q.correctAnswers),
              points: q.points || null,
              isMultiple: q.isMultiple || false,
            }))
          }
        }
      });
      createdExams.push(exam);
    }

    return NextResponse.json({ success: true, exams: createdExams });
  } catch (error) {
    console.error('Create exam error:', error);
    return NextResponse.json({ success: false, error: '伺服器錯誤' }, { status: 500 });
  }
}
