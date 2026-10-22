import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const data = await request.json();
    const { name, classes, date, totalQuestions, totalScore, note, questions, optionMappings, showOptionMappings } = data;

    // 1. Validate exam exists
    const existingExam = await prisma.exam.findUnique({
      where: { id },
      include: {
        submissions: {
          include: { answers: true }
        }
      }
    });

    if (!existingExam) {
      return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 });
    }

    // 2. Update exam structure in one transaction
    const definedPoints = questions.reduce((sum: number, q: any) => sum + (q.points || 0), 0);
    const questionsWithoutPoints = questions.filter((q: any) => q.points === null).length;
    const defaultPointsPerQ = questionsWithoutPoints > 0
      ? Math.max(0, (totalScore - definedPoints) / questionsWithoutPoints)
      : 0;

    await prisma.$transaction(async (tx) => {
      await tx.exam.update({
        where: { id },
        data: {
          name,
          targetClass: classes || '',
          date: new Date(date),
          totalQuestions,
          totalScore,
          note,
          optionMappings: optionMappings ? JSON.stringify(optionMappings) : null,
          showOptionMappings: showOptionMappings !== false
        }
      });

      await tx.question.deleteMany({ where: { examId: id } });

      await tx.question.createMany({
        data: questions.map((q: any) => ({
          examId: id,
          number: q.number,
          correctAnswers: JSON.stringify(q.correctAnswers),
          points: q.points,
          isMultiple: q.isMultiple
        }))
      });
    });

    // 3. Recalculate scores entirely in memory, then write with 2 bulk SQL statements.
    //    This avoids O(students × questions) individual round-trips that cause
    //    Vercel function timeouts and PgBouncer pool exhaustion.
    if (existingExam.submissions.length > 0) {
      // Collect all answer and submission updates in memory first
      const allAnswerUpdates: { id: string; isCorrect: boolean; pointsEarned: number }[] = [];
      const allSubmissionUpdates: { id: string; totalScore: number; rawScore: number | null }[] = [];

      for (const sub of existingExam.submissions) {
        let rawScore = 0;

        for (const studentAns of sub.answers) {
          const q = questions.find((cq: any) => cq.number === studentAns.number);
          let isCorrect = false;
          let pointsEarned = 0;

          if (q) {
            const qPoints = q.points !== null ? q.points : defaultPointsPerQ;
            const correctAnsArray = q.correctAnswers;
            const studentAnsArray = JSON.parse(studentAns.selectedAnswers).sort();

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
          }

          allAnswerUpdates.push({ id: studentAns.id, isCorrect, pointsEarned });
        }

        const latePenalty = sub.latePenalty || 0;
        const roundedRawScore = Math.round(rawScore);
        const finalTotalScore = Math.round(Math.max(0, rawScore - latePenalty));
        allSubmissionUpdates.push({
          id: sub.id,
          totalScore: finalTotalScore,
          rawScore: sub.isLate ? roundedRawScore : null,
        });
      }

      // Bulk UPDATE all Answer rows in one SQL statement
      // UPDATE "Answer" SET ... FROM (VALUES (...), ...) WHERE id = v.id
      if (allAnswerUpdates.length > 0) {
        const answerValues = allAnswerUpdates.map(
          (a) => Prisma.sql`(${a.id}::text, ${a.isCorrect}::boolean, ${a.pointsEarned}::float8)`
        );
        await prisma.$executeRaw`
          UPDATE "Answer" AS a
          SET    "isCorrect"    = v."isCorrect",
                 "pointsEarned" = v."pointsEarned"
          FROM   (VALUES ${Prisma.join(answerValues)})
                 AS v(id, "isCorrect", "pointsEarned")
          WHERE  a.id = v.id
        `;
      }

      // Bulk UPDATE all Submission rows in one SQL statement
      if (allSubmissionUpdates.length > 0) {
        const subValues = allSubmissionUpdates.map(
          (s) => Prisma.sql`(${s.id}::text, ${s.totalScore}::float8, ${s.rawScore}::float8)`
        );
        await prisma.$executeRaw`
          UPDATE "Submission" AS s
          SET    "totalScore" = v."totalScore",
                 "rawScore"   = v."rawScore"
          FROM   (VALUES ${Prisma.join(subValues)})
                 AS v(id, "totalScore", "rawScore")
          WHERE  s.id = v.id
        `;
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Update exam error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
