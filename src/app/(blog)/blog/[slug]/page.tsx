'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { useLocale } from '@/contexts/LocaleContext';
import 'highlight.js/styles/github-dark.css';

interface BlogTag {
  id: string;
  nameEn: string;
  nameJa: string;
  slug: string;
}

interface BlogPost {
  id: string;
  slug: string;
  titleEn: string;
  titleJa: string;
  contentEn: string;
  contentJa: string;
  coverImage: string | null;
  publishDate: string | null;
  author: {
    name: string | null;
    email: string;
  };
  tags: {
    tag: BlogTag;
  }[];
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { locale, setLocale } = useLocale();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchPost() {
      try {
        const response = await fetch(`/api/blog/${slug}`);
        if (response.status === 404) {
          setNotFound(true);
          return;
        }
        const data = await response.json();
        setPost(data);
      } catch (error) {
        console.error('Failed to fetch blog post:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">{locale === 'en' ? 'Loading...' : '読み込み中...'}</p>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              LMS Platform
            </Link>
          </div>
        </nav>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold mb-4">
            {locale === 'en' ? '404 - Post Not Found' : '404 - 投稿が見つかりません'}
          </h1>
          <p className="text-gray-600 mb-8">
            {locale === 'en'
              ? 'The blog post you are looking for does not exist.'
              : 'お探しのブログ投稿は存在しません。'}
          </p>
          <Link href="/blog" className="text-blue-600 hover:text-blue-700 font-semibold">
            {locale === 'en' ? '← Back to Blog' : '← ブログに戻る'}
          </Link>
        </div>
      </div>
    );
  }

  const title = locale === 'en' ? post.titleEn : post.titleJa;
  const content = locale === 'en' ? post.contentEn : post.contentJa;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              LMS Platform
            </Link>
            <div className="flex gap-4 items-center">
              <Link href="/courses" className="text-gray-700 hover:text-blue-600">
                {locale === 'en' ? 'Courses' : 'コース'}
              </Link>
              <Link href="/blog" className="text-gray-700 hover:text-blue-600">
                {locale === 'en' ? 'Blog' : 'ブログ'}
              </Link>
              <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">
                {locale === 'en' ? 'Dashboard' : 'ダッシュボード'}
              </Link>

              {/* Language Toggle */}
              <div className="flex gap-2 border-l pl-4">
                <button
                  onClick={() => setLocale('en')}
                  className={`px-3 py-1 rounded ${
                    locale === 'en'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLocale('ja')}
                  className={`px-3 py-1 rounded ${
                    locale === 'ja'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  JA
                </button>
              </div>

              {/* User Button */}
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </nav>

      {/* Article */}
      <article className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-8">
            <Link href="/blog" className="text-blue-600 hover:text-blue-700 text-sm">
              {locale === 'en' ? '← Back to Blog' : '← ブログに戻る'}
            </Link>
          </div>

          {/* Cover Image */}
          {post.coverImage && (
            <div className="mb-8 rounded-lg overflow-hidden">
              <img
                src={post.coverImage}
                alt={title}
                className="w-full h-auto object-cover max-h-96"
              />
            </div>
          )}

          {/* Header */}
          <header className="mb-8">
            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex gap-2 mb-4 flex-wrap">
                {post.tags.map((pt) => (
                  <span
                    key={pt.tag.id}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
                  >
                    {locale === 'en' ? pt.tag.nameEn : pt.tag.nameJa}
                  </span>
                ))}
              </div>
            )}

            <h1 className="text-4xl md:text-5xl font-bold mb-4">{title}</h1>

            <div className="flex items-center gap-4 text-gray-600">
              <span>{post.author.name || post.author.email}</span>
              <span>•</span>
              {post.publishDate && (
                <time dateTime={post.publishDate}>
                  {new Date(post.publishDate).toLocaleDateString(
                    locale === 'en' ? 'en-US' : 'ja-JP',
                    {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }
                  )}
                </time>
              )}
            </div>
          </header>

          {/* Content */}
          <div className="bg-white rounded-lg shadow p-8 md:p-12">
            <div className="prose prose-lg max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight, rehypeRaw]}
                components={{
                  h1: ({ node, ...props }) => (
                    <h1 className="text-3xl font-bold mb-4 mt-8" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="text-2xl font-bold mb-3 mt-6" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-xl font-bold mb-2 mt-4" {...props} />
                  ),
                  p: ({ node, ...props }) => <p className="mb-4 leading-relaxed" {...props} />,
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc list-inside mb-4 space-y-2" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />
                  ),
                  li: ({ node, ...props }) => <li className="ml-4" {...props} />,
                  a: ({ node, ...props }) => (
                    <a
                      className="text-blue-600 hover:text-blue-700 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    />
                  ),
                  img: ({ node, ...props }) => (
                    <img className="rounded-lg my-6 max-w-full h-auto" {...props} />
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote
                      className="border-l-4 border-blue-500 pl-4 italic my-4 text-gray-700"
                      {...props}
                    />
                  ),
                  code: ({ node, className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '');
                    return match ? (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    ) : (
                      <code
                        className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  pre: ({ node, ...props }) => (
                    <pre className="bg-gray-900 rounded-lg p-4 overflow-x-auto my-6" {...props} />
                  ),
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto my-6">
                      <table className="min-w-full divide-y divide-gray-200" {...props} />
                    </div>
                  ),
                  th: ({ node, ...props }) => (
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" {...props} />
                  ),
                  td: ({ node, ...props }) => (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" {...props} />
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t">
            <Link
              href="/blog"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
            >
              {locale === 'en' ? '← Back to all posts' : '← すべての投稿に戻る'}
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
