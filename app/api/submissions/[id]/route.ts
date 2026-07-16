import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        answers: true,
        exam: {
          select: {
            totalScore: true,
            questions: {
              select: {
                number: true,
                correctAnswers: true
              }
            }
          }
        }
      }
    });

    if (!submission) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ submission });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
