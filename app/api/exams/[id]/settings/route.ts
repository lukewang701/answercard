import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET: fetch current exam time settings (no auth - for cross-device polling)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const exam = await prisma.exam.findUnique({
    where: { id },
    select: { startTime: true, deadline: true, allowLateSubmission: true, lateDeadline: true, extraOpen: true, lateMarkEnabled: true }
  });
  if (!exam) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(exam);
}

// PATCH: update exam deadline / lateDeadline / extraOpen / lateMarkEnabled
export async function PATCH(
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

    const body = await request.json();
    const { startTime, deadline, allowLateSubmission, lateDeadline, extraOpen, lateMarkEnabled } = body;

    const updated = await prisma.exam.update({
      where: { id },
      data: {
        ...('startTime' in body    ? { startTime:    startTime    ? new Date(startTime)    : null } : {}),
        ...('deadline'  in body    ? { deadline:     deadline     ? new Date(deadline)     : null } : {}),
        ...('lateDeadline' in body ? { lateDeadline: lateDeadline ? new Date(lateDeadline) : null } : {}),
        ...(allowLateSubmission !== undefined ? { allowLateSubmission } : {}),
        ...(extraOpen             !== undefined ? { extraOpen }          : {}),
        ...(lateMarkEnabled       !== undefined ? { lateMarkEnabled }    : {}),
      },
      select: { id: true, startTime: true, deadline: true, allowLateSubmission: true, lateDeadline: true, extraOpen: true, lateMarkEnabled: true }
    });

    return NextResponse.json({ success: true, exam: updated });
  } catch (error) {
    console.error('Settings error:', error);
    return NextResponse.json({ error: '伺服器發生錯誤' }, { status: 500 });
  }
}
