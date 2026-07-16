import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const classes = await prisma.class.findMany({
      include: {
        _count: { select: { students: true } }
      },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(classes);
  } catch (error) {
    console.error('Failed to fetch classes:', error);
    return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, students } = await request.json();

    if (!name || !students || !Array.isArray(students)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Check if class already exists
    const existing = await prisma.class.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: '班級名稱已存在' }, { status: 400 });
    }

    const newClass = await prisma.class.create({
      data: {
        name,
        students: {
          create: students.map((s: any) => ({
            seatNumber: s.seatNumber.toString().padStart(2, '0'),
            name: s.name,
          }))
        }
      }
    });

    return NextResponse.json(newClass);
  } catch (error) {
    console.error('Failed to create class:', error);
    return NextResponse.json({ error: 'Failed to create class' }, { status: 500 });
  }
}
