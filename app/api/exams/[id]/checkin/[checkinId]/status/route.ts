import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; checkinId: string }> }
) {
  try {
    const { id, checkinId } = await params;
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json({ valid: false, error: 'Missing deviceId' }, { status: 400 });
    }

    const checkin = await prisma.checkIn.findUnique({
      where: { id: checkinId }
    });

    if (!checkin || checkin.examId !== id || checkin.deviceId !== deviceId) {
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('CheckIn status error:', error);
    return NextResponse.json({ valid: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
