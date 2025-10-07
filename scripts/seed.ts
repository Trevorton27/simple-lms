import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN' },
  });

  const instructorRole = await prisma.role.upsert({
    where: { name: 'INSTRUCTOR' },
    update: {},
    create: { name: 'INSTRUCTOR' },
  });

  const studentRole = await prisma.role.upsert({
    where: { name: 'STUDENT' },
    update: {},
    create: { name: 'STUDENT' },
  });

  console.log('✓ Roles created');

  // Create users
  const admin = await prisma.user.upsert({
    where: { id: 'user_admin_seed' },
    update: {},
    create: {
      id: 'user_admin_seed',
      email: 'admin@example.com',
      name: 'Admin User',
      locale: 'en',
      timeZone: 'America/New_York',
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: adminRole.id,
    },
  });

  const instructor = await prisma.user.upsert({
    where: { id: 'user_instructor_seed' },
    update: {},
    create: {
      id: 'user_instructor_seed',
      email: 'instructor@example.com',
      name: 'Jane Instructor',
      locale: 'en',
      timeZone: 'America/Los_Angeles',
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: instructor.id,
        roleId: instructorRole.id,
      },
    },
    update: {},
    create: {
      userId: instructor.id,
      roleId: instructorRole.id,
    },
  });

  const student1 = await prisma.user.upsert({
    where: { id: 'user_student1_seed' },
    update: {},
    create: {
      id: 'user_student1_seed',
      email: 'student1@example.com',
      name: 'Alice Student',
      locale: 'en',
      timeZone: 'UTC',
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: student1.id,
        roleId: studentRole.id,
      },
    },
    update: {},
    create: {
      userId: student1.id,
      roleId: studentRole.id,
    },
  });

  const student2 = await prisma.user.upsert({
    where: { id: 'user_student2_seed' },
    update: {},
    create: {
      id: 'user_student2_seed',
      email: 'student2@example.com',
      name: 'Bob Student',
      locale: 'ja',
      timeZone: 'Asia/Tokyo',
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: student2.id,
        roleId: studentRole.id,
      },
    },
    update: {},
    create: {
      userId: student2.id,
      roleId: studentRole.id,
    },
  });

  console.log('✓ Users created');

  // Create course
  const course = await prisma.course.upsert({
    where: { slug: 'intro-to-web-development' },
    update: {},
    create: {
      slug: 'intro-to-web-development',
      title: 'Introduction to Web Development',
      description:
        'Learn the fundamentals of web development including HTML, CSS, and JavaScript.',
      price: 99.99,
      visibility: 'PUBLIC',
      publishedAt: new Date(),
      ownerId: instructor.id,
    },
  });

  console.log('✓ Course created');

  // Create modules
  const module1 = await prisma.module.create({
    data: {
      courseId: course.id,
      title: 'Getting Started with HTML',
      order: 1,
    },
  });

  const module2 = await prisma.module.create({
    data: {
      courseId: course.id,
      title: 'CSS Fundamentals',
      order: 2,
    },
  });

  console.log('✓ Modules created');

  // Create lessons
  const lesson1 = await prisma.lesson.create({
    data: {
      moduleId: module1.id,
      title: 'What is HTML?',
      order: 1,
      content: '# What is HTML?\n\nHTML (HyperText Markup Language) is the standard markup language for creating web pages.',
      videoUrl: 'https://www.youtube.com/watch?v=example1',
      isFreePreview: true,
      durationSec: 300,
    },
  });

  const lesson2 = await prisma.lesson.create({
    data: {
      moduleId: module1.id,
      title: 'HTML Elements and Tags',
      order: 2,
      content: '# HTML Elements\n\nLearn about common HTML elements and how to use them.',
      videoUrl: 'https://www.youtube.com/watch?v=example2',
      isFreePreview: true,
      durationSec: 480,
    },
  });

  const lesson3 = await prisma.lesson.create({
    data: {
      moduleId: module1.id,
      title: 'Building Your First Page',
      order: 3,
      content: '# Your First HTML Page\n\nLets build a complete HTML page from scratch.',
      videoUrl: 'https://www.youtube.com/watch?v=example3',
      durationSec: 600,
    },
  });

  const lesson4 = await prisma.lesson.create({
    data: {
      moduleId: module2.id,
      title: 'Introduction to CSS',
      order: 1,
      content: '# CSS Basics\n\nCSS is used to style HTML elements.',
      videoUrl: 'https://www.youtube.com/watch?v=example4',
      durationSec: 450,
    },
  });

  const lesson5 = await prisma.lesson.create({
    data: {
      moduleId: module2.id,
      title: 'CSS Selectors and Properties',
      order: 2,
      content: '# CSS Selectors\n\nLearn how to target HTML elements with CSS selectors.',
      videoUrl: 'https://www.youtube.com/watch?v=example5',
      durationSec: 720,
    },
  });

  console.log('✓ Lessons created');

  // Create quiz
  const quiz = await prisma.quiz.create({
    data: {
      lessonId: lesson3.id,
      title: 'HTML Basics Quiz',
    },
  });

  const q1 = await prisma.question.create({
    data: {
      quizId: quiz.id,
      prompt: 'What does HTML stand for?',
      type: 'MCQ',
    },
  });

  await prisma.choice.createMany({
    data: [
      { questionId: q1.id, text: 'HyperText Markup Language', isCorrect: true },
      { questionId: q1.id, text: 'HighText Machine Language', isCorrect: false },
      { questionId: q1.id, text: 'Home Tool Markup Language', isCorrect: false },
      { questionId: q1.id, text: 'Hyperlinks and Text Markup Language', isCorrect: false },
    ],
  });

  const q2 = await prisma.question.create({
    data: {
      quizId: quiz.id,
      prompt: 'Which tag is used to create a paragraph?',
      type: 'MCQ',
    },
  });

  await prisma.choice.createMany({
    data: [
      { questionId: q2.id, text: '<p>', isCorrect: true },
      { questionId: q2.id, text: '<paragraph>', isCorrect: false },
      { questionId: q2.id, text: '<para>', isCorrect: false },
      { questionId: q2.id, text: '<text>', isCorrect: false },
    ],
  });

  const q3 = await prisma.question.create({
    data: {
      quizId: quiz.id,
      prompt: 'HTML is a programming language.',
      type: 'TRUE_FALSE',
    },
  });

  await prisma.choice.createMany({
    data: [
      { questionId: q3.id, text: 'True', isCorrect: false },
      { questionId: q3.id, text: 'False', isCorrect: true },
    ],
  });

  console.log('✓ Quiz created');

  // Create schedules
  await prisma.schedule.create({
    data: {
      courseId: course.id,
      title: 'Live Q&A Session',
      description: 'Join us for a live question and answer session',
      startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      location: 'Online',
      isOnline: true,
      meetingUrl: 'https://meet.example.com/session1',
      visibility: 'ENROLLED_ONLY',
    },
  });

  await prisma.schedule.create({
    data: {
      courseId: course.id,
      title: 'In-Person Workshop',
      description: 'Hands-on coding workshop',
      startsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      location: 'Room 301, Tech Building',
      isOnline: false,
      visibility: 'PUBLIC',
    },
  });

  console.log('✓ Schedules created');

  // Enroll students
  await prisma.enrollment.create({
    data: {
      userId: student1.id,
      courseId: course.id,
      status: 'ENROLLED',
    },
  });

  await prisma.enrollment.create({
    data: {
      userId: student2.id,
      courseId: course.id,
      status: 'ENROLLED',
    },
  });

  console.log('✓ Students enrolled');

  // Create progress
  await prisma.progress.create({
    data: {
      userId: student1.id,
      lessonId: lesson1.id,
      secondsWatched: 300,
      completedAt: new Date(),
    },
  });

  await prisma.progress.create({
    data: {
      userId: student1.id,
      lessonId: lesson2.id,
      secondsWatched: 240,
    },
  });

  console.log('✓ Progress records created');

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorUserId: admin.id,
      action: 'CREATE',
      entity: 'Seed',
      entityId: 'seed-script',
      metadata: {
        timestamp: new Date().toISOString(),
        description: 'Database seeded with initial data',
      },
    },
  });

  console.log('✓ Audit log created');
  console.log('\n✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });