'use client'

import { useState, useRef } from 'react'
import { MdUpload, MdDescription, MdCheck, MdError } from 'react-icons/md'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082'

const MDFileUpload = ({ onUploadSuccess, onUploadError }) => {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  // File selection handler
  const handleFiles = (selectedFiles) => {
    const mdFiles = Array.from(selectedFiles).filter(file => 
      file.name.endsWith('.md') || file.name.endsWith('.markdown')
    )

    if (mdFiles.length === 0) {
      onUploadError?.('Please select valid .md or .markdown files')
      return
    }

    if (mdFiles.length > 1) {
      onUploadError?.('Please select only one file at a time')
      return
    }

    // Read file contents
    Promise.all(
      mdFiles.map(file => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            resolve({
              file,
              content: e.target.result,
              status: 'ready'
            })
          }
          reader.onerror = reject
          reader.readAsText(file)
        })
      })
    ).then(fileObjects => {
      setFiles(fileObjects)
    }).catch(error => {
      onUploadError?.('Failed to read files: ' + error.message)
    })
  }

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    handleFiles(e.dataTransfer.files)
  }

  // File input change
  const handleFileChange = (e) => {
    handleFiles(e.target.files)
  }

  // Upload single file
  const uploadFiles = async () => {
    if (files.length === 0) return

    setUploading(true)

    try {
      // Single file upload
      const file = files[0]
      const response = await fetch(`${API_BASE_URL}/api/v1/blog/import-md`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: file.content,
          filename: file.file.name
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.details || result.error || 'Upload failed')
        }

        // Update file statuses
        const updatedFiles = files.map(f => {
          const uploadResult = result.results.find(r => r.filename === f.file.name)
          return {
            ...f,
            status: uploadResult?.success ? 'success' : 'error',
            error: uploadResult?.error,
            slug: uploadResult?.slug
          }
        })

        setFiles(updatedFiles)
        onUploadSuccess?.(result)

      } else {
        // Single upload
        const file = files[0]
        const response = await fetch(`${API_BASE_URL}/api/v1/blog/import-md`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: file.content,
            filename: file.file.name
          })
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Upload failed')
        }

        const updatedFiles = [{
          ...file,
          status: 'success',
          slug: result.post.slug
        }]

        setFiles(updatedFiles)
        onUploadSuccess?.(result)
      }

    } catch (error) {
      const updatedFiles = files.map(f => ({
        ...f,
        status: 'error',
        error: error.message
      }))
      setFiles(updatedFiles)
      onUploadError?.(error.message)
    } finally {
      setUploading(false)
    }
  }

  // Clear files
  const clearFiles = () => {
    setFiles([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <MdCheck className="text-green-500" />
      case 'error':
        return <MdError className="text-red-500" />
      default:
        return <MdDescription className="text-blue-500" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-primary bg-primary/10' 
            : 'border-grey hover:border-primary/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown"
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
        />
        
        <MdUpload className="mx-auto text-4xl text-grey mb-4" />
        <p className="text-white mb-2">
          {multiple ? 'Drop MD files here or click to select' : 'Drop MD file here or click to select'}
        </p>
        <p className="text-grey text-sm mb-4">
          Supports .md and .markdown files
        </p>
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/80 transition-colors"
        >
          Select {multiple ? 'Files' : 'File'}
        </button>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="text-white font-medium">
              {files.length} file{files.length > 1 ? 's' : ''} selected
            </h4>
            <button
              onClick={clearFiles}
              className="text-grey hover:text-white text-sm"
            >
              Clear all
            </button>
          </div>

          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-bgSoft rounded-md border border-grey/20"
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(file.status)}
                  <div>
                    <p className="text-white text-sm font-medium">
                      {file.file.name}
                    </p>
                    <p className="text-grey text-xs">
                      {(file.file.size / 1024).toFixed(1)} KB
                    </p>
                    {file.slug && (
                      <p className="text-primary text-xs">
                        Slug: {file.slug}
                      </p>
                    )}
                  </div>
                </div>

                {file.status === 'error' && (
                  <div className="text-red-400 text-xs max-w-xs">
                    {file.error}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Upload Button */}
          <div className="flex gap-2">
            <button
              onClick={uploadFiles}
              disabled={uploading || files.some(f => f.status === 'success')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                uploading || files.some(f => f.status === 'success')
                  ? 'bg-grey/30 text-grey cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary/80'
              }`}
            >
              {uploading ? 'Uploading...' : 'Upload Files'}
            </button>

            {files.some(f => f.status === 'success') && (
              <button
                onClick={clearFiles}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Upload More
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default MDFileUpload