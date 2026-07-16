import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cls = await prisma.class.findUnique({
      where: { id },
      include: {
        students: {
          orderBy: { seatNumber: 'asc' }
        }
      }
    });
    if (!cls) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(cls);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch class' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.class.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete class:', error);
    return NextResponse.json({ error: 'Failed to delete class' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, students } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Invalid class name' }, { status: 400 });
    }

    // Using transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // 1. Update class name
      await tx.class.update({
        where: { id },
        data: { name: name.trim() }
      });

      // 2. Delete all existing students for this class
      await tx.student.deleteMany({
        where: { classId: id }
      });

      // 3. Re-insert the updated students
      if (students && Array.isArray(students) && students.length > 0) {
        for (const s of students) {
          await tx.student.create({
            data: {
              classId: id,
              seatNumber: s.seatNumber,
              name: s.name
            }
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update class:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: '班級名稱已存在，請使用其他名稱' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update class' }, { status: 500 });
  }
}
