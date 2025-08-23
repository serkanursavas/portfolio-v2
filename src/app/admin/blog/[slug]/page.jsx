'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import ContentWrapper from '../../../../components/admin-ui/dashboard/content-wrapper/contentWrapper'
import Input from '../../../../components/admin-ui/dashboard/input/input'
import BlogImageUpload from '../../../../components/admin-ui/dashboard/blog-image-upload/BlogImageUpload'
import { MdFileDownload } from 'react-icons/md'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082'

function EditBlogPost() {
  const params = useParams()
  const slug = params?.slug
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    tags: '',
    published: false,
    featured_image: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [postId, setPostId] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (slug) {
      fetchPost()
    }
  }, [slug])

  const fetchPost = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/v1/blog/posts/${slug}`, {
        cache: 'no-store'
      })
      
      if (!response.ok) {
        throw new Error('Post not found')
      }
      
      const data = await response.json()
      const post = data.post
      
      setPostId(post.id)
      
      setFormData({
        title: post.title || '',
        content: post.content || '',
        excerpt: post.excerpt || '',
        tags: (post.tags || []).join(', '),
        published: post.published || false,
        featured_image: post.featured_image || ''
      })
      
    } catch (error) {
      console.error('Failed to load post:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleImageChange = (imageUrl) => {
    setFormData(prev => ({
      ...prev,
      featured_image: imageUrl
    }))
  }

  const handleUploadSuccess = (result) => {
    console.log('Blog image upload success:', result)
  }

  const handleUploadError = (error) => {
    console.error('Blog image upload error:', error)
    setError(error)
  }

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      // Generate slug from title
      const newSlug = generateSlug(formData.title)
      
      // Parse tags
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      const postData = {
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt,
        slug: newSlug,
        tags: tagsArray,
        published: formData.published,
        featured_image: formData.featured_image,
        reading_time: Math.ceil(formData.content.split(' ').length / 200) // ~200 words per minute
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/blog/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update post')
      }

      const result = await response.json()
      console.log('Post updated:', result)
      
      // Redirect to blog list
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/blog'
      }
      
    } catch (error) {
      console.error('Failed to update post:', error)
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this blog post?')) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/blog/posts/${postId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        if (typeof window !== 'undefined') {
          window.location.href = '/admin/blog'
        }
      } else {
        setError('Failed to delete post')
      }
    } catch (error) {
      console.error('Failed to delete post:', error)
      setError('Failed to delete post')
    }
  }

  const handleExportMD = async () => {
    try {
      setExporting(true)
      const response = await fetch(`${API_BASE_URL}/api/v1/blog/export-md/${slug}`)
      
      if (!response.ok) {
        throw new Error('Failed to export post')
      }

      // Get the filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `${slug}.md`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      // Download the file
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

    } catch (error) {
      console.error('Failed to export post:', error)
      setError('Failed to export post as MD')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <ContentWrapper>
        <div>Loading blog post...</div>
      </ContentWrapper>
    )
  }

  if (error && !formData.title) {
    return (
      <ContentWrapper>
        <div className="text-red-600">Error: {error}</div>
      </ContentWrapper>
    )
  }

  return (
    <ContentWrapper>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Edit Blog Post</h1>
          <div className="flex space-x-2">
            <button
              onClick={handleExportMD}
              disabled={exporting}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <MdFileDownload />
              <span>{exporting ? 'Exporting...' : 'Export MD'}</span>
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Delete Post
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-textSoft mb-2">
              Title *
            </label>
            <Input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter blog post title"
              required
            />
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-medium text-textSoft mb-2">
              Excerpt
            </label>
            <textarea
              name="excerpt"
              value={formData.excerpt}
              onChange={handleInputChange}
              placeholder="Brief description of the post"
              rows="3"
              className="w-full p-3 bg-bgPrimary outline-none text-white border-2 border-[#2e374a] rounded-md"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-textSoft mb-2">
              Content * (Markdown supported)
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              placeholder="Write your blog post content in Markdown..."
              rows="15"
              className="w-full p-3 bg-bgPrimary outline-none text-white border-2 border-[#2e374a] rounded-md font-mono text-sm"
              required
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-textSoft mb-2">
              Tags (comma separated)
            </label>
            <Input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              placeholder="react, nextjs, programming"
            />
          </div>

          {/* Published Status */}
          <div>
            <label className="block text-sm font-medium text-textSoft mb-2">
              Publication Status
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="published"
                checked={formData.published}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  published: e.target.checked
                }))}
                className="w-4 h-4 text-teal-600 bg-bgPrimary border-gray-300 rounded focus:ring-teal-500"
              />
              <span className="text-white">
                {formData.published ? 'Published' : 'Draft'}
              </span>
            </div>
          </div>

          {/* Featured Image Upload */}
          <div>
            <label className="block text-sm font-medium text-textSoft mb-2">
              Featured Image
            </label>
            <BlogImageUpload 
              currentImage={formData.featured_image}
              onImageChange={handleImageChange}
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
              blogSlug={slug}
            />
          </div>


          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 bg-teal-700 text-white border-none rounded-md cursor-pointer p-4 ${
                saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-teal-800'
              }`}
            >
              {saving ? 'Saving...' : 'Update Blog Post'}
            </button>
            
            <button
              type="button"
              onClick={() => window.location.href = '/admin/blog'}
              className="px-6 py-4 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </ContentWrapper>
  )
}

export default EditBlogPost