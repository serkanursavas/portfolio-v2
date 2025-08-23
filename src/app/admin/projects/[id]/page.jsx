'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import ContentWrapper from '../../../../components/admin-ui/dashboard/content-wrapper/contentWrapper'
import Button from '../../../../components/admin-ui/dashboard/button/button'
import Input from '../../../../components/admin-ui/dashboard/input/input'
import FileUpload from '../../../../components/admin-ui/dashboard/file-upload/fileUpload'
import ToolSelectionForm from '../../../../components/admin-ui/dashboard/projects/addProject/ToolSelectionForm'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082'

function SingleProjectPage() {
  const router = useRouter()
  const params = useParams()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tools: [],
    status: 'Draft',
    image: '',
    link: ''
  })
  const [skillsData, setSkillsData] = useState([])
  const [originalImage, setOriginalImage] = useState('') // Track original image for cleanup
  const [removedOriginalImage, setRemovedOriginalImage] = useState(false) // Track if original image was removed

  // Fetch project data and skills
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch project and skills data in parallel
        const [projectResponse, skillsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/projects/${params.id}`, { cache: 'no-store' }),
          fetch(`${API_BASE_URL}/api/v1/skills`, { cache: 'no-store' })
        ])

        if (!projectResponse.ok || !skillsResponse.ok) {
          throw new Error('Failed to fetch data')
        }

        const [projectData, skillsData] = await Promise.all([projectResponse.json(), skillsResponse.json()])

        const project = projectData.project
        setProject(project)
        setSkillsData(skillsData.skills || [])

        // Handle tools - could be string or array
        let tools = []
        if (project.tools) {
          if (typeof project.tools === 'string') {
            try {
              tools = JSON.parse(project.tools)
            } catch {
              tools = []
            }
          } else if (Array.isArray(project.tools)) {
            tools = project.tools
          }
        }

        setFormData({
          title: project.title || '',
          description: project.description || '',
          tools: tools,
          status: project.status || 'Draft',
          image: project.image || '',
          link: project.link || ''
        })

        // Set original image for cleanup tracking
        setOriginalImage(project.image || '')
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchData()
    }
  }, [params.id])

  // No automatic cleanup needed - files stay in uploads folder
  // useEffect(() => {
  //   // Removed automatic cleanup
  // }, [])

  // Handle input changes
  const handleInputChange = e => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle tools selection - memoized to prevent unnecessary re-renders
  const handleToolsChange = useCallback(selectedTools => {
    // Convert selected tools to the format expected by backend
    const tools = selectedTools
      .filter(tool => tool.isSelected)
      .map(tool => ({
        skill: tool.skill,
        icon: tool.icon
      }))

    setFormData(prev => ({
      ...prev,
      tools
    }))
  }, [])

  // Handle temporary image upload
  const handleTempImageUpload = uploadedFile => {
    console.log('=== Image Upload ===')
    console.log('Uploaded File:', uploadedFile)

    // Simply set the image - no complex tracking needed
    setFormData(prev => ({
      ...prev,
      image: uploadedFile.url
    }))

    // Reset removed flag since we now have a new image
    if (removedOriginalImage) {
      console.log('Resetting removedOriginalImage flag since new image uploaded')
      setRemovedOriginalImage(false)
    }

    console.log('Image set successfully')
  }

  // Handle image upload
  const handleImageUpload = imageUrl => {
    setFormData(prev => ({
      ...prev,
      image: imageUrl
    }))
  }

  // Handle image removal
  const handleImageRemove = () => {
    console.log('=== Image Removal Requested ===')
    console.log('Original Image:', originalImage)
    console.log('Current Form Image:', formData.image)

    // Mark that original image was removed (but don't delete from backend yet)
    if (originalImage && originalImage !== '') {
      console.log('Marking original image as removed:', originalImage)
      setRemovedOriginalImage(true)
    }

    // Clear image from form (but keep original image in backend)
    setFormData(prev => ({
      ...prev,
      image: '' // This will be sent to backend if form is submitted
    }))

    console.log('Image removed from form (not from backend yet)')
    console.log('Form image is now empty, but original image remains in backend')
  }

  // Handle form submission
  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)

    try {
      console.log('Starting form submission...')
      console.log('Current state:', {
        originalImage,
        formDataImage: formData.image,
        removedOriginalImage
      })

      // Handle image cleanup (only for removed original images)
      await handleImageCleanup()

      // Update project
      const response = await fetch(`${API_BASE_URL}/api/v1/projects/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          image: formData.image,
          link: formData.link,
          status: formData.status,
          tools: formData.tools
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update project')
      }

      console.log('Project updated successfully')
      router.push('/admin/projects')
    } catch (error) {
      console.error('Error updating project:', error)
      alert('Failed to update project')
    } finally {
      setSaving(false)
    }
  }

  // Handle image cleanup on form submit
  const handleImageCleanup = async () => {
    console.log('=== Image Cleanup Analysis ===')
    console.log('Original Image:', originalImage)
    console.log('Current Form Image:', formData.image)
    console.log('Removed Original Image Flag:', removedOriginalImage)

    // Only cleanup if original image was removed and it's a localhost upload
    if (removedOriginalImage && originalImage && originalImage.includes(`${API_BASE_URL}/uploads/`)) {
      console.log('Case 1: Original image was removed, cleaning up from backend:', originalImage)
      await deleteImageFromBackend(originalImage)
      return
    }

    // No cleanup needed
    console.log('Case 2: No cleanup needed - keeping all images')
  }

  // Delete image from backend helper
  const deleteImageFromBackend = async imageUrl => {
    try {
      if (!imageUrl || !imageUrl.includes(`${API_BASE_URL}/uploads/`)) {
        return
      }

      const filename = imageUrl.split('/uploads/').pop()
      if (!filename) return

      console.log('Deleting old image:', filename)
      const response = await fetch(`${API_BASE_URL}/api/v1/uploads/${filename}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        console.log('Successfully deleted old image:', filename)
      }
    } catch (error) {
      console.warn('Error deleting image:', error)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    console.log('=== Delete Project Requested ===')
    console.log('Project ID:', params.id)
    console.log('Project Data:', project)

    if (!confirm('Are you sure you want to delete this project?')) {
      console.log('Delete cancelled by user')
      return
    }

    try {
      console.log('Sending DELETE request to:', `${API_BASE_URL}/api/v1/projects/${params.id}`)

      const response = await fetch(`${API_BASE_URL}/api/v1/projects/${params.id}`, {
        method: 'DELETE'
      })

      console.log('Delete response status:', response.status)
      console.log('Delete response ok:', response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Delete failed with status:', response.status)
        console.error('Error response:', errorText)
        throw new Error(`Failed to delete project: ${response.status} - ${errorText}`)
      }

      console.log('Project deleted successfully')
      console.log('Redirecting to projects list...')

      router.push('/admin/projects')
    } catch (error) {
      console.error('Error deleting project:', error)
      alert(`Failed to delete project: ${error.message}`)
    }
  }

  // Handle cancel with cleanup
  const handleCancel = async () => {
    console.log('=== Canceling Edit ===')
    console.log('Resetting form to original state')

    // Reset form data to original project values
    setFormData({
      title: project.title || '',
      description: project.description || '',
      tools: project.tools || [],
      status: project.status || 'Draft',
      image: project.image || '', // Reset to original image
      link: project.link || ''
    })

    // Reset flags
    setRemovedOriginalImage(false)

    console.log('Form reset to original state')
    console.log('Original image restored:', project.image)

    // No cleanup needed - files stay in uploads folder
    router.push('/admin/projects')
  }

  if (loading) {
    return (
      <ContentWrapper>
        <div className="text-center py-8">
          <div className="text-primary text-4xl mb-4">⚡</div>
          <p className="text-grey">Loading project...</p>
        </div>
      </ContentWrapper>
    )
  }

  if (!project) {
    return (
      <ContentWrapper>
        <div className="text-center py-8">
          <div className="text-red-400 text-4xl mb-4">❌</div>
          <p className="text-grey">Project not found</p>
        </div>
      </ContentWrapper>
    )
  }

  return (
    <ContentWrapper>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-light text-white border-b border-grey/20 pb-3">Edit Project</h1>
        <div className="flex space-x-3">
          <Button
            bgColor="bg-red-500/20 hover:bg-red-500/30 border-red-500/30 text-red-400"
            onClick={handleDelete}
          >
            Delete Project
          </Button>
          <Button
            bgColor="bg-grey/20 hover:bg-grey/30 border-grey/30 text-grey"
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Card - Image & Tools */}
          <div className="bg-bgSoft rounded-lg p-6 border border-primary/20">
            <h3 className="text-lg font-medium text-white mb-4 border-b border-grey/20 pb-2">Project Media & Tools</h3>

            {/* Project Image */}
            <div className="mb-6">
              <label className="block text-grey mb-3 font-mono">Project Image</label>
              <FileUpload
                currentImage={formData.image}
                onTempUpload={handleTempImageUpload}
                onRemoveImage={handleImageRemove}
                multiple={false}
                accept="image/*"
                projectId={params.id}
              />
            </div>

            {/* Technologies Used */}
            <div>
              <label className="block text-grey mb-3 font-mono">Technologies Used</label>
              <ToolSelectionForm
                onToolSelect={handleToolsChange}
                skillsData={skillsData}
                projectTools={formData.tools}
                editPage={true}
              />
            </div>
          </div>

          {/* Right Card - Project Details */}
          <div className="bg-bgSoft rounded-lg p-6 border border-primary/20">
            <h3 className="text-lg font-medium text-white mb-4 border-b border-grey/20 pb-2">Project Information</h3>

            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-grey mb-2 font-mono">Project Title</label>
                <Input
                  type="text"
                  name="title"
                  placeholder="Project Title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  editPage={true}
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-grey mb-2 font-mono">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-bgPrimary border border-grey/20 rounded-lg text-white focus:border-primary/50 focus:outline-none"
                >
                  <option value="Draft">Draft</option>
                  <option value="Live">Live</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {/* Project Link */}
              <div>
                <label className="block text-grey mb-2 font-mono">Project Link (optional)</label>
                <Input
                  type="url"
                  name="link"
                  placeholder="https://example.com"
                  value={formData.link}
                  onChange={handleInputChange}
                  editPage={true}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-grey mb-2 font-mono">Project Description</label>
                <textarea
                  name="description"
                  placeholder="Describe your project..."
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="6"
                  className="w-full p-3 bg-bgPrimary border border-grey/20 rounded-lg text-white focus:border-primary/50 focus:outline-none resize-none"
                  required
                />
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-grey/20">
                <Button
                  type="submit"
                  bgColor="bg-primary/20 hover:bg-primary/30 border-primary/30 text-primary"
                  disabled={saving}
                >
                  {saving ? 'Updating...' : 'Update Project'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </ContentWrapper>
  )
}

export default SingleProjectPage
