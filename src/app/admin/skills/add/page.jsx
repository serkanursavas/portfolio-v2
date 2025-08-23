'use client'

export const dynamic = 'force-dynamic'

import ContentWrapper from '../../../../components/admin-ui/dashboard/content-wrapper/contentWrapper'
import Input from '../../../../components/admin-ui/dashboard/input/input'
import SkillUpload from '../../../../components/admin-ui/dashboard/skill-upload/skillUpload'
import Image from 'next/image'

import { useEffect, useState } from 'react'

function AddSkills() {
  const [file, setFile] = useState(null)
  const [media, setMedia] = useState('')
  const [uploadedIcon, setUploadedIcon] = useState(null)
  const [skillName, setSkillName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [categories, setCategories] = useState([])
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const formData = new FormData(e.target)
      const skill = formData.get('skill')
      const icon = formData.get('icon')
      let category = formData.get('category')

      // If new category is selected, use the new category name
      if (category === 'new') {
        category = newCategoryName.trim()
      }

      if (!skill || !category) {
        throw new Error('Please fill in all required fields')
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082'

      const response = await fetch(`${API_BASE_URL}/api/v1/skills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          skill,
          icon: icon || '',
          category
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create skill')
      }

      const createdSkill = await response.json()
      console.log('Skill created successfully:', createdSkill)

      // Success - redirect to skills list
      alert('Skill created successfully!')
      window.location.href = '/admin/skills'
    } catch (error) {
      console.error('Error creating skill:', error)
      alert('Failed to create skill: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle file upload success
  const handleUploadSuccess = file => {
    console.log('Skill icon upload success:', file)
    // file.url already contains full URL from backend
    setUploadedIcon(file.url)
    setMedia(file.url)
  }

  // Fetch existing categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082'
        const response = await fetch(`${API_BASE_URL}/api/v1/skills`)
        
        if (response.ok) {
          const data = await response.json()
          // Extract unique categories from existing skills
          const uniqueCategories = [...new Set(data.skills?.map(skill => skill.category) || [])]
          setCategories(uniqueCategories.sort())
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error)
        // Fallback to default categories if API fails
        setCategories(['languages', 'frameworks', 'databases', 'tools', 'others'])
      }
    }

    fetchCategories()
  }, [])


  return (
    <ContentWrapper>
      <div className="mb-6">
        <h1 className="text-2xl font-light text-white border-b border-grey/20 pb-3">
          Add New Skill
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Card - Icon & Preview */}
          <div className="bg-bgSoft rounded-lg p-6 border border-primary/20">
            <h3 className="text-lg font-medium text-white mb-4 border-b border-grey/20 pb-2">Skill Icon</h3>


            {/* Skill Icon Upload */}
            <div>
              <label className="block text-grey mb-3 font-mono">Upload Icon</label>
              <SkillUpload
                currentImage={uploadedIcon}
                onUploadSuccess={handleUploadSuccess}
                onRemoveImage={() => {
                  setUploadedIcon(null)
                  setMedia('')
                }}
                accept="image/*"
                skillName={skillName}
              />
            </div>
          </div>

          {/* Right Card - Skill Details */}
          <div className="bg-bgSoft rounded-lg p-6 border border-primary/20">
            <h3 className="text-lg font-medium text-white mb-4 border-b border-grey/20 pb-2">Skill Information</h3>

            <div className="space-y-6">
              {/* Hidden input for icon URL */}
              <input
                type="hidden"
                name="icon"
                value={media}
              />

              {/* Skill Name */}
              <div>
                <label className="block text-grey mb-2 font-mono">Skill Name</label>
                <Input
                  type="text"
                  name="skill"
                  placeholder="Enter skill name (e.g., React, JavaScript)"
                  value={skillName}
                  onChange={e => setSkillName(e.target.value)}
                  required
                  editPage={true}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-grey mb-2 font-mono">Category</label>
                <select
                  name="category"
                  className="w-full p-3 bg-bgPrimary border border-grey/20 rounded-lg text-white focus:border-primary/50 focus:outline-none"
                  required
                  onChange={(e) => {
                    setShowNewCategory(e.target.value === 'new')
                    if (e.target.value !== 'new') {
                      setNewCategoryName('')
                    }
                  }}
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                  {/* Add option for new category */}
                  <option value="new">+ Add New Category</option>
                </select>
                
                {/* New Category Input */}
                {showNewCategory && (
                  <div className="mt-3">
                    <Input
                      type="text"
                      placeholder="Enter new category name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      required={showNewCategory}
                      editPage={true}
                    />
                  </div>
                )}
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
                  {submitting ? 'Creating Skill...' : 'Create Skill'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </ContentWrapper>
  )
}

export default AddSkills
