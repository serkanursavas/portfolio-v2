import AnimatedPage from '@/components/UI/AnimatedPage'
import PageTitle from '@/components/PageTitle'
import BlogList from '@/components/BlogList'
import { getBlogPosts, getBlogTags } from '@/lib/api'

export default async function BlogPage() {
  // Fetch blog data from API
  const blogData = await getBlogPosts()
  const blogPosts = blogData?.posts || []
  const total = blogData?.total || 0
  
  // Extract unique tags from actual blog posts
  const usedTags = new Set()
  blogPosts.forEach(post => {
    if (post.tags && Array.isArray(post.tags)) {
      post.tags.forEach(tag => usedTags.add(tag))
    }
  })
  const allTags = Array.from(usedTags).sort()

  return (
    <AnimatedPage>
      <PageTitle
        title="blog"
        subtitle="Thoughts on technology, development, and learning"
      />
      <BlogList
        initialPosts={blogPosts}
        allTags={allTags}
      />
    </AnimatedPage>
  )
}
