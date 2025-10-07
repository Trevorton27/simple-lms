import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';

const submitAnswerSchema = z.object({
  questionId: z.string(),
  choiceId: z.string().optional(),
  text: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = submitAnswerSchema.parse(body);

    // Get question with quiz and lesson info
    const question = await db.question.findUnique({
      where: { id: data.questionId },
      include: {
        quiz: {
          include: {
            lesson: {
              select: {
                id: true,
              },
            },
          },
        },
        choices: true,
      },
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Determine if answer is correct
    let isCorrect = false;

    if (question.type === 'MCQ' || question.type === 'TRUE_FALSE') {
      if (!data.choiceId) {
        return NextResponse.json(
          { error: 'Choice ID required for MCQ/TRUE_FALSE' },
          { status: 400 }
        );
      }

      const choice = question.choices.find((c) => c.id === data.choiceId);
      isCorrect = choice?.isCorrect || false;
    } else if (question.type === 'SHORT') {
      // For short answer, mark as correct by default
      // In production, implement proper grading logic
      isCorrect = !!data.text && data.text.trim().length > 0;
    }

    // Create or update answer
    const answer = await db.answer.upsert({
      where: {
        questionId_userId: {
          questionId: data.questionId,
          userId: clerkUser.id,
        },
      },
      create: {
        questionId: data.questionId,
        userId: clerkUser.id,
        choiceId: data.choiceId,
        text: data.text,
        isCorrect,
      },
      update: {
        choiceId: data.choiceId,
        text: data.text,
        isCorrect,
        submittedAt: new Date(),
      },
    });

    return NextResponse.json({
      ...answer,
      correct: isCorrect,
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const quizId = searchParams.get('quizId');

    if (!quizId) {
      return NextResponse.json(
        { error: 'quizId is required' },
        { status: 400 }
      );
    }

    // Get quiz with lesson
    const quiz = await db.quiz.findUnique({
      where: { id: quizId },
      include: {
        lesson: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Get user's answers for this quiz
    const answers = await db.answer.findMany({
      where: {
        userId: clerkUser.id,
        question: {
          quizId,
        },
      },
      include: {
        question: {
          select: {
            id: true,
            prompt: true,
            type: true,
          },
        },
        choice: {
          select: {
            id: true,
            text: true,
          },
        },
      },
    });

    return NextResponse.json(answers);
  } catch (error) {
    console.error('Error fetching answers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}