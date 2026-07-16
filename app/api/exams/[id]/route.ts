import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const data = await request.json();
    const { name, classes, date, totalQuestions, totalScore, note, questions } = data;

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

    // 2. Perform transaction for safe updates
    const createdQuestions = await prisma.$transaction(async (tx) => {
      // 2a. Update basic exam info
      await tx.exam.update({
        where: { id },
        data: {
          name,
          targetClass: classes || '',
          date: new Date(date),
          totalQuestions,
          totalScore,
          note
        }
      });

      // 2b. Delete old questions and insert new ones
      await tx.question.deleteMany({
        where: { examId: id }
      });

      const definedPoints = questions.reduce((sum: number, q: any) => sum + (q.points || 0), 0);
      const questionsWithoutPoints = questions.filter((q: any) => q.points === null).length;
      const defaultPointsPerQ = questionsWithoutPoints > 0
        ? Math.max(0, (totalScore - definedPoints) / questionsWithoutPoints)
        : 0;

      const newQs = await Promise.all(
        questions.map((q: any) =>
          tx.question.create({
            data: {
              examId: id,
              number: q.number,
              correctAnswers: JSON.stringify(q.correctAnswers),
              points: q.points,
              isMultiple: q.isMultiple
            }
          })
        )
      );
      
      return { newQs, defaultPointsPerQ };
    });

    const { newQs, defaultPointsPerQ } = createdQuestions;

    // 3. Recalculate scores for all submissions outside the main transaction
    if (existingExam.submissions.length > 0) {
      for (const sub of existingExam.submissions) {
        let rawScore = 0;
        const updatedAnswersData = [];

        for (const studentAns of sub.answers) {
          const q = newQs.find(cq => cq.number === studentAns.number);
          let isCorrect = false;
          let pointsEarned = 0;

          if (q) {
            const qPoints = q.points || defaultPointsPerQ;
            const correctAnsArray = JSON.parse(q.correctAnswers);
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

          updatedAnswersData.push({
            id: studentAns.id,
            isCorrect,
            pointsEarned
          });
        }

        // Run updates for this submission in a mini-transaction to ensure consistency per student
        // and avoid the 5-second timeout of the massive global transaction
        await prisma.$transaction(async (tx) => {
          for (const uAns of updatedAnswersData) {
            await tx.answer.update({
              where: { id: uAns.id },
              data: {
                isCorrect: uAns.isCorrect,
                pointsEarned: uAns.pointsEarned
              }
            });
          }

          const latePenalty = sub.latePenalty || 0;
          const finalTotalScore = Math.round(Math.max(0, rawScore - latePenalty));
          const roundedRawScore = Math.round(rawScore);

          await tx.submission.update({
            where: { id: sub.id },
            data: {
              rawScore: sub.isLate ? roundedRawScore : null,
              totalScore: finalTotalScore
            }
          });
        });
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Update exam error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
