'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { fetchSkills } from '../../../../lib/admin/data'
import ContentWrapper from '../../../../components/admin-ui/dashboard/content-wrapper/contentWrapper'
import ProjectForm from '../../../../components/admin-ui/dashboard/projects/projectForm'

function AddProject() {
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadSkills = async () => {
      try {
        setLoading(true)
        const { skills } = await fetchSkills()

        const parsedTools = JSON.parse(JSON.stringify(skills))
        parsedTools.sort((a, b) => a.skill.localeCompare(b.skill))

        setSkills(parsedTools)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadSkills()
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <ContentWrapper>
      <div className="mb-6">
        <h1 className="text-2xl font-light text-white border-b border-grey/20 pb-3">
          Add New Project
        </h1>
      </div>
      <ProjectForm skillsData={skills} />
    </ContentWrapper>
  )
}

export default AddProject