# Simple LMS

A modern Learning Management System (LMS) built with Next.js, Prisma, and PostgreSQL. This platform enables instructors to create and manage courses, while students can browse, enroll, and track their progress through course content.

## Features

- **User Authentication**: Powered by Clerk with support for sign-in, sign-up, and organization management
- **Role-Based Access Control**: Admin, Instructor, and Student roles with appropriate permissions
- **Course Management**: Create, publish, and manage courses with modules and lessons
- **Content Types**: Support for video lessons, text content, and quizzes
- **Student Progress Tracking**: Track lesson completion and quiz results
- **Enrollment System**: Students can enroll in courses and track their learning journey
- **Public Course Catalog**: Browse published courses with instructor information
- **Admin Dashboard**: Manage courses, users, and platform settings
- **Quiz System**: Create multiple-choice quizzes with automatic grading
- **Scheduling**: Schedule course sessions with online/offline meeting support
- **Bilingual Blog System**: Full-featured blog with English/Japanese support, markdown rendering, and tag categorization (see [BLOG_DOCUMENTATION.md](BLOG_DOCUMENTATION.md))

## Tech Stack

- **Framework**: Next.js 15 (React 19)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Prerequisites

- Node.js 20+
- PostgreSQL database
- Clerk account (for authentication)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd simple-lms
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL='postgresql://username:password@localhost:5432/lms'
DIRECT_URL='postgresql://username:password@localhost:5432/lms'

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
CLERK_SECRET_KEY=your_secret_key
CLERK_WEBHOOK_SECRET=your_webhook_secret

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### 4. Set up the database

```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate:dev

# (Optional) Seed the database with sample data
npm run seed
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm start` - Start the production server
- `npm run lint` - Run ESLint
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate:dev` - Run database migrations in development
- `npm run prisma:migrate:deploy` - Deploy database migrations to production
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run seed` - Seed the database with sample data

## Project Structure

```
simple-lms/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── (admin)/          # Admin dashboard routes
│   │   ├── (auth)/           # Authentication pages
│   │   ├── (blog)/           # Public blog pages
│   │   ├── (instructor)/     # Instructor dashboard
│   │   ├── (marketing)/      # Public landing page
│   │   ├── (public)/         # Public course catalog
│   │   ├── (student)/        # Student dashboard
│   │   └── api/              # API routes
│   ├── contexts/
│   │   └── LocaleContext.tsx # i18n locale context
│   ├── lib/
│   │   ├── auth.ts           # Authentication utilities
│   │   ├── db.ts             # Database connection
│   │   ├── i18n.ts           # Internationalization utilities
│   │   └── rbac.ts           # Role-based access control
│   └── middleware.ts         # Next.js middleware
├── scripts/
│   └── seed.ts               # Database seeding script
├── BLOG_DOCUMENTATION.md     # Blog system documentation
└── package.json
```

## User Roles

- **Admin**: Full platform access, can manage all courses and users
- **Instructor**: Can create and manage their own courses
- **Student**: Can browse and enroll in courses, track progress

## Database Schema

The application uses the following main models:

- **User**: User accounts and profiles
- **Role/UserRole**: Role-based access control
- **Course**: Course information and metadata
- **Module**: Course modules/sections
- **Lesson**: Individual lessons within modules
- **Quiz/Question/Choice**: Quiz system
- **Enrollment**: Student course enrollments
- **Progress**: Lesson completion tracking
- **Schedule**: Course scheduling
- **BlogPost**: Bilingual blog posts with markdown content
- **BlogTag**: Categorization tags for blog posts
- **BlogPostTag**: Many-to-many relationship between posts and tags
- **AuditLog**: System audit logging

## Deployment

### Build for production

```bash
npm run build
```

### Environment Variables for Production

Ensure all environment variables are set in your production environment, including:

- Production PostgreSQL database URL
- Clerk production keys
- Production app URL

## Author

Created by [Trevor Mearns](https://trevormearns.com)

## License

MIT
