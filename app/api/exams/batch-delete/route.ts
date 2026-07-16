import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

export async function POST(request: Request) {
  try {
    const { examIds, password } = await request.json();

    if (!examIds || !Array.isArray(examIds) || examIds.length === 0) {
      return NextResponse.json({ success: false, message: '未指定要刪除的試卷' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ success: false, message: '請輸入密碼' }, { status: 400 });
    }

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ success: false, message: '密碼錯誤，拒絕刪除' }, { status: 401 });
    }

    // Cascade deletion using transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete answers related to submissions of these exams
      await tx.answer.deleteMany({
        where: {
          submission: {
            examId: { in: examIds }
          }
        }
      });

      // 2. Delete submissions
      await tx.submission.deleteMany({
        where: {
          examId: { in: examIds }
        }
      });

      // 3. Delete questions
      await tx.question.deleteMany({
        where: {
          examId: { in: examIds }
        }
      });

      // 4. Delete the exams
      await tx.exam.deleteMany({
        where: {
          id: { in: examIds }
        }
      });
    });

    return NextResponse.json({ success: true, message: '刪除成功' });
  } catch (error) {
    console.error('Batch delete error:', error);
    return NextResponse.json({ success: false, message: '伺服器發生錯誤，刪除失敗' }, { status: 500 });
  }
}
