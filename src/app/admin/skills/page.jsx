'use client'

export const dynamic = 'force-dynamic'

import Button from '../../../components/admin-ui/dashboard/button/button'
import ContentWrapper from '../../../components/admin-ui/dashboard/content-wrapper/contentWrapper'
import Search from '../../../components/admin-ui/dashboard/search/search'
import Link from 'next/link'
import Image from 'next/image'
import { fetchSkills } from '../../../lib/admin/data'
import Pagination from '../../../components/admin-ui/dashboard/pagination/pagination'
import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082'

function Skills() {
  const searchParams = useSearchParams()
  const [skills, setSkills] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  const q = searchParams?.get('q') || ''
  const page = searchParams?.get('page') || 1

  const handleDelete = async skillId => {
    if (confirm('Are you sure you want to delete this skill?')) {
      setDeleting(true)
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/skills/${skillId}`, {
          method: 'DELETE'
        })

        if (!response.ok) {
          throw new Error('Failed to delete skill')
        }

        // Remove from local state
        setSkills(skills.filter(s => s.id !== skillId))
        setCount(prev => prev - 1)

        // Show success message
        alert('Skill deleted successfully!')
      } catch (error) {
        console.error('Failed to delete skill:', error)
        alert('Failed to delete skill: ' + error.message)
      } finally {
        setDeleting(false)
      }
    }
  }

  useEffect(() => {
    const loadSkills = async () => {
      try {
        const { count: totalCount, skills: skillList } = await fetchSkills(q, page)
        setCount(totalCount)
        setSkills(skillList)
        setLoading(false)
      } catch (error) {
        console.error('Failed to load skills:', error)
        setLoading(false)
      }
    }

    loadSkills()
  }, [q, page])

  if (loading) {
    return (
      <ContentWrapper>
        <div>Loading skills...</div>
      </ContentWrapper>
    )
  }

  return (
    <ContentWrapper>
      <div className="flex items-center justify-between">
        <Search placeholder="Search skills..." />
        <Link href="/admin/skills/add">
          <Button bgColor="bg-purple-600">Add New</Button>
        </Link>
      </div>
      <table className="w-[100%] mt-2">
        <thead className="text-left bg-">
          <tr>
            <th className="p-3">Skill</th>
            <th className="p-3">Category</th>

            <th className="p-3">Created At</th>

            <th className="p-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {skills &&
            skills.map(skill => {
              return (
                <tr key={skill.id}>
                  <td className="p-3">
                    <div className="flex items-center space-x-2">
                      <Image
                        src={skill.icon || ''}
                        alt=""
                        width={25}
                        height={25}
                      />{' '}
                      <span>{skill.skill}</span>
                    </div>
                  </td>
                  <td className="p-3">{skill.category}</td>

                  <td className="p-3">{skill.createdAt.toString().slice(4, 16)}</td>

                  <td className="p-3">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDelete(skill.id)}
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

export default Skills
