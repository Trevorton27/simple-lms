import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding interactive coding tutor data...');

  // Create concepts
  const htmlBasics = await prisma.concept.upsert({
    where: { name: 'html-basics' },
    update: {},
    create: {
      name: 'html-basics',
      description: 'Basic HTML structure and elements',
      difficulty: 1,
      prerequisites: [],
    },
  });

  const cssBasics = await prisma.concept.upsert({
    where: { name: 'css-styling' },
    update: {},
    create: {
      name: 'css-styling',
      description: 'CSS styling and layout basics',
      difficulty: 2,
      prerequisites: ['html-basics'],
    },
  });

  const jsBasics = await prisma.concept.upsert({
    where: { name: 'javascript-basics' },
    update: {},
    create: {
      name: 'javascript-basics',
      description: 'JavaScript fundamentals',
      difficulty: 2,
      prerequisites: ['html-basics'],
    },
  });

  console.log('✓ Created concepts');

  // Create tasks
  const task1 = await prisma.task.upsert({
    where: { id: 'html-basics-1' },
    update: {},
    create: {
      id: 'html-basics-1',
      title: 'Create Your First Webpage',
      description: 'Learn to create a basic HTML page with a heading and paragraph',
      prompt: `Create a simple webpage with:
- A main heading (h1) that says "Hello World"
- A paragraph that introduces yourself`,
      difficulty: 1,
      prerequisites: [],
      scaffold: {
        'index.html': '<!DOCTYPE html>\n<html>\n  <head>\n    <title>My Page</title>\n  </head>\n  <body>\n    <!-- Add your code here -->\n  </body>\n</html>',
      },
      solution: {
        'index.html': '<!DOCTYPE html>\n<html>\n  <head>\n    <title>My Page</title>\n  </head>\n  <body>\n    <h1>Hello World</h1>\n    <p>Hi, I\'m learning web development!</p>\n  </body>\n</html>',
      },
      tests: [
        {
          id: 'has-h1',
          code: "document.querySelector('h1') !== null",
          description: 'Page should have an h1 heading',
        },
        {
          id: 'has-paragraph',
          code: "document.querySelector('p') !== null",
          description: 'Page should have a paragraph',
        },
      ],
      hints: [
        {
          level: 1,
          text: 'Use the <h1> tag for the main heading',
          concept_tag: 'html-basics',
        },
        {
          level: 2,
          text: 'Use the <p> tag for the paragraph. Place both inside the <body> tag',
          concept_tag: 'html-basics',
        },
        {
          level: 3,
          text: 'Add <h1>Hello World</h1> and <p>Your introduction here</p> inside the body',
          concept_tag: 'html-basics',
        },
      ],
      detailedDescription: 'This task introduces you to the fundamental building blocks of HTML: headings and paragraphs.',
      realWorldContext: 'Every website you visit uses these basic HTML elements to structure content.',
      concepts: {
        create: [
          {
            concept: {
              connect: { id: htmlBasics.id },
            },
          },
        ],
      },
    },
  });

  const task2 = await prisma.task.upsert({
    where: { id: 'html-basics-2' },
    update: {},
    create: {
      id: 'html-basics-2',
      title: 'Add a Button',
      description: 'Learn to add interactive buttons to your page',
      prompt: 'Add a button to your webpage that says "Click Me!"',
      difficulty: 1,
      prerequisites: ['html-basics-1'],
      scaffold: {
        'index.html': '<!DOCTYPE html>\n<html>\n  <head>\n    <title>My Page</title>\n  </head>\n  <body>\n    <h1>Hello World</h1>\n    <!-- Add button here -->\n  </body>\n</html>',
      },
      solution: {
        'index.html': '<!DOCTYPE html>\n<html>\n  <head>\n    <title>My Page</title>\n  </head>\n  <body>\n    <h1>Hello World</h1>\n    <button>Click Me!</button>\n  </body>\n</html>',
      },
      tests: [
        {
          id: 'has-button',
          code: "document.querySelector('button') !== null",
          description: 'Page should have a button element',
        },
        {
          id: 'button-text',
          code: "document.querySelector('button')?.textContent.includes('Click')",
          description: 'Button should contain the word "Click"',
        },
      ],
      hints: [
        {
          level: 1,
          text: 'Use the <button> tag to create a button',
          concept_tag: 'html-basics',
        },
        {
          level: 2,
          text: 'Put the button text between opening and closing button tags',
          concept_tag: 'html-basics',
        },
        {
          level: 3,
          text: 'Add <button>Click Me!</button> after the h1 tag',
          concept_tag: 'html-basics',
        },
      ],
      detailedDescription: 'Buttons are essential for user interaction on web pages.',
      realWorldContext: 'Buttons are used everywhere: forms, navigation, triggering actions, etc.',
      concepts: {
        create: [
          {
            concept: {
              connect: { id: htmlBasics.id },
            },
          },
        ],
      },
    },
  });

  const task3 = await prisma.task.upsert({
    where: { id: 'css-basics-1' },
    update: {},
    create: {
      id: 'css-basics-1',
      title: 'Style Your Heading',
      description: 'Use CSS to change the color of your heading',
      prompt: 'Make the heading blue using CSS',
      difficulty: 2,
      prerequisites: ['html-basics-1'],
      scaffold: {
        'index.html': '<!DOCTYPE html>\n<html>\n  <head>\n    <title>My Page</title>\n    <style>\n      /* Add your CSS here */\n    </style>\n  </head>\n  <body>\n    <h1>Hello World</h1>\n  </body>\n</html>',
      },
      solution: {
        'index.html': '<!DOCTYPE html>\n<html>\n  <head>\n    <title>My Page</title>\n    <style>\n      h1 {\n        color: blue;\n      }\n    </style>\n  </head>\n  <body>\n    <h1>Hello World</h1>\n  </body>\n</html>',
      },
      tests: [
        {
          id: 'h1-has-style',
          code: "window.getComputedStyle(document.querySelector('h1')).color !== 'rgb(0, 0, 0)'",
          description: 'H1 should have a color style applied',
        },
      ],
      hints: [
        {
          level: 1,
          text: 'Write CSS inside the <style> tag in the <head>',
          concept_tag: 'css-styling',
        },
        {
          level: 2,
          text: 'Target h1 elements with "h1 { }" and add the color property',
          concept_tag: 'css-styling',
        },
        {
          level: 3,
          text: 'Add "h1 { color: blue; }" inside the style tag',
          concept_tag: 'css-styling',
        },
      ],
      detailedDescription: 'CSS (Cascading Style Sheets) controls how HTML elements look.',
      realWorldContext: 'Every colorful, beautifully designed website uses CSS for styling.',
      concepts: {
        create: [
          {
            concept: {
              connect: { id: cssBasics.id },
            },
          },
        ],
      },
    },
  });

  console.log('✓ Created tasks');
  console.log('\nSample data created:');
  console.log(`  - 3 concepts: ${htmlBasics.name}, ${cssBasics.name}, ${jsBasics.name}`);
  console.log(`  - 3 tasks: ${task1.title}, ${task2.title}, ${task3.title}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error seeding data:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
