import { redirect } from 'next/navigation';
import Link from 'next/link';
import { currentUser } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
import { db } from '@/lib/db';

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect('/sign-in');
  }

  const user = await db.user.findUnique({
    where: { id: clerkUser.id },
    include: {
      roles: {
        include: { role: true },
      },
    },
  });

  if (!user) {
    redirect('/dashboard');
  }

  const hasAccess = user.roles.some(
    (ur) => ur.role.name === 'ADMIN' || ur.role.name === 'INSTRUCTOR'
  );

  if (!hasAccess) {
    redirect('/dashboard');
  }

  const isAdmin = user.roles.some((ur) => ur.role.name === 'ADMIN');

  // Fetch blog post
  const post = await db.blogPost.findUnique({
    where: { id },
    include: {
      author: true,
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  if (!post) {
    redirect('/admin/blog');
  }

  // Check ownership
  if (!isAdmin && post.authorId !== user.id) {
    redirect('/admin/blog');
  }

  // Fetch available tags
  const allTags = await db.blogTag.findMany({
    orderBy: { nameEn: 'asc' },
  });

  const selectedTagIds = post.tags.map((pt) => pt.tagId);

  async function updatePost(formData: FormData) {
    'use server';

    const clerkUser = await currentUser();

    if (!clerkUser) {
      throw new Error('Unauthorized');
    }

    const slug = formData.get('slug') as string;
    const titleEn = formData.get('titleEn') as string;
    const titleJa = formData.get('titleJa') as string;
    const contentEn = formData.get('contentEn') as string;
    const contentJa = formData.get('contentJa') as string;
    const excerptEn = formData.get('excerptEn') as string;
    const excerptJa = formData.get('excerptJa') as string;
    const coverImage = formData.get('coverImage') as string;
    const isPublished = formData.get('isPublished') === 'true';
    const publishDate = formData.get('publishDate') as string;
    const selectedTags = formData.getAll('tags') as string[];

    // Validate required fields
    if (!slug || !titleEn || !titleJa || !contentEn || !contentJa) {
      throw new Error('Missing required fields');
    }

    // Update blog post
    await db.blogPost.update({
      where: { id },
      data: {
        slug,
        titleEn,
        titleJa,
        contentEn,
        contentJa,
        excerptEn: excerptEn || null,
        excerptJa: excerptJa || null,
        coverImage: coverImage || null,
        isPublished,
        publishDate: publishDate ? new Date(publishDate) : null,
      },
    });

    // Update tags - delete all and recreate
    await db.blogPostTag.deleteMany({
      where: { postId: id },
    });

    if (selectedTags.length > 0) {
      await db.blogPostTag.createMany({
        data: selectedTags.map((tagId) => ({
          postId: id,
          tagId,
        })),
      });
    }

    redirect('/admin/blog');
  }

  async function createTag(formData: FormData) {
    'use server';

    const nameEn = formData.get('tagNameEn') as string;
    const nameJa = formData.get('tagNameJa') as string;
    const slug = formData.get('tagSlug') as string;

    if (!nameEn || !nameJa || !slug) {
      throw new Error('Missing required tag fields');
    }

    await db.blogTag.create({
      data: {
        nameEn,
        nameJa,
        slug,
      },
    });

    redirect(`/admin/blog/${id}/edit`);
  }

  const defaultPublishDate = post.publishDate
    ? new Date(post.publishDate).toISOString().slice(0, 16)
    : '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              LMS Platform - Edit Blog Post
            </Link>
            <div className="flex gap-4 items-center">
              <Link href="/blog" className="text-gray-700 hover:text-blue-600">
                Blog
              </Link>
              <Link href="/courses" className="text-gray-700 hover:text-blue-600">
                Courses
              </Link>
              <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">
                Dashboard
              </Link>
              <Link href="/admin" className="text-gray-700 hover:text-blue-600">
                Admin
              </Link>
              <Link href="/admin/blog" className="text-gray-700 hover:text-blue-600 font-semibold">
                Manage Blog
              </Link>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Edit Blog Post</h1>
          <p className="text-gray-600">Update your blog post content</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form id="main-form" action={updatePost} className="bg-white rounded-lg shadow p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
                  Slug (URL-friendly) *
                </label>
                <input
                  type="text"
                  id="slug"
                  name="slug"
                  required
                  defaultValue={post.slug}
                  pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="my-blog-post"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use lowercase letters, numbers, and hyphens only
                </p>
              </div>

              {/* English Content */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">English Content</h3>

                <div className="mb-4">
                  <label htmlFor="titleEn" className="block text-sm font-medium text-gray-700 mb-2">
                    Title (English) *
                  </label>
                  <input
                    type="text"
                    id="titleEn"
                    name="titleEn"
                    required
                    defaultValue={post.titleEn}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter English title"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="excerptEn" className="block text-sm font-medium text-gray-700 mb-2">
                    Excerpt (English)
                  </label>
                  <textarea
                    id="excerptEn"
                    name="excerptEn"
                    rows={2}
                    defaultValue={post.excerptEn || ''}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Short summary for preview"
                  />
                </div>

                <div>
                  <label htmlFor="contentEn" className="block text-sm font-medium text-gray-700 mb-2">
                    Content (English, Markdown supported) *
                  </label>
                  <textarea
                    id="contentEn"
                    name="contentEn"
                    required
                    rows={12}
                    defaultValue={post.contentEn}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    placeholder="Write your content in Markdown..."
                  />
                </div>
              </div>

              {/* Japanese Content */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Japanese Content</h3>

                <div className="mb-4">
                  <label htmlFor="titleJa" className="block text-sm font-medium text-gray-700 mb-2">
                    Title (Japanese) *
                  </label>
                  <input
                    type="text"
                    id="titleJa"
                    name="titleJa"
                    required
                    defaultValue={post.titleJa}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="日本語タイトルを入力"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="excerptJa" className="block text-sm font-medium text-gray-700 mb-2">
                    Excerpt (Japanese)
                  </label>
                  <textarea
                    id="excerptJa"
                    name="excerptJa"
                    rows={2}
                    defaultValue={post.excerptJa || ''}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="プレビュー用の短い要約"
                  />
                </div>

                <div>
                  <label htmlFor="contentJa" className="block text-sm font-medium text-gray-700 mb-2">
                    Content (Japanese, Markdown supported) *
                  </label>
                  <textarea
                    id="contentJa"
                    name="contentJa"
                    required
                    rows={12}
                    defaultValue={post.contentJa}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    placeholder="Markdownでコンテンツを書く..."
                  />
                </div>
              </div>

              {/* Media */}
              <div className="border-t pt-6">
                <label htmlFor="coverImage" className="block text-sm font-medium text-gray-700 mb-2">
                  Cover Image URL
                </label>
                <input
                  type="url"
                  id="coverImage"
                  name="coverImage"
                  defaultValue={post.coverImage || ''}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
                {post.coverImage && (
                  <div className="mt-4">
                    <img
                      src={post.coverImage}
                      alt="Cover preview"
                      className="max-w-xs rounded-lg border"
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-6">
                <Link
                  href="/admin/blog"
                  className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-semibold text-center"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  name="isPublished"
                  value="false"
                  className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 font-semibold"
                >
                  Save as Draft
                </button>
                <button
                  type="submit"
                  name="isPublished"
                  value="true"
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
                >
                  {post.isPublished ? 'Update & Keep Published' : 'Publish Now'}
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Post Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Post Info</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Status:</span>{' '}
                  <span
                    className={`font-semibold ${
                      post.isPublished ? 'text-green-600' : 'text-yellow-600'
                    }`}
                  >
                    {post.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Author:</span>{' '}
                  <span className="font-semibold">
                    {post.author.name || post.author.email}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Created:</span>{' '}
                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-gray-600">Updated:</span>{' '}
                  <span>{new Date(post.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Publish Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Publish Settings</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="publishDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Publish Date
                  </label>
                  <input
                    type="datetime-local"
                    id="publishDate"
                    name="publishDate"
                    form="main-form"
                    defaultValue={defaultPublishDate}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Tags</h3>
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {allTags.map((tag) => (
                  <label key={tag.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="tags"
                      value={tag.id}
                      form="main-form"
                      defaultChecked={selectedTagIds.includes(tag.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">
                      {tag.nameEn} / {tag.nameJa}
                    </span>
                  </label>
                ))}
              </div>

              {/* Create Tag */}
              <details className="mt-4 border-t pt-4">
                <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-700">
                  + Create New Tag
                </summary>
                <form action={createTag} className="mt-4 space-y-3">
                  <input
                    type="text"
                    name="tagNameEn"
                    placeholder="Tag name (English)"
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    name="tagNameJa"
                    placeholder="タグ名（日本語）"
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    name="tagSlug"
                    placeholder="tag-slug"
                    required
                    pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 font-semibold"
                  >
                    Create Tag
                  </button>
                </form>
              </details>
            </div>

            {/* Markdown Guide */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-sm mb-2">Markdown Guide</h4>
              <ul className="text-xs text-gray-700 space-y-1">
                <li># Heading 1</li>
                <li>## Heading 2</li>
                <li>**bold** or __bold__</li>
                <li>*italic* or _italic_</li>
                <li>[Link](url)</li>
                <li>![Image](url)</li>
                <li>```code block```</li>
                <li>- List item</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
