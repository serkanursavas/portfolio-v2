'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Button from '../../../components/admin-ui/dashboard/button/button'
import Search from '../../../components/admin-ui/dashboard/search/search'
import Link from 'next/link'
import ContentWrapper from '../../../components/admin-ui/dashboard/content-wrapper/contentWrapper'
import Pagination from '../../../components/admin-ui/dashboard/pagination/pagination'
import { useAuth } from '../../../contexts/AuthContext'
// import { useSearchParams } from 'next/navigation' // Removed for SSR compatibility

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082'

function BlogPosts() {
  const [posts, setPosts] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const { authenticatedFetch } = useAuth()
  
  const q = searchQuery
  const page = 1 // Simplified pagination for now

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const response = await authenticatedFetch(`${API_BASE_URL}/api/v1/blog/admin/posts`, {
        cache: 'no-store'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch posts')
      }
      
      const data = await response.json()
      let posts = data.posts || []
      
      // Client-side filtering
      if (q) {
        const regex = new RegExp(q, 'i')
        posts = posts.filter(post => 
          regex.test(post.title) || 
          regex.test(post.content) ||
          regex.test(post.tags?.join(' ') || '')
        )
      }
      
      setCount(posts.length)
      setPosts(posts)
    } catch (error) {
      console.error('Failed to load posts:', error)
      setPosts([])
      setCount(0)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (postId) => {
    if (confirm('Are you sure you want to delete this blog post?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/blog/posts/${postId}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          // Remove from local state
          setPosts(posts.filter(p => p.id !== postId))
          setCount(count - 1)
        } else {
          console.error('Failed to delete post')
        }
      } catch (error) {
        console.error('Failed to delete post:', error)
      }
    }
  }


  useEffect(() => {
    fetchPosts()
  }, [q, page])

  if (loading) {
    return (
      <ContentWrapper>
        <div>Loading blog posts...</div>
      </ContentWrapper>
    )
  }

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'Invalid Date'
    }
  }

  return (
    <ContentWrapper>
      <div className="flex items-center justify-between">
        <Search placeholder="Search blog posts..." />
        <div className="flex space-x-2">
          <Link href="/admin/blog/import">
            <Button bgColor="bg-blue-600">Import MD File</Button>
          </Link>
        </div>
      </div>
      
      <table className="w-[100%] mt-2">
        <thead className="text-left">
          <tr>
            <th className="p-3">Title</th>
            <th className="p-3">Status</th>
            <th className="p-3">Tags</th>
            <th className="p-3">Views</th>
            <th className="p-3">Created</th>
            <th className="p-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {posts.map(post => {
            return (
              <tr key={post.id}>
                <td className="p-3">
                  <div>
                    <div className="font-medium">{post.title}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {post.excerpt || 'No excerpt'}
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <span
                    className={`p-[6px] text-sm rounded-[4px] ${
                      post.published 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {post.published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {(post.tags || []).slice(0, 2).map((tag, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {(post.tags || []).length > 2 && (
                      <span className="text-xs text-gray-500">
                        +{(post.tags || []).length - 2} more
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3">{post.view_count || post.views || 0}</td>
                <td className="p-3">{formatDate(post.published_at || post.created_at)}</td>
                <td className="p-3">
                  <div className="flex space-x-2">
                    <Link href={`/admin/blog/${post.slug || post.id}`}>
                      <Button bgColor="bg-green-700">Edit</Button>
                    </Link>
                    <button 
                      onClick={() => handleDelete(post.id)}
                      className="bg-rose-700 px-4 py-2 rounded text-white"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      
      {posts.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          {q ? `No posts found for "${q}"` : 'No blog posts found'}
        </div>
      )}
      
      <Pagination count={count} />
    </ContentWrapper>
  )
}

export default BlogPosts