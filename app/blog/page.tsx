import Link from 'next/link';
import { Metadata } from 'next';
import { getAllPosts } from '@/lib/blog-data';

export const metadata: Metadata = {
  title: 'Recovery & Wellness Blog | Grateful Today',
  description: 'Inspiring stories, practical advice, and powerful resources for your journey of recovery and personal growth. Read articles on sobriety, addiction recovery, and mental wellness.',
  keywords: 'recovery blog, sobriety stories, addiction recovery, mental wellness, grateful today, recovery resources',
};

export default function Blog() {
  const posts = getAllPosts();
  return (
    <div className="min-h-screen bg-gradient-to-b from-sage-50 to-soft-sand-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-sage-800 mb-4">
              Recovery & Wellness Blog
            </h1>
            <p className="text-xl text-sage-600 max-w-2xl mx-auto">
              Inspiring stories, practical advice, and powerful resources for your journey of recovery and personal growth.
            </p>
          </div>

          {/* Blog Posts Grid */}
          <div className="grid gap-8 md:gap-12">
            {posts.map((post) => (
              <article key={post.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <div className="p-8">
                  {/* Post Meta */}
                  <div className="flex items-center gap-4 text-sm text-sage-500 mb-4">
                    <time dateTime={post.date}>
                      {new Date(post.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </time>
                    <span>•</span>
                    <span className="capitalize">{post.categories}</span>
                    <span>•</span>
                    <span>By {post.author}</span>
                  </div>

                  {/* Post Title */}
                  <h2 className="text-2xl md:text-3xl font-heading font-bold text-sage-800 mb-4 hover:text-sage-600 transition-colors">
                    <Link href={`/blog/${post.slug}`}>
                      {post.title}
                    </Link>
                  </h2>

                  {/* Post Excerpt */}
                  <p className="text-sage-600 leading-relaxed mb-6">
                    {post.excerpt}
                  </p>

                  {/* Video Badge if present */}
                  {post.videoId && (
                    <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-3 py-1 rounded-full text-sm font-medium mb-4">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                      Video Content
                    </div>
                  )}

                  {/* Read More Link */}
                  <Link 
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-2 text-sage-600 hover:text-sage-800 font-medium transition-colors"
                  >
                    Read Full Article
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {/* Call to Action */}
          <div className="text-center mt-16">
            <div className="bg-sage-100 rounded-lg p-8">
              <h3 className="text-2xl font-heading font-bold text-sage-800 mb-4">
                Join Our Recovery Community
              </h3>
              <p className="text-sage-600 mb-6 max-w-2xl mx-auto">
                Connect with others on their journey of recovery and wellness. Share your story, find support, and celebrate milestones together.
              </p>
              <Link 
                href="/gratefultoday/contact"
                className="inline-flex items-center gap-2 bg-sage-600 text-white px-8 py-3 rounded-lg hover:bg-sage-700 transition-colors font-medium"
              >
                Get In Touch
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}