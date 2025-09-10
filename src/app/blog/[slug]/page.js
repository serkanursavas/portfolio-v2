import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Clock, Tag, ArrowLeft, Eye } from 'lucide-react'
import AnimatedPage from '@/components/UI/AnimatedPage'
import { getBlogPostBySlug, getBlogPosts } from '@/lib/api'
import { notFound } from 'next/navigation'
import BlogContent from '@/components/Blog/BlogContent'

export async function generateStaticParams() {
  try {
    const { posts } = await getBlogPosts()
    if (!posts || !Array.isArray(posts)) {
      return []
    }
    return posts.map((post) => ({
      slug: post.slug,
    }))
  } catch (error) {
    console.error('Failed to generate static params:', error)
    return []
  }
}

export async function generateMetadata({ params }) {
  try {
    const { slug } = await params
    const post = await getBlogPostBySlug(slug)
    
    if (!post) {
      return {
        title: 'Post Not Found',
      }
    }

    return {
      title: post.title,
      description: post.excerpt,
    }
  } catch (error) {
    return {
      title: 'Error Loading Post',
    }
  }
}

export default async function BlogPostPage({ params }) {
  let post
  
  try {
    const { slug } = await params
    post = await getBlogPostBySlug(slug)

    if (!post) {
      notFound()
    }
  } catch (error) {
    console.error('Failed to fetch blog post:', error)
    notFound()
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }


  return (
    <AnimatedPage>
      <article className="py-8">
        {/* Navigation */}
        <div className="mb-8">
          <Link 
            href="/blog"
            className="inline-flex items-center gap-2 text-primary hover:text-white font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>
        </div>

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-[32px] md:text-[36px] font-medium text-white mb-4">
            {post?.title || 'Loading...'}
          </h1>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-grey mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{post?.published_at ? formatDate(post.published_at) : 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{post?.reading_time || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span>{post?.view_count || 0} views</span>
            </div>
          </div>

          {post?.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {post.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 border border-grey text-grey text-xs"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Featured Image */}
        {post?.featured_image && (
          <div className="mb-8 relative group">
            <div className="relative overflow-hidden border border-grey bg-gradient-to-br from-background to-background/50 h-80 md:h-96 lg:h-[500px]">
              <Image
                src={post.featured_image}
                alt={post?.title || 'Blog post image'}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1200px"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            {/* Image caption/overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <p className="text-white text-sm font-medium">{post?.title}</p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="border border-grey p-6 mb-8">
          <BlogContent content={post.content} />
        </div>

        {/* Footer */}
        <footer className="pt-6 border-t border-grey">
          <div className="flex items-center justify-between">
            <div className="text-sm text-grey">
              Written by <span className="text-primary">{post?.author || 'Unknown'}</span>
            </div>
            <div className="flex gap-4">
              <button className="text-grey hover:text-primary transition-colors">
                Share
              </button>
            </div>
          </div>
        </footer>
      </article>
    </AnimatedPage>
  )
}