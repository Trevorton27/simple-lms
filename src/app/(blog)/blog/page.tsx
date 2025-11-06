'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { useLocale } from '@/contexts/LocaleContext';

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
  excerptEn: string | null;
  excerptJa: string | null;
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

export default function BlogListPage() {
  const { locale, setLocale } = useLocale();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/blog');
        const data = await response.json();
        setPosts(data.posts);
        setTags(data.tags);
      } catch (error) {
        console.error('Failed to fetch blog posts:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredPosts = selectedTag
    ? posts.filter((post) => post.tags.some((pt) => pt.tag.id === selectedTag))
    : posts;

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
              <Link href="/blog" className="text-gray-700 hover:text-blue-600 font-semibold">
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

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            {locale === 'en' ? 'Blog' : 'ブログ'}
          </h1>
          <p className="text-gray-600">
            {locale === 'en'
              ? 'Learn from our latest articles and insights'
              : '最新の記事と洞察から学ぶ'}
          </p>
        </div>

        {/* Tags Filter */}
        {tags.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-4 py-2 rounded-lg font-semibold ${
                  selectedTag === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {locale === 'en' ? 'All Posts' : 'すべての投稿'}
              </button>
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setSelectedTag(tag.id)}
                  className={`px-4 py-2 rounded-lg font-semibold ${
                    selectedTag === tag.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {locale === 'en' ? tag.nameEn : tag.nameJa}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Blog Posts Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {locale === 'en' ? 'Loading...' : '読み込み中...'}
            </p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {locale === 'en' ? 'No blog posts found.' : 'ブログ投稿が見つかりません。'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => {
              const title = locale === 'en' ? post.titleEn : post.titleJa;
              const excerpt = locale === 'en' ? post.excerptEn : post.excerptJa;

              return (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
                >
                  {post.coverImage && (
                    <div className="aspect-video w-full overflow-hidden">
                      <img
                        src={post.coverImage}
                        alt={title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    {/* Tags */}
                    {post.tags.length > 0 && (
                      <div className="flex gap-2 mb-3 flex-wrap">
                        {post.tags.map((pt) => (
                          <span
                            key={pt.tag.id}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                          >
                            {locale === 'en' ? pt.tag.nameEn : pt.tag.nameJa}
                          </span>
                        ))}
                      </div>
                    )}

                    <h2 className="text-xl font-bold mb-2 line-clamp-2">{title}</h2>

                    {excerpt && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">{excerpt}</p>
                    )}

                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>{post.author.name || post.author.email}</span>
                      {post.publishDate && (
                        <span>{new Date(post.publishDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
