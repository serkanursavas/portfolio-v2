'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { MdUpload, MdImage, MdCheck, MdError, MdClose } from 'react-icons/md'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082'

const BlogImageUpload = ({ onUploadSuccess, onUploadError, currentImage, onImageChange, blogSlug }) => {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('') // 'success', 'error', ''
  const [previewImage, setPreviewImage] = useState(currentImage || '')
  const fileInputRef = useRef(null)

  // Update preview when currentImage prop changes
  useEffect(() => {
    setPreviewImage(currentImage || '')
  }, [currentImage])

  // File selection handler
  const handleFiles = (selectedFiles) => {
    const fileArray = Array.from(selectedFiles)
    const imageFile = fileArray.find(file => 
      file.type.startsWith('image/')
    )

    if (!imageFile) {
      onUploadError?.('Please select a valid image file')
      return
    }

    if (fileArray.length > 1) {
      onUploadError?.('Please select only one file at a time')
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewImage(e.target.result)
    }
    reader.readAsDataURL(imageFile)

    // Upload immediately
    uploadFile(imageFile)
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

  // Upload file
  const uploadFile = async (file) => {
    setUploading(true)
    setUploadStatus('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      // URL'ye blog slug ekle (eğer varsa)
      const uploadUrl = blogSlug 
        ? `${API_BASE_URL}/api/v1/upload/blog-image?slug=${encodeURIComponent(blogSlug)}`
        : `${API_BASE_URL}/api/v1/upload/blog-image`

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      const fullImageURL = `${API_BASE_URL}${result.url}`
      setUploadStatus('success')
      onUploadSuccess?.(result)
      onImageChange?.(fullImageURL)

    } catch (error) {
      setUploadStatus('error')
      onUploadError?.(error.message)
      setPreviewImage(currentImage || '') // Reset to current image on error
    } finally {
      setUploading(false)
    }
  }

  // Clear image
  const clearImage = () => {
    setPreviewImage('')
    setUploadStatus('')
    onImageChange?.('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg transition-colors
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${previewImage ? 'p-4' : 'p-8 hover:border-gray-400'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        
        {!previewImage ? (
          <div className="text-center space-y-4">
            <MdUpload className="mx-auto text-4xl text-gray-400" />
            <div>
              <p className="text-lg font-medium text-white">
                Drop your image here
              </p>
              <p className="text-sm text-gray-400 mt-1">
                or click to browse
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Choose Image
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Image Preview */}
            <div className="relative w-full h-48 rounded-md overflow-hidden">
              <Image 
                src={previewImage} 
                alt="Blog featured image" 
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  clearImage()
                }}
                className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
              >
                <MdClose className="text-sm" />
              </button>
            </div>
            
            {/* Status */}
            {uploading && (
              <div className="flex items-center justify-center space-x-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Uploading...</span>
              </div>
            )}
            
            {uploadStatus === 'success' && (
              <div className="flex items-center justify-center space-x-2 text-green-600">
                <MdCheck />
                <span>Upload successful!</span>
              </div>
            )}
            
            {uploadStatus === 'error' && (
              <div className="flex items-center justify-center space-x-2 text-red-600">
                <MdError />
                <span>Upload failed</span>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex space-x-2 justify-center">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
                disabled={uploading}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
              >
                Change Image
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Upload Info */}
      <div className="text-xs text-gray-400 text-center">
        Supported formats: JPG, PNG, GIF, WEBP • Max size: 5MB
      </div>
    </div>
  )
}

export default BlogImageUpload