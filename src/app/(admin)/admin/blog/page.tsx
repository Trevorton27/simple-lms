import { redirect } from 'next/navigation';
import Link from 'next/link';
import { currentUser } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
import { db } from '@/lib/db';

export default async function AdminBlogPage() {
  const clerkUser = await currentUser();

  console.log('clerkUser:', clerkUser);

  if (!clerkUser) {
    redirect('/sign-in');
  }

  // Get user with roles
  const user = await db.user.findUnique({
    where: { id: clerkUser.id },
    include: {
      roles: {
        include: { role: true },
      },
    },
  });

  console.log('user:', user);

  if (!user) {
    redirect('/dashboard');
  }

  // Check if user has admin or instructor role
  const hasAccess = user.roles.some(
    (ur) => ur.role.name === 'ADMIN' || ur.role.name === 'INSTRUCTOR'
  );

  if (!hasAccess) {
    redirect('/dashboard');
  }

  const isAdmin = user.roles.some((ur) => ur.role.name === 'ADMIN');

  // Fetch blog posts
  const posts = await db.blogPost.findMany({
    where: isAdmin ? {} : { authorId: user.id },
    include: {
      author: true,
      tags: {
        include: {
          tag: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  async function deletePost(formData: FormData) {
    'use server';

    const postId = formData.get('postId') as string;
    const clerkUser = await currentUser();

    if (!clerkUser) {
      throw new Error('Unauthorized');
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
      throw new Error('User not found');
    }

    const isAdmin = user.roles.some((ur) => ur.role.name === 'ADMIN');
    const post = await db.blogPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    if (!isAdmin && post.authorId !== user.id) {
      throw new Error('Forbidden');
    }

    await db.blogPost.delete({
      where: { id: postId },
    });

    redirect('/admin/blog');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              LMS Platform - Blog Management
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Blog Posts</h1>
            <p className="text-gray-600">Manage your blog content</p>
          </div>
          <Link
            href="/admin/blog/new"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
          >
            + New Post
          </Link>
        </div>

        {/* Blog Posts Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {posts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="mb-4">No blog posts yet.</p>
              <Link
                href="/admin/blog/new"
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                Create your first post
              </Link>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Author
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Published Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {posts.map((post) => (
                  <tr key={post.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {post.titleEn}
                      </div>
                      <div className="text-sm text-gray-500">{post.titleJa}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {post.author.name || post.author.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          post.isPublished
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {post.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {post.publishDate
                        ? new Date(post.publishDate).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {post.tags.map((pt) => (
                          <span
                            key={pt.tagId}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                          >
                            {pt.tag.nameEn}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <Link
                          href={`/blog/${post.slug}`}
                          className="text-green-600 hover:text-green-900"
                          target="_blank"
                        >
                          View
                        </Link>
                        <Link
                          href={`/admin/blog/${post.id}/edit`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </Link>
                        <form action={deletePost}>
                          <input type="hidden" name="postId" value={post.id} />
                          <button
                            type="submit"
                            className="text-red-600 hover:text-red-900"
                            onClick={(e) => {
                              if (
                                !confirm(
                                  'Are you sure you want to delete this post?'
                                )
                              ) {
                                e.preventDefault();
                              }
                            }}
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
