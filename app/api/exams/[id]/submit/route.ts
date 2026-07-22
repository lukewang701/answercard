import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await request.json();
    const { studentInfo, answers, submittedBy } = data;

    const exam = await prisma.exam.findUnique({
      where: { id },
      include: { questions: true }
    });

    if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });

    // ── Timing check ──────────────────────────────────────────────────────────
    const now = new Date();
    const startTime = exam.startTime ? new Date(exam.startTime) : null;
    const deadline = exam.deadline ? new Date(exam.deadline) : null;
    const lateDeadline = exam.lateDeadline ? new Date(exam.lateDeadline) : null;

    if (startTime && now < startTime) {
      return NextResponse.json({ error: '考試尚未開始，無法繳交答案卡' }, { status: 403 });
    }

    let isLate = false;
    let latePenalty = 0;

    if (deadline && now > deadline) {
      // Past deadline — check whether we're in late window, extra-open, or fully closed
      if (exam.allowLateSubmission && lateDeadline && now <= lateDeadline) {
        // In the late window
        if (exam.lateMarkEnabled) {
          isLate = true;
          latePenalty = 5;
        }
      } else if (exam.extraOpen) {
        // Extra submission open — teacher decides penalty via lateMarkEnabled
        if (exam.lateMarkEnabled) {
          isLate = true;
          latePenalty = 5;
        }
      } else {
        // Fully closed
        return NextResponse.json({ error: '繳交時間已截止，無法繳交答案卡' }, { status: 403 });
      }
    }

    // ── Grading ───────────────────────────────────────────────────────────────
    const definedPoints = exam.questions.reduce((sum, q) => sum + (q.points || 0), 0);
    const questionsWithoutPoints = exam.questions.filter(q => !q.points).length;
    const defaultPointsPerQ = questionsWithoutPoints > 0
      ? Math.max(0, ((exam.totalScore || 100) - definedPoints) / questionsWithoutPoints)
      : 0;

    let rawScore = 0;
    const processedAnswers = [];

    for (const ans of answers) {
      const question = exam.questions.find(q => q.number === ans.number);
      if (!question) continue;

      const correctAnsArray = JSON.parse(question.correctAnswers);
      const studentAnsArray = ans.selectedAnswers.sort();
      const qPoints = question.points || defaultPointsPerQ;

      let isCorrect = false;
      let pointsEarned = 0;
      let validCombos: string[] = [];

      if (correctAnsArray.length === 1 && correctAnsArray[0].includes('/')) {
        validCombos = correctAnsArray[0].split('/').map((part: string) => part.split('').sort().join(''));
      } else if (correctAnsArray.length === 1 && correctAnsArray[0].length >= 1) {
        validCombos = [correctAnsArray[0].split('').sort().join('')];
      } else {
        validCombos = [correctAnsArray.sort().join('')];
      }

      const studentJoined = studentAnsArray.join('');
      if (validCombos.includes(studentJoined) && studentJoined.length > 0) {
        isCorrect = true;
        pointsEarned = qPoints;
      }

      rawScore += pointsEarned;
      processedAnswers.push({
        number: ans.number,
        selectedAnswers: JSON.stringify(studentAnsArray),
        isCorrect,
        pointsEarned
      });
    }

    const totalScore = Math.round(Math.max(0, rawScore - latePenalty));
    rawScore = Math.round(rawScore);

    const submission = await prisma.submission.create({
      data: {
        examId: exam.id,
        year: studentInfo.year,
        class: studentInfo.class,
        seatNumber: studentInfo.seatNumber,
        studentName: studentInfo.name || '',
        totalScore,
        rawScore: isLate ? rawScore : null,
        isLate,
        latePenalty,
        submittedBy,
        answers: { create: processedAnswers }
      }
    });

    return NextResponse.json({
      success: true,
      submission: {
        ...submission,
        exam: { totalScore: exam.totalScore }
      }
    });
  } catch (error) {
    console.error('Submit error:', error);
    return NextResponse.json({ success: false, error: '伺服器錯誤' }, { status: 500 });
  }
}
