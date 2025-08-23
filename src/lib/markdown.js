import { marked } from 'marked'

// Configure marked for better markdown parsing
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false
})

export function parseMarkdown(content) {
  if (!content) return ''
  
  try {
    return marked(content)
  } catch (error) {
    console.error('Markdown parsing error:', error)
    return content
  }
}