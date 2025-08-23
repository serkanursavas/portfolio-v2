'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import matter from 'gray-matter'
import { MdVisibility, MdCode, MdCheck, MdError, MdWarning } from 'react-icons/md'

const MDPreview = ({ content, filename = '' }) => {
  const [mode, setMode] = useState('preview') // 'preview' | 'raw' | 'frontmatter'
  const [parsedData, setParsedData] = useState(null)
  const [validationErrors, setValidationErrors] = useState([])

  useEffect(() => {
    if (!content) {
      setParsedData(null)
      setValidationErrors([])
      return
    }

    try {
      const parsed = matter(content)
      setParsedData(parsed)
      
      // Validate frontmatter
      const errors = validateFrontmatter(parsed.data)
      setValidationErrors(errors)
      
    } catch (error) {
      setValidationErrors([`Failed to parse content: ${error.message}`])
      setParsedData(null)
    }
  }, [content])

  const validateFrontmatter = (frontmatter) => {
    const errors = []
    const warnings = []

    // Required fields
    if (!frontmatter.title) {
      errors.push('Title is required')
    }

    // Optional but recommended fields
    if (!frontmatter.excerpt) {
      warnings.push('Excerpt is recommended for better SEO')
    }
    if (!frontmatter.tags || !Array.isArray(frontmatter.tags)) {
      warnings.push('Tags array is recommended')
    }
    if (!frontmatter.author) {
      warnings.push('Author will default to "Serkan Ursavaş"')
    }

    // Date validation
    if (frontmatter.publishedAt) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(frontmatter.publishedAt)) {
        errors.push('publishedAt should be in YYYY-MM-DD format')
      }
    }

    // Slug validation
    if (frontmatter.slug) {
      const slugRegex = /^[a-z0-9\-]+$/
      if (!slugRegex.test(frontmatter.slug)) {
        errors.push('Slug should contain only lowercase letters, numbers, and hyphens')
      }
    }

    return [...errors.map(e => ({ type: 'error', message: e })), 
            ...warnings.map(w => ({ type: 'warning', message: w }))]
  }

  const getValidationIcon = (type) => {
    switch (type) {
      case 'error':
        return <MdError className="text-red-500" />
      case 'warning':
        return <MdWarning className="text-yellow-500" />
      default:
        return <MdCheck className="text-green-500" />
    }
  }

  const formatFrontmatterValue = (key, value) => {
    if (Array.isArray(value)) {
      return `[${value.map(v => `"${v}"`).join(', ')}]`
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false'
    }
    if (typeof value === 'string') {
      return `"${value}"`
    }
    return String(value)
  }

  if (!content) {
    return (
      <div className="p-8 text-center border border-grey/20 rounded-md">
        <MdVisibility className="mx-auto text-4xl text-grey mb-4" />
        <p className="text-grey">Select a file to preview</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-medium">
          Preview: {filename || 'MD Content'}
        </h3>
        
        {/* Mode Selector */}
        <div className="flex space-x-2">
          <button
            onClick={() => setMode('preview')}
            className={`px-3 py-1 text-xs rounded ${
              mode === 'preview' 
                ? 'bg-primary text-white' 
                : 'bg-grey/20 text-grey hover:text-white'
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => setMode('frontmatter')}
            className={`px-3 py-1 text-xs rounded ${
              mode === 'frontmatter' 
                ? 'bg-primary text-white' 
                : 'bg-grey/20 text-grey hover:text-white'
            }`}
          >
            Metadata
          </button>
          <button
            onClick={() => setMode('raw')}
            className={`px-3 py-1 text-xs rounded ${
              mode === 'raw' 
                ? 'bg-primary text-white' 
                : 'bg-grey/20 text-grey hover:text-white'
            }`}
          >
            Raw
          </button>
        </div>
      </div>

      {/* Validation Status */}
      {validationErrors.length > 0 && (
        <div className="p-3 bg-bgSoft rounded-md border border-grey/20">
          <h4 className="text-white text-sm font-medium mb-2">Validation</h4>
          <div className="space-y-1">
            {validationErrors.map((error, index) => (
              <div key={index} className="flex items-center space-x-2 text-xs">
                {getValidationIcon(error.type)}
                <span className={error.type === 'error' ? 'text-red-400' : 'text-yellow-400'}>
                  {error.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Display */}
      <div className="border border-grey/20 rounded-md overflow-hidden">
        {mode === 'preview' && parsedData && (
          <div className="p-4 bg-white text-black prose prose-sm max-w-none">
            <ReactMarkdown>{parsedData.content}</ReactMarkdown>
          </div>
        )}

        {mode === 'frontmatter' && parsedData && (
          <div className="p-4 bg-bgSoft">
            <h4 className="text-white font-medium mb-3">Frontmatter Data</h4>
            <div className="space-y-2">
              {Object.entries(parsedData.data).map(([key, value]) => (
                <div key={key} className="flex">
                  <span className="text-primary w-32 text-sm font-mono">
                    {key}:
                  </span>
                  <span className="text-white text-sm font-mono">
                    {formatFrontmatterValue(key, value)}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Auto-generated fields preview */}
            <div className="mt-4 pt-3 border-t border-grey/20">
              <h5 className="text-grey text-xs mb-2">Auto-generated fields</h5>
              <div className="space-y-1 text-xs">
                {!parsedData.data.slug && (
                  <div className="flex">
                    <span className="text-primary w-32 font-mono">slug:</span>
                    <span className="text-grey font-mono">
                      (generated from title)
                    </span>
                  </div>
                )}
                {!parsedData.data.excerpt && (
                  <div className="flex">
                    <span className="text-primary w-32 font-mono">excerpt:</span>
                    <span className="text-grey font-mono">
                      (generated from content)
                    </span>
                  </div>
                )}
                {!parsedData.data.readingTime && (
                  <div className="flex">
                    <span className="text-primary w-32 font-mono">readingTime:</span>
                    <span className="text-grey font-mono">
                      (calculated from word count)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {mode === 'raw' && (
          <div className="p-4 bg-bgSoft">
            <pre className="text-grey text-sm font-mono whitespace-pre-wrap overflow-x-auto">
              {content}
            </pre>
          </div>
        )}
      </div>

      {/* Stats */}
      {parsedData && (
        <div className="flex justify-between text-xs text-grey">
          <span>
            Words: {parsedData.content.split(/\s+/).length}
          </span>
          <span>
            Characters: {parsedData.content.length}
          </span>
          <span>
            Reading time: ~{Math.ceil(parsedData.content.split(/\s+/).length / 200)} min
          </span>
        </div>
      )}
    </div>
  )
}

export default MDPreview