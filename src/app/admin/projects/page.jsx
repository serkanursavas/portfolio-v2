'use client'

export const dynamic = 'force-dynamic'

import { fetchProjects, fetchSkills } from '../../../lib/admin/data'
import Button from '../../../components/admin-ui/dashboard/button/button'
import Search from '../../../components/admin-ui/dashboard/search/search'
import Link from 'next/link'
import ContentWrapper from '../../../components/admin-ui/dashboard/content-wrapper/contentWrapper'
import Pagination from '../../../components/admin-ui/dashboard/pagination/pagination'
import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082'

function Projects() {
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  const q = searchParams?.get('q') || ''
  const page = searchParams?.get('page') || 1

  const handleDelete = async projectId => {
    if (confirm('Are you sure you want to delete this project?')) {
      setDeleting(true)
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/projects/${projectId}`, {
          method: 'DELETE'
        })

        if (!response.ok) {
          throw new Error('Failed to delete project')
        }

        // Remove from local state
        setProjects(projects.filter(p => p._id !== projectId))
        setCount(prev => prev - 1)

        // Show success message
        alert('Project deleted successfully!')
      } catch (error) {
        console.error('Failed to delete project:', error)
        alert('Failed to delete project: ' + error.message)
      } finally {
        setDeleting(false)
      }
    }
  }

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const { count: totalCount, projects: projectList } = await fetchProjects(q, page)
        setCount(totalCount)
        setProjects(projectList)
        setLoading(false)
      } catch (error) {
        console.error('Failed to load projects:', error)
        setLoading(false)
      }
    }

    loadProjects()
  }, [q, page])

  if (loading) {
    return (
      <ContentWrapper>
        <div>Loading projects...</div>
      </ContentWrapper>
    )
  }

  return (
    <ContentWrapper>
      <div className="flex items-center justify-between">
        <Search placeholder="Search projects..." />
        <Link href="/admin/projects/add">
          <Button bgColor="bg-purple-600">Add New</Button>
        </Link>
      </div>
      <table className="w-[100%] mt-2">
        <thead className="text-left">
          <tr>
            <th className="p-3">Title</th>
            <th className="p-3">Status</th>
            <th className="p-3">Tools</th>
            <th className="p-3">Last Update</th>
            <th className="p-3">Created At</th>
            <th className="p-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {projects.map(project => {
            return (
              <tr key={project._id}>
                <td className="p-3">{project.title}</td>
                <td className="p-3">
                  <span className={`p-[6px] text-sm rounded-[4px] ${project.status === 'Live' ? 'bg-[#f7737375]' : 'bg-[#afd6ee75]'}`}>
                    {project.status}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {project.tools && project.tools.map((tool, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                        title={tool.skill}
                      >
                        {tool.skill}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-3">{project.updatedAt.toString().slice(4, 16)}</td>
                <td className="p-3">{project.createdAt.toString().slice(4, 16)}</td>

                <td className="p-3">
                  <div className="flex space-x-2">
                    <Link href={`/admin/projects/${project._id}`}>
                      <Button bgColor="bg-green-700">Edit</Button>
                    </Link>
                    <button
                      onClick={() => handleDelete(project._id)}
                      disabled={deleting}
                      className={`px-4 py-2 rounded text-white ${deleting ? 'bg-rose-500/50 cursor-not-allowed' : 'bg-rose-700 hover:bg-rose-600'}`}
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <Pagination count={count} />
    </ContentWrapper>
  )
}

export default Projects
