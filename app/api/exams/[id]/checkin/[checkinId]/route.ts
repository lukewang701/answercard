import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// DELETE: teacher recalls a student's answer card
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; checkinId: string }> }
) {
  const { id, checkinId } = await params;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('teacher_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the checkin belongs to this exam
    const checkin = await prisma.checkIn.findUnique({ where: { id: checkinId } });
    if (!checkin || checkin.examId !== id) {
      return NextResponse.json({ error: '找不到此領取記錄' }, { status: 404 });
    }

    await prisma.checkIn.delete({ where: { id: checkinId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Recall error:', error);
    return NextResponse.json({ error: '伺服器發生錯誤' }, { status: 500 });
  }
}
