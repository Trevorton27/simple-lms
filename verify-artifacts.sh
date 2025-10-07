#!/bin/bash

echo "🔍 Verifying Artifact Files..."
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL=0
FOUND=0
MISSING=0

# Function to check file
check_file() {
    local file=$1
    local artifact=$2
    TOTAL=$((TOTAL + 1))
    
    if [ -f "$file" ]; then
        if [ -s "$file" ]; then
            echo -e "${GREEN}✓${NC} $file (artifact: $artifact)"
            FOUND=$((FOUND + 1))
        else
            echo -e "${YELLOW}⚠${NC} $file exists but is EMPTY (artifact: $artifact)"
            MISSING=$((MISSING + 1))
        fi
    else
        echo -e "${RED}✗${NC} $file NOT FOUND (artifact: $artifact)"
        MISSING=$((MISSING + 1))
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "ROOT FILES:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file ".env.example" "simple_env"
check_file ".gitignore" "gitignore"
check_file "package.json" "simple_package_json"
check_file "tsconfig.json" "tsconfig"
check_file "next.config.js" "next_config"
check_file "tailwind.config.ts" "simple_tailwind_config"
check_file "postcss.config.js" "simple_postcss"
check_file "README.md" "simple_readme"
check_file "SETUP-CHECKLIST.md" "simple_checklist"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "DATABASE & SCRIPTS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file "prisma/schema.prisma" "simple_prisma_schema"
check_file "scripts/seed.ts" "simple_seed"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "GITHUB:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file ".github/workflows/ci.yml" "simple_github_ci"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "LIBRARY FILES:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file "src/lib/db.ts" "lib_db"
check_file "src/lib/auth.ts" "lib_auth"
check_file "src/lib/rbac.ts" "lib_rbac"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "APP CORE:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file "src/app/layout.tsx" "simple_layout"
check_file "src/app/globals.css" "simple_globals_css"
check_file "src/middleware.ts" "simple_middleware"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "APP PAGES:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file "src/app/(marketing)/page.tsx" "simple_marketing_page"
check_file "src/app/(public)/courses/page.tsx" "simple_courses_list"
check_file "src/app/(public)/courses/[slug]/page.tsx" "simple_course_detail"
check_file "src/app/(student)/dashboard/page.tsx" "simple_student_dashboard"
check_file "src/app/(instructor)/instructor/page.tsx" "simple_instructor_dashboard"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "API ROUTES:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file "src/app/api/courses/route.ts" "simple_api_courses"
check_file "src/app/api/schedules/route.ts" "simple_api_schedules"
check_file "src/app/api/progress/route.ts" "simple_api_progress"
check_file "src/app/api/enrollments/route.ts" "simple_api_enrollments"
check_file "src/app/api/answers/route.ts" "simple_api_answers"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SUMMARY:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Total files expected: ${TOTAL}"
echo -e "${GREEN}Found with content: ${FOUND}${NC}"
echo -e "${RED}Missing or empty: ${MISSING}${NC}"
echo ""

if [ $MISSING -eq 0 ]; then
    echo -e "${GREEN}✅ All artifacts are present and have content!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. cp .env.example .env"
    echo "2. Add your Clerk and Database credentials to .env"
    echo "3. npm install"
    echo "4. npm run prisma:migrate:dev"
    echo "5. npm run seed"
    echo "6. npm run dev"
else
    echo -e "${YELLOW}⚠️  Some files are missing or empty.${NC}"
    echo "Please copy content from the missing artifacts listed above."
fi
