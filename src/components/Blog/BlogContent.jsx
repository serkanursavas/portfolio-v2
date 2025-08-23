'use client'

import { useEffect } from 'react'
import { parseMarkdown } from '@/lib/markdown'

// Dynamically import Prism to avoid SSR issues
const loadPrism = async () => {
  if (typeof window !== 'undefined') {
    const Prism = (await import('prismjs')).default
    await import('prismjs/themes/prism-tomorrow.css')
    await import('prismjs/components/prism-javascript')
    await import('prismjs/components/prism-typescript')
    await import('prismjs/components/prism-jsx')
    await import('prismjs/components/prism-tsx')
    await import('prismjs/components/prism-css')
    await import('prismjs/components/prism-scss')
    await import('prismjs/components/prism-json')
    await import('prismjs/components/prism-bash')
    await import('prismjs/components/prism-python')
    await import('prismjs/components/prism-go')
    await import('prismjs/components/prism-sql')
    
    return Prism
  }
  return null
}

export default function BlogContent({ content }) {
  useEffect(() => {
    const highlightCode = async () => {
      const Prism = await loadPrism()
      if (Prism) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          Prism.highlightAll()
        }, 100)
      }
    }
    
    highlightCode()
  }, [content])

  return (
    <div 
      className="max-w-none prose prose-invert prose-sm prose-headings:text-primary prose-strong:text-primary prose-code:text-primary prose-code:bg-background prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-background prose-pre:border prose-pre:border-grey"
      dangerouslySetInnerHTML={{ 
        __html: parseMarkdown(content || '')
      }}
    />
  )
}