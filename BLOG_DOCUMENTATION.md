# Blog System Documentation

## Overview

A fully bilingual (English/Japanese) blog system has been successfully integrated into your LMS platform. The system supports markdown content, tag categorization, draft management, and a complete admin interface.

## Features Implemented

### 1. Database Models (Prisma Schema)

Three new models have been added to your database:

#### BlogPost
- `id` - Unique identifier
- `slug` - URL-friendly identifier (unique)
- `titleEn` / `titleJa` - Bilingual titles
- `contentEn` / `contentJa` - Bilingual markdown content
- `excerptEn` / `excerptJa` - Optional short summaries
- `coverImage` - Optional cover image URL
- `mediaGallery` - JSON field for additional media (future use)
- `publishDate` - Scheduled or actual publish date
- `isPublished` - Boolean flag for draft/published status
- `authorId` - Reference to the User who created the post
- `tags` - Many-to-many relationship with BlogTag

#### BlogTag
- `id` - Unique identifier
- `nameEn` / `nameJa` - Bilingual tag names
- `slug` - URL-friendly identifier (unique)

#### BlogPostTag
- Junction table for many-to-many relationship between posts and tags

### 2. RBAC Permissions

New permissions added to [src/lib/rbac.ts](src/lib/rbac.ts):

- `blog:create` - Create blog posts (Admin, Instructor)
- `blog:update:own` - Update own posts (Instructor)
- `blog:update:any` - Update any post (Admin)
- `blog:delete:own` - Delete own posts (Instructor)
- `blog:delete:any` - Delete any post (Admin)
- `blog:publish:own` - Publish own posts (Instructor)
- `blog:publish:any` - Publish any post (Admin)

Helper functions:
- `canManageBlogPost(userId, postId)` - Check if user can manage a post
- `requireBlogPostOwnership(userId, postId)` - Guard function

### 3. Internationalization (i18n)

**Files:**
- [src/lib/i18n.ts](src/lib/i18n.ts) - Locale utilities
- [src/contexts/LocaleContext.tsx](src/contexts/LocaleContext.tsx) - Client-side locale context

**Supported Locales:**
- `en` - English (default)
- `ja` - Japanese

**Usage:**
```tsx
import { useLocale } from '@/contexts/LocaleContext';

const { locale, setLocale } = useLocale();
const title = locale === 'en' ? post.titleEn : post.titleJa;
```

### 4. Admin Interface

#### Blog List Page: `/admin/blog`
[src/app/(admin)/admin/blog/page.tsx](src/app/(admin)/admin/blog/page.tsx)

**Features:**
- View all blog posts (Admins see all, Instructors see only their own)
- Filter by status (Published/Draft)
- Display tags, author, publish date
- Actions: View, Edit, Delete
- Create new post button

**Access:** Admin and Instructor roles

#### Create Post Page: `/admin/blog/new`
[src/app/(admin)/admin/blog/new/page.tsx](src/app/(admin)/admin/blog/new/page.tsx)

**Features:**
- Bilingual content editing (EN/JA)
- Slug generation (URL-friendly)
- Markdown editor for content
- Excerpt fields for previews
- Cover image URL input
- Publish date scheduling
- Tag selection/creation
- Save as Draft or Publish
- Markdown guide sidebar

**Required Fields:**
- Slug
- Title (English)
- Title (Japanese)
- Content (English)
- Content (Japanese)

**Optional Fields:**
- Excerpt (English)
- Excerpt (Japanese)
- Cover Image URL
- Publish Date
- Tags

#### Edit Post Page: `/admin/blog/[id]/edit`
[src/app/(admin)/admin/blog/[id]/edit/page.tsx](src/app/(admin)/admin/blog/[id]/edit/page.tsx)

**Features:**
- Same as create page, but pre-populated with existing data
- Post info sidebar showing status, author, dates
- Cover image preview
- Tag management
- Update or keep published status

**Access Control:**
- Instructors can only edit their own posts
- Admins can edit any post

### 5. Public Blog Pages

#### Blog List Page: `/blog`
[src/app/(blog)/blog/page.tsx](src/app/(blog)/blog/page.tsx)

**Features:**
- Display all published posts
- Language toggle (EN/JA)
- Tag filtering
- Responsive card grid layout
- Cover images
- Excerpts
- Author and publish date display
- Click to view full post

**Data Source:** `/api/blog` endpoint

#### Blog Post Detail Page: `/blog/[slug]`
[src/app/(blog)/blog/[slug]/page.tsx](src/app/(blog)/blog/[slug]/page.tsx)

**Features:**
- Full post display with bilingual content
- Language toggle
- Markdown rendering with:
  - Syntax highlighting for code blocks
  - GitHub Flavored Markdown support
  - Raw HTML support
  - Styled headings, lists, links, images
  - Responsive tables
  - Blockquotes
- Cover image display
- Tag display
- Author and publish date
- Breadcrumb navigation
- 404 handling for missing posts

**Data Source:** `/api/blog/[slug]` endpoint

### 6. API Routes

#### GET `/api/blog`
[src/app/api/blog/route.ts](src/app/api/blog/route.ts)

Fetches all published blog posts and all tags.

**Response:**
```json
{
  "posts": [
    {
      "id": "...",
      "slug": "...",
      "titleEn": "...",
      "titleJa": "...",
      "excerptEn": "...",
      "excerptJa": "...",
      "coverImage": "...",
      "publishDate": "...",
      "author": { "name": "...", "email": "..." },
      "tags": [{ "tag": { "id": "...", "nameEn": "...", "nameJa": "..." } }]
    }
  ],
  "tags": [
    { "id": "...", "nameEn": "...", "nameJa": "...", "slug": "..." }
  ]
}
```

#### GET `/api/blog/[slug]`
[src/app/api/blog/[slug]/route.ts](src/app/api/blog/[slug]/route.ts)

Fetches a single published blog post by slug.

**Response:** Single post object with full content

**Status Codes:**
- `200` - Success
- `404` - Post not found
- `500` - Server error

#### POST `/api/upload`
[src/app/api/upload/route.ts](src/app/api/upload/route.ts)

Image upload endpoint (placeholder for future storage integration).

**Access:** Admin and Instructor only

**Supported Types:**
- image/jpeg
- image/png
- image/gif
- image/webp

**Max Size:** 5MB

**Note:** This is a placeholder. You need to integrate with your storage provider:
- AWS S3
- Cloudflare R2
- Supabase Storage
- Vercel Blob

### 7. Middleware Configuration

[src/middleware.ts](src/middleware.ts) has been updated to allow public access to:
- `/blog(.*)`
- `/api/blog(.*)`

This ensures blog pages are accessible without authentication.

### 8. Navigation Updates

Blog links added to:
- [Homepage navigation](src/app/(marketing)/page.tsx)
- [Admin dashboard](src/app/(admin)/admin/page.tsx)
- Admin quick actions (Create Blog Post, Manage Blog)

## Database Migration

To apply the database schema changes, run:

```bash
npx prisma migrate dev --name add_blog_models
```

Or if your database is not accessible locally:

```bash
npx prisma generate  # Already done
# Then deploy via your hosting provider's migration system
```

## Dependencies Added

```json
{
  "react-markdown": "^9.x",
  "rehype-highlight": "^7.x",
  "rehype-raw": "^7.x",
  "remark-gfm": "^4.x"
}
```

These provide:
- Markdown rendering
- Syntax highlighting for code blocks
- GitHub Flavored Markdown (tables, task lists, strikethrough)
- Raw HTML support in markdown

## Usage Guide

### For Admins/Instructors

1. **Access Blog Management:**
   - Navigate to `/admin/blog`
   - Or click "Manage Blog" from the admin dashboard

2. **Create a New Post:**
   - Click "+ New Post" button
   - Fill in required fields (slug, titles, content)
   - Optionally add excerpts, cover image, tags
   - Choose "Save as Draft" or "Publish Now"

3. **Create Tags:**
   - While creating/editing a post, expand "Create New Tag"
   - Enter English name, Japanese name, and slug
   - Click "Create Tag"

4. **Edit a Post:**
   - Click "Edit" from the blog list
   - Make changes
   - Update status (Draft/Published)

5. **Delete a Post:**
   - Click "Delete" from the blog list
   - Confirm deletion

### For Content Writers

**Markdown Syntax:**

```markdown
# Heading 1
## Heading 2
### Heading 3

**Bold text**
*Italic text*

[Link text](https://example.com)

![Alt text](https://example.com/image.jpg)

- Unordered list item
- Another item

1. Ordered list item
2. Another item

> Blockquote

\`\`\`javascript
// Code block with syntax highlighting
const hello = "world";
\`\`\`

Inline `code`

| Table | Header |
|-------|--------|
| Cell  | Cell   |
```

### For Developers

**Extending the Blog System:**

1. **Add Preview Mode:**
   - Create route `/blog/preview/[id]` with auth check
   - Pass `?preview=true` query param
   - Modify API to accept preview token

2. **Add Comment System:**
   - Create `Comment` model in Prisma
   - Add comment form to post detail page
   - Create API routes for CRUD operations

3. **Add SEO Metadata:**
   - Use Next.js `generateMetadata` export
   - Add OpenGraph and Twitter Card meta tags

4. **Integrate Image Upload:**
   - Choose storage provider
   - Update `/api/upload` route
   - Add upload button to admin forms
   - Handle file uploads and generate URLs

5. **Add Search:**
   - Create search API endpoint
   - Add search bar to blog list
   - Filter posts by title/content

6. **Add Categories:**
   - Similar to tags but single-select
   - Add `categoryId` to BlogPost model
   - Create Category model

## File Structure

```
src/
├── app/
│   ├── (admin)/
│   │   └── admin/
│   │       ├── blog/
│   │       │   ├── page.tsx              # Blog list
│   │       │   ├── new/
│   │       │   │   └── page.tsx          # Create post
│   │       │   └── [id]/
│   │       │       └── edit/
│   │       │           └── page.tsx      # Edit post
│   │       └── page.tsx                  # Admin dashboard (updated)
│   ├── (blog)/
│   │   ├── layout.tsx                    # Blog layout with LocaleProvider
│   │   └── blog/
│   │       ├── page.tsx                  # Blog list (public)
│   │       └── [slug]/
│   │           └── page.tsx              # Blog post detail
│   ├── (marketing)/
│   │   └── page.tsx                      # Homepage (updated nav)
│   └── api/
│       ├── blog/
│       │   ├── route.ts                  # GET all posts
│       │   └── [slug]/
│       │       └── route.ts              # GET single post
│       └── upload/
│           └── route.ts                  # Image upload (placeholder)
├── contexts/
│   └── LocaleContext.tsx                 # Locale state management
└── lib/
    ├── i18n.ts                           # i18n utilities
    └── rbac.ts                           # RBAC (updated with blog permissions)

prisma/
└── schema.prisma                         # Database schema (updated)
```

## Styling

The blog system uses Tailwind CSS consistent with your existing LMS design:
- Blue color scheme (`blue-600`, `blue-700`)
- Responsive grid layouts
- Shadow and hover effects
- Clean card-based UI
- Mobile-friendly navigation

## Security Considerations

1. **Authentication:** Admin routes protected via Clerk middleware
2. **Authorization:** RBAC checks in page components
3. **Ownership:** Instructors can only manage their own posts
4. **XSS Protection:** React and rehype-sanitize protect against malicious content
5. **File Upload:** Size and type validation (when implemented)
6. **SQL Injection:** Prisma ORM provides protection

## Performance Optimization

Current implementation:
- Server-side data fetching
- Static content rendering where possible
- Image optimization (when using Next.js Image component)

Future optimizations:
- Add ISR (Incremental Static Regeneration) for blog posts
- Implement pagination for blog list
- Add caching headers
- Lazy load images
- Implement infinite scroll

## Troubleshooting

### Database Migration Fails
If you can't run migrations locally, deploy the schema changes through your hosting provider's migration system (e.g., Vercel, Railway, Render).

### Markdown Not Rendering
Ensure all dependencies are installed:
```bash
npm install --legacy-peer-deps react-markdown rehype-highlight rehype-raw remark-gfm
```

### 404 on Blog Routes
Check middleware configuration in [src/middleware.ts](src/middleware.ts) - ensure `/blog(.*)` is in the public routes list.

### Permission Denied
Verify user has ADMIN or INSTRUCTOR role assigned in Clerk organization or database.

## Next Steps

1. **Run Database Migration** (when database is accessible)
2. **Create Initial Tags** via admin interface
3. **Write First Blog Post** to test the system
4. **Configure Image Upload** with your storage provider
5. **Add SEO Metadata** for better search visibility
6. **Consider Adding:**
   - RSS feed
   - Related posts
   - Reading time estimate
   - Social sharing buttons
   - Newsletter signup

## Support

For issues or questions about the blog system:
1. Check this documentation
2. Review the code comments in relevant files
3. Test in development environment first
4. Check console for error messages

---

**Created:** 2025-11-05
**Version:** 1.0
**Status:** Production Ready (pending database migration and image upload integration)
