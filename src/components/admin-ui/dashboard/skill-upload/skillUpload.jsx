'use client'

import { useState, useRef } from 'react'

const SkillUpload = ({
  onUploadSuccess,
  accept = 'image/*',
  currentImage = null,
  onRemoveImage = null,
  skillName = null
}) => {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082'

  const handleFileSelect = event => {
    const files = Array.from(event.target.files)
    if (files.length > 0) {
      uploadSkillIcon(files[0])
    }
  }

  const uploadSkillIcon = async file => {
    if (!skillName) {
      setError('Skill name is required for upload')
      return
    }

    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_BASE_URL}/api/v1/upload/skill/${encodeURIComponent(skillName)}`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`Skill icon upload failed: ${errorData.error || response.statusText} (${response.status})`)
      }

      const data = await response.json()
      const uploadedFile = {
        filename: data.filename,
        url: `${API_BASE_URL}${data.url}`,
        size: data.size,
        skillName: data.skillName
      }

      if (onUploadSuccess) {
        onUploadSuccess(uploadedFile)
      }
    } catch (error) {
      console.error('Upload error:', error)
      setError(error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDragOver = event => {
    event.preventDefault()
    event.stopPropagation()
  }

  const handleDrop = event => {
    event.preventDefault()
    event.stopPropagation()

    const files = Array.from(event.dataTransfer.files)
    if (files.length > 0) {
      uploadSkillIcon(files[0])
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="w-full">
      {/* Show current image if exists */}
      {currentImage ? (
        <div className="relative group">
          <div className="w-full aspect-video bg-bgPrimary/20 rounded border border-grey/20 overflow-hidden">
            <img
              src={currentImage}
              alt="Current skill icon"
              className="w-full h-full object-contain bg-bgPrimary/10"
            />
          </div>
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
            <div className="flex space-x-2">
              {onRemoveImage && (
                <button
                  type="button"
                  onClick={onRemoveImage}
                  className="px-4 py-2 bg-red-500/90 text-white text-sm rounded hover:bg-red-500 font-medium transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Upload area when no image */
        <div
          className={`w-full aspect-video border-2 border-dashed rounded-lg cursor-pointer transition-colors flex items-center justify-center ${
            uploading ? 'border-primary/50 bg-primary/10' : 'border-grey/30 hover:border-primary/50 hover:bg-bgPrimary/20'
          }`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept={accept}
            className="hidden"
          />

          {uploading ? (
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
              <p className="text-primary font-medium">Uploading skill icon...</p>
            </div>
          ) : (
            <div className="text-center space-y-3 p-6">
              <div className="text-grey/50">
                <svg
                  className="mx-auto h-16 w-16"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="space-y-1">
                <p className="text-grey">
                  <span className="font-medium text-primary">Click to upload skill icon</span> or drag and drop
                </p>
                <p className="text-sm text-grey/70">SVG, PNG, JPG up to 5MB</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-md">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}

export default SkillUpload