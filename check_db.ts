import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const exams = await prisma.exam.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { questions: true }
  });
  
  exams.forEach(e => {
    console.log(`ID: ${e.id} | Name: ${e.name} | TotalScore: ${e.totalScore} | Qs: ${e.questions.length}`);
    const noPoints = e.questions.filter(q => q.points === null).length;
    const definedPoints = e.questions.reduce((acc, q) => acc + (q.points || 0), 0);
    console.log(`  noPoints: ${noPoints}, definedPoints: ${definedPoints}`);
  });
}
main().finally(() => prisma.$disconnect());
