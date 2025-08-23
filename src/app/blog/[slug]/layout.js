import { getBlogPostBySlug } from '@/lib/api'
import { notFound } from 'next/navigation'

export async function generateMetadata({ params }) {
  try {
    const { slug } = await params
    const post = await getBlogPostBySlug(slug)
  
    if (!post) {
      return {
        title: 'Post Not Found',
        description: 'The requested blog post could not be found.',
      }
    }

    return {
      title: `${post.title} | Serkan Ursavaş`,
      description: post.excerpt,
      keywords: post.tags,
      authors: [{ name: post.author }],
      publishedTime: post.published_at,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.published_at,
      authors: [post.author],
      tags: post.tags,
      locale: 'en_US',
      siteName: 'Serkan Ursavaş Portfolio',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
    },
    robots: {
      index: true,
      follow: true,
    },
    other: {
      'article:author': post.author,
      'article:published_time': post.published_at,
      'article:tag': post.tags?.join(', ') || '',
    },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Error Loading Post',
      description: 'An error occurred while loading the blog post.',
    }
  }
}

export default function BlogPostLayout({ children }) {
  return children
}