import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string, subId: string }> }
) {
  try {
    const { id, subId } = await params;
    
    // Auth check
    const cookieStore = await cookies();
    const token = cookieStore.get('teacher_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete submission. 
    // Prisma's onDelete: Cascade should handle deleting the answers.
    await prisma.submission.delete({
      where: {
        id: subId,
        examId: id // Ensure the submission actually belongs to this exam
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete submission:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
