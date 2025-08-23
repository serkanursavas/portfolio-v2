'use client'

import { useState, useRef } from 'react'
import { MdUpload, MdDescription, MdCheck, MdError } from 'react-icons/md'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082'

const MDFileUpload = ({ onUploadSuccess, onUploadError }) => {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('') // 'success', 'error', ''
  const fileInputRef = useRef(null)

  // File selection handler
  const handleFiles = (selectedFiles) => {
    const fileArray = Array.from(selectedFiles)
    const mdFile = fileArray.find(file => 
      file.name.endsWith('.md') || file.name.endsWith('.markdown')
    )

    if (!mdFile) {
      onUploadError?.('Please select a valid .md or .markdown file')
      return
    }

    if (fileArray.length > 1) {
      onUploadError?.('Please select only one file at a time')
      return
    }

    // Read file content
    const reader = new FileReader()
    reader.onload = (e) => {
      setFile({
        file: mdFile,
        content: e.target.result,
        name: mdFile.name
      })
      setUploadStatus('')
    }
    reader.onerror = () => {
      onUploadError?.('Failed to read file')
    }
    reader.readAsText(mdFile)
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
  const uploadFile = async () => {
    if (!file) return

    setUploading(true)
    setUploadStatus('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/blog/import-md`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: file.content,
          filename: file.name
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.details || result.error || 'Upload failed')
      }

      setUploadStatus('success')
      onUploadSuccess?.(result)
      
      // Clear file after successful upload
      setTimeout(() => {
        setFile(null)
        setUploadStatus('')
      }, 2000)

    } catch (error) {
      setUploadStatus('error')
      onUploadError?.(error.message)
    } finally {
      setUploading(false)
    }
  }

  // Clear file
  const clearFile = () => {
    setFile(null)
    setUploadStatus('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${file ? 'bg-gray-50' : 'hover:border-gray-400'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown"
          onChange={handleFileChange}
          className="hidden"
        />
        
        {!file ? (
          <div className="space-y-4">
            <MdUpload className="mx-auto text-4xl text-gray-400" />
            <div>
              <p className="text-lg font-medium text-gray-900">
                Drop your .md file here
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or click to browse
              </p>
            </div>
            <button
              onClick={() => {
                console.log('Choose File button clicked')
                console.log('fileInputRef.current:', fileInputRef.current)
                fileInputRef.current?.click()
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Choose File
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <MdDescription className="mx-auto text-4xl text-green-500" />
            <div>
              <p className="text-lg font-medium text-gray-900">
                {file.name}
              </p>
              <p className="text-sm text-gray-500">
                {Math.round(file.content.length / 1024)} KB
              </p>
            </div>
            
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
            
            <div className="flex space-x-2 justify-center">
              <button
                onClick={uploadFile}
                disabled={uploading || uploadStatus === 'success'}
                className={`
                  px-4 py-2 rounded-md text-white
                  ${uploading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}
                  ${uploadStatus === 'success' ? 'bg-gray-400' : ''}
                  disabled:cursor-not-allowed
                `}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              
              <button
                onClick={clearFile}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MDFileUpload