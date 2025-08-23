'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Calendar, Clock, Tag } from 'lucide-react'
import LoadingSpinner from './UI/LoadingSpinner'

export default function BlogList({ initialPosts, allTags }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState('')

  const filteredPosts = useMemo(() => {
    let filtered = initialPosts

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        post =>
          post.title?.toLowerCase().includes(query) ||
          post.excerpt?.toLowerCase().includes(query) ||
          post.content?.toLowerCase().includes(query) ||
          (post.tags && post.tags.some(tag => tag.toLowerCase().includes(query)))
      )
    }

    if (selectedTag) {
      filtered = filtered.filter(post => post.tags && post.tags.includes(selectedTag))
    }

    return filtered
  }, [initialPosts, searchQuery, selectedTag])

  const handleTagClick = tag => {
    setSelectedTag(selectedTag === tag ? '' : tag)
  }

  // V1 yaklaşımı: Eğer data yoksa loading göster
  if (!initialPosts || initialPosts.length === 0) {
    return <LoadingSpinner height="h-[500px]" />
  }

  return (
    <div className="space-y-8 mt-16">
      {/* Search and Filter */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-grey w-5 h-5" />
          <input
            type="text"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-background border border-grey text-white placeholder-grey rounded-none focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Tags Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTag('')}
            className={`px-3 py-1 border text-sm transition-colors ${
              !selectedTag ? 'border-primary text-primary' : 'border-grey text-grey hover:border-primary hover:text-primary'
            }`}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className={`px-3 py-1 border text-sm transition-colors ${
                selectedTag === tag ? 'border-primary text-primary' : 'border-grey text-grey hover:border-primary hover:text-primary'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Posts Grid */}
      <div className="grid gap-6 md:gap-8">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-grey text-lg">No articles found matching your criteria.</p>
          </div>
        ) : (
          filteredPosts.map(post => (
            <article
              key={post.id}
              className="border border-grey hover:border-primary transition-colors group"
            >
              <div className="md:flex md:min-h-[250px]">
                {/* Featured Image */}
                <div className="md:w-80 lg:w-96 flex-shrink-0">
                  <Link href={`/blog/${post.slug}`}>
                    <div className="relative overflow-hidden group h-48 md:h-full">
                      <img
                        src={post.featured_image || `http://localhost:8082/blog-upload/blog-${post.slug}.png`}
                        alt={post.title}
                        className="w-full h-full object-cover hover:opacity-80 transition-all duration-300 group-hover:scale-105"
                        onError={(e) => {
                          e.target.src = '/next.png'
                        }}
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                  </Link>
                </div>
                
                {/* Content */}
                <div className="flex-1 p-6 space-y-4">
                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-grey">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'No date'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{post.reading_time || 'N/A'}</span>
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-xl md:text-2xl font-medium text-white group-hover:text-primary transition-colors">
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </h2>

                {/* Excerpt */}
                <p className="text-grey leading-relaxed">{post.excerpt}</p>

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag className="w-4 h-4 text-grey" />
                    {post.tags.map(tag => (
                      <span
                        key={tag}
                        onClick={() => handleTagClick(tag)}
                        className="text-sm text-grey hover:text-primary cursor-pointer transition-colors"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Read More Link */}
                <div className="pt-2">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-primary hover:text-white transition-colors text-sm font-medium"
                  >
                    Read article →
                  </Link>
                </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Results Count */}
      <div className="text-center text-grey text-sm">
        Showing {filteredPosts.length} of {initialPosts.length} articles
      </div>
    </div>
  )
}
