'use client'

import Input from '../input/input'
import Image from 'next/image'
import { MdImage } from 'react-icons/md'
import FileUpload from '../file-upload/fileUpload'

import { useEffect, useState, useCallback } from 'react'
import ToolSelectionForm from './addProject/ToolSelectionForm'

function ProjectForm({ skillsData }) {
  const [media, setMedia] = useState('')
  const [selectedTools, setSelectedTools] = useState([])
  const [selectedTrueTools, setSelectedTrueTools] = useState([])
  const [uploadedImage, setUploadedImage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Handle file upload success
  const handleUploadSuccess = file => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082'
    const fullImageUrl = `${API_BASE_URL}${file.url}`
    setUploadedImage(fullImageUrl)
    setMedia(fullImageUrl)
  }

  // Proje oluşturulduktan sonra resim isimlendirmesini düzelt
  const fixProjectImageNaming = async (projectId, imageUrl, apiBaseUrl) => {
    try {
      console.log('Fixing project image naming:', { projectId, imageUrl })

      const response = await fetch(`${apiBaseUrl}/api/v1/upload/rename/${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          oldImageUrl: imageUrl
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to rename project image')
      }

      const result = await response.json()
      console.log('Image renamed successfully:', result)

      // Backend zaten Redis'i güncelliyor ve full URL döndürüyor
      if (result.newImageUrl) {
        console.log('Project image successfully renamed to:', result.newImageUrl)
      }

      return result
    } catch (error) {
      console.error('Error fixing project image naming:', error)
      throw error
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const formData = new FormData(e.target)
      const title = formData.get('title')
      const desc = formData.get('desc')
      const img = formData.get('img')
      const link = formData.get('link')
      const status = formData.get('status')
      const tools = formData.get('tools')

      if (!title || !desc || !status || !img) {
        throw new Error('Please fill in all required fields (Title, Description, Status, Image)')
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082'

      // Tools'u backend format'ına çevir
      const parsedTools = JSON.parse(tools || '[]')
      const pureTools = parsedTools
        .filter(tool => tool.isSelected)
        .map(tool => ({
          skill: tool.skill,
          icon: tool.icon
        }))

      const requestBody = {
        title,
        description: desc,
        image: img, // Normal akış - resimle proje oluştur
        link,
        status,
        tools: pureTools
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create project')
      }

      const createdProject = await response.json()
      console.log('Project created successfully:', createdProject)

      // Proje oluşturulduktan sonra resmin ismini düzelt
      if (createdProject.project && createdProject.project.id && uploadedImage) {
        try {
          await fixProjectImageNaming(createdProject.project.id, uploadedImage, API_BASE_URL)
          console.log('Project image naming fixed successfully')
        } catch (fixError) {
          console.warn('Failed to fix project image naming:', fixError)
          // Resim fix başarısız olsa bile proje oluşturuldu
        }
      }

      // Success - redirect to projects list
      alert('Project created successfully!')
      window.location.href = '/admin/projects'
    } catch (error) {
      console.error('Error creating project:', error)
      alert('Failed to create project: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }


  const selectToolsHandler = useCallback(tools => {
    setSelectedTools(tools)
  }, [])

  useEffect(() => {
    const selectedItems = selectedTools.filter(tool => tool.isSelected)
    setSelectedTrueTools(selectedItems)
  }, [selectedTools])

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card - Image & Tools */}
        <div className="bg-bgSoft rounded-lg p-6 border border-primary/20">
          <h3 className="text-lg font-medium text-white mb-4 border-b border-grey/20 pb-2">Project Media & Tools</h3>

          {/* Project Image */}
          <div className="mb-6">
            <label className="block text-grey mb-3 font-mono">Project Image</label>
            <FileUpload
              currentImage={uploadedImage}
              onUploadSuccess={handleUploadSuccess}
              onRemoveImage={() => {
                setUploadedImage(null)
                setMedia('')
              }}
              multiple={false}
              accept="image/*"
              // Note: Yeni projeler için geçici isim kullanılacak, sonra rename edilecek
            />

            {/* Hidden input for form submission */}
            <input
              type="hidden"
              name="img"
              value={media}
            />
          </div>

          {/* Technologies Used */}
          <div>
            <label className="block text-grey mb-3 font-mono">Technologies Used</label>
            <ToolSelectionForm
              onToolSelect={selectToolsHandler}
              skillsData={skillsData}
              projectTools={[]}
              editPage={true}
            />
          </div>
        </div>

        {/* Right Card - Project Details */}
        <div className="bg-bgSoft rounded-lg p-6 border border-primary/20">
          <h3 className="text-lg font-medium text-white mb-4 border-b border-grey/20 pb-2">Project Information</h3>

          <div className="space-y-6">
            {/* Hidden input for tools */}
            <Input
              type="hidden"
              name="tools"
              value={JSON.stringify(selectedTrueTools)}
            />

            {/* Title */}
            <div>
              <label className="block text-grey mb-2 font-mono">Project Title</label>
              <Input
                placeholder="Enter project title"
                name="title"
                required
                editPage={true}
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-grey mb-2 font-mono">Status</label>
              <select
                name="status"
                id="status"
                className="w-full p-3 bg-bgPrimary border border-grey/20 rounded-lg text-white focus:border-primary/50 focus:outline-none"
                required
              >
                <option value="">Select Status</option>
                <option value="Live">Live</option>
                <option value="Github">Github</option>
                <option value="Draft">Draft</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            {/* Project Link */}
            <div>
              <label className="block text-grey mb-2 font-mono">Project Link (optional)</label>
              <Input
                type="text"
                placeholder="https://example.com"
                name="link"
                editPage={true}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-grey mb-2 font-mono">Project Description</label>
              <textarea
                rows="6"
                placeholder="Describe your project..."
                name="desc"
                required
                className="w-full p-3 bg-bgPrimary border border-grey/20 rounded-lg text-white focus:border-primary/50 focus:outline-none resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-grey/20">
              <button
                type="submit"
                disabled={submitting}
                className={`w-full border-none rounded-lg cursor-pointer p-3 text-white font-medium transition-colors ${
                  submitting ? 'bg-primary/30 cursor-not-allowed' : 'bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary'
                }`}
              >
                {submitting ? 'Creating Project...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

export default ProjectForm
