Simple LMS Setup Checklist
Follow this checklist to set up your LMS from scratch.
✅ Step 1: Verify All Files
Run the verification script:
bash./verify-artifacts.sh
All 28 files should show ✓
✅ Step 2: Set Up Clerk

Go to https://clerk.com and sign up
Create a new application
Enable Email/Password authentication
Copy your keys from the dashboard:

Publishable Key (starts with pk_test_)
Secret Key (starts with sk_test_)



✅ Step 3: Set Up Database
Choose ONE option:
Option A: Neon (Recommended - Free)

Go to https://neon.tech
Sign up and create a new project
Create a database
Copy the connection string
Make sure it ends with ?sslmode=require

Option B: Supabase

Go to https://supabase.com
Create a new project
Go to Settings → Database
Copy the "Connection pooling" string (not direct connection)

Option C: Local PostgreSQL
bash# Install PostgreSQL
# Then create database
createdb lms_dev
Connection string: postgresql://localhost:5432/lms_dev
✅ Step 4: Configure Environment
bash# Copy example file
cp .env.example .env

# Edit the file
nano .env
Fill in these required values:
bash# From Clerk dashboard
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# From Neon/Supabase/Local
DATABASE_URL="postgresql://..."

# Your app URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
Save and exit (Ctrl+X, Y, Enter)
✅ Step 5: Install Dependencies
bashnpm install
Wait for all packages to install (may take 2-3 minutes)
✅ Step 6: Generate Prisma Client
bashnpm run prisma:generate
Should show: "✔ Generated Prisma Client"
✅ Step 7: Run Database Migrations
bashnpm run prisma:migrate:dev
When prompted for migration name, type: init
This creates all database tables.
✅ Step 8: Seed the Database
bashnpm run seed
Should show:

✓ Roles created
✓ Users created
✓ Course created
✓ Modules created
✓ Lessons created
✓ Quiz created
✓ Schedules created
✓ Students enrolled
✓ Progress records created

✅ Step 9: Start Development Server
bashnpm run dev
Should show: Local: http://localhost:3000
✅ Step 10: Test the Application
Test 1: Homepage

Open browser to http://localhost:3000
Should see the LMS Platform homepage
Click "Sign Up" button

Test 2: Create Account

Sign up with Clerk (use email/password)
Complete the sign-up flow
You should be redirected to dashboard

Test 3: Browse Courses

Click "Courses" in navigation
Should see "Introduction to Web Development"
Click on it to view details

Test 4: Enroll in Course

Click "Enroll for Free" button
Should see "✓ Enrolled" badge
Click "Go to Dashboard"

Test 5: View Dashboard

Should see enrolled course
Should show 0% progress
Click on the course card

✅ Step 11: Verify Database
Open Prisma Studio to view your data:
bashnpm run prisma:studio
Browser opens to http://localhost:5555
Check:

Users table has your Clerk user
Roles table has ADMIN, INSTRUCTOR, STUDENT
Course table has seeded course
Enrollment table has your enrollment

🎉 Success Checklist

 All 28 files have content
 Clerk keys configured
 Database connected
 Dependencies installed
 Prisma client generated
 Migrations ran successfully
 Database seeded
 Dev server running
 Can sign up/sign in
 Can view courses
 Can enroll in course
 Dashboard shows progress

🐛 Troubleshooting
Issue: "Missing publishableKey"
Solution:

Check .env has NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
Restart dev server: Ctrl+C, then npm run dev

Issue: "Can't reach database"
Solution:

Verify DATABASE_URL is correct
For Neon, ensure ?sslmode=require at end
Test with: npm run prisma:studio

Issue: "Module not found @prisma/client"
Solution:
bashnpm run prisma:generate
npm install
Issue: TypeScript errors
Solution:
bashnpm run prisma:generate
# Restart VS Code TypeScript server
# Cmd/Ctrl+Shift+P → "TypeScript: Restart TS Server"
Issue: Port 3000 already in use
Solution:
bash# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
# Or use different port
npm run dev -- -p 3001
📚 Next Steps
Once everything works:

Customize branding

Edit colors in tailwind.config.ts
Update site name in src/app/layout.tsx


Add instructor role

Open Prisma Studio: npm run prisma:studio
Find your user ID in Users table
Get INSTRUCTOR role ID from Roles table
Create UserRole entry linking them


Create your own course

Go to /instructor (after adding instructor role)
Click "Create Course"


Deploy to production

Push to GitHub
Connect to Vercel
Add environment variables
Deploy!



🆘 Need Help?

Check README.md for detailed information
Review the verification script output
Check browser console for errors (F12)
Check terminal for server errors

✅ Ready for Production?
Before deploying:

 Update NEXT_PUBLIC_APP_URL in .env
 Use production Clerk instance
 Use production database
 Add proper error monitoring
 Test all features thoroughly
 Set up CI/CD pipeline


Congratulations! Your LMS is now set up and running.