'use client'

import { useState } from 'react'
import ContentWrapper from '../../../../components/admin-ui/dashboard/content-wrapper/contentWrapper'
import MDFileUpload from '../../../../components/admin-ui/dashboard/md-upload/MDFileUpload-simple'
import MDPreview from '../../../../components/admin-ui/dashboard/md-upload/MDPreview'
import { MdUpload, MdFileDownload, MdRefresh } from 'react-icons/md'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082'

function BlogImport() {
  const [uploadResults, setUploadResults] = useState(null)
  const [error, setError] = useState('')

  const handleUploadSuccess = (results) => {
    setUploadResults(results)
    setError('')
  }

  const handleUploadError = (errorMessage) => {
    setError(errorMessage)
    setUploadResults(null)
  }

  const downloadTemplate = async () => {
    try {
      // Complete MD template with all sections
      const template = `---
title: "Your Blog Post Title"
excerpt: "Brief description of your blog post for SEO and previews"
author: "Serkan Ursavaş"
publishedAt: "${new Date().toISOString().split('T')[0]}"
tags: ["javascript", "react", "tutorial"]
readingTime: "5 min read"
viewCount: 0
featured: false
slug: "your-blog-post-slug"
---

# Your Blog Post Title

Write your blog post content here using Markdown syntax.

## Introduction

Start with an engaging introduction that hooks your readers and clearly states what they'll learn from this post.

## Section 1: Main Topic

Explain your main points with clear examples and code snippets.

### Subsection Example

Use subsections to break down complex topics:

- **Point 1**: Explanation here
- **Point 2**: More details
- **Point 3**: Additional information

### Code Examples

Include code snippets to illustrate your points:

\`\`\`javascript
// Example JavaScript code
const blogPost = {
  title: "Your Blog Post Title",
  content: "Amazing content here",
  published: true
};

function publishPost(post) {
  console.log(\`Publishing: \${post.title}\`);
  return { ...post, publishedAt: new Date() };
}
\`\`\`

### Images and Media

Add images to enhance your content:

![Example Image](https://via.placeholder.com/600x300?text=Your+Image+Here)

> **Tip**: Use descriptive alt text for accessibility and SEO.

## Section 2: Advanced Topics

Dive deeper into more complex concepts:

1. **First advanced concept**
   - Detailed explanation
   - Use cases and examples

2. **Second advanced concept**
   - Implementation details
   - Best practices

### Interactive Elements

You can include:

- Links to external resources: [MDN Web Docs](https://developer.mozilla.org/)
- **Bold text** for emphasis
- *Italic text* for subtle emphasis
- \`Inline code\` for technical terms

### Blockquotes

Use blockquotes for important notes or quotes:

> "The best way to learn programming is by writing code and solving real problems." - Every developer ever

## Best Practices

Share actionable tips:

- ✅ **Do**: Follow established conventions
- ✅ **Do**: Write readable, maintainable code
- ❌ **Don't**: Rush through without understanding
- ❌ **Don't**: Skip testing your examples

## Common Pitfalls

Help readers avoid mistakes:

### Mistake 1: Not Planning

Explain what goes wrong and how to fix it.

### Mistake 2: Overcomplicating

Show simpler approaches when possible.

## Real-World Example

Provide a complete, practical example:

\`\`\`javascript
// Complete example that readers can copy and use
class BlogManager {
  constructor() {
    this.posts = [];
  }

  addPost(post) {
    const processedPost = {
      ...post,
      id: Date.now(),
      createdAt: new Date(),
      slug: this.generateSlug(post.title)
    };
    
    this.posts.push(processedPost);
    return processedPost;
  }

  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\\s-]/g, '')
      .replace(/\\s+/g, '-')
      .trim();
  }
}

// Usage
const blogManager = new BlogManager();
const newPost = blogManager.addPost({
  title: "Your Blog Post Title",
  content: "Amazing content here"
});

console.log(newPost);
\`\`\`

## Performance Considerations

Discuss optimization tips when relevant:

- Memory usage
- Loading times
- Best practices for production

## Tools and Resources

Recommend helpful tools:

- **Development**: VS Code, WebStorm
- **Testing**: Jest, Cypress
- **Documentation**: JSDoc, Storybook

## Conclusion

Summarize the key takeaways:

1. **Main lesson learned**
2. **Practical application**
3. **Next steps for readers**

Remember to:
- Keep your content focused and actionable
- Use clear examples and explanations
- Test all code snippets before publishing
- Include relevant links and resources

---

## Further Reading

- [Related Article 1](https://example.com)
- [Official Documentation](https://example.com)
- [Advanced Tutorial](https://example.com)

**Tags**: #javascript #react #tutorial #webdev

**Last Updated**: ${new Date().toISOString().split('T')[0]}

`

      // Create blob and download
      const blob = new Blob([template], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'blog-post-template.md'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
    } catch (error) {
      setError('Failed to download template')
    }
  }

  const clearResults = () => {
    setUploadResults(null)
    setError('')
  }

  return (
    <ContentWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-light text-white border-b border-grey/20 pb-3">
              Import Blog Posts
            </h1>
            <p className="text-grey text-sm mt-2">
              Upload Markdown files to create blog posts
            </p>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={downloadTemplate}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 font-medium transition-colors duration-200"
            >
              <MdFileDownload />
              <span>Download Template</span>
            </button>
            
            {uploadResults && (
              <button
                onClick={clearResults}
                className="flex items-center space-x-2 px-4 py-2 bg-grey/20 text-white rounded-md hover:bg-grey/30"
              >
                <MdRefresh />
                <span>Import More</span>
              </button>
            )}
          </div>
        </div>

        {/* Single File Import Only */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-4">
          <h3 className="text-blue-400 font-medium mb-1">Single File Import</h3>
          <p className="text-blue-300 text-sm">Upload one markdown file at a time</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Success Display */}
        {uploadResults && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-md">
            <h3 className="text-green-400 font-medium mb-2">Upload Successful!</h3>
            <div className="text-green-300 text-sm">
              <p>Post created: <span className="font-mono">{uploadResults.post?.slug}</span></p>
              <p>ID: <span className="font-mono">{uploadResults.post?.id}</span></p>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!uploadResults && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-white">
                Upload Single File
              </h2>
              
              <MDFileUpload
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />

              {/* Instructions */}
              <div className="p-4 bg-bgSoft rounded-md border border-grey/20">
                <h3 className="text-white font-medium mb-2">Instructions</h3>
                <div className="text-grey text-sm space-y-2">
                  <p>1. Prepare your Markdown files with YAML frontmatter</p>
                  <p>2. Required field: <code className="text-primary">title</code></p>
                  <p>3. Optional fields: <code className="text-primary">excerpt</code>, <code className="text-primary">tags</code>, <code className="text-primary">author</code>, etc.</p>
                  <p>4. Download the template above for proper format</p>
                  <p>5. Select your files and click upload</p>
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-white">Preview</h2>
              
              <div className="p-8 text-center border border-grey/20 rounded-md">
                <MdUpload className="mx-auto text-4xl text-grey mb-4" />
                <p className="text-grey">
                  Select a file to see preview here
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Back to Blog */}
        <div className="pt-6 border-t border-grey/20">
          <button
            onClick={() => window.location.href = '/admin/blog'}
            className="px-6 py-2 bg-grey/20 text-white rounded-md hover:bg-grey/30"
          >
            ← Back to Blog Posts
          </button>
        </div>
      </div>
    </ContentWrapper>
  )
}

export default BlogImport