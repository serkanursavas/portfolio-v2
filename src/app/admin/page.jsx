'use client'

export const dynamic = 'force-dynamic'

import { fetchProjects, fetchProjectsViews, fetchVisits, fetchSkills, fetchDashboardStats } from '../../lib/admin/data'
import Card from '../../components/admin-ui/dashboard/card/card'
import ContentWrapper from '../../components/admin-ui/dashboard/content-wrapper/contentWrapper'
import dynamicImport from 'next/dynamic'

const Chart = dynamicImport(() => import('../../components/admin-ui/dashboard/chart/chart'), { 
  ssr: false,
  loading: () => <div>Loading chart...</div>
})
import { useState, useEffect } from 'react'

function Dashboard() {
  const [data, setData] = useState({
    visits: [],
    views: [],
    projects: [],
    skills: [],
    projectsCount: 0,
    skillsCount: 0,
    totalVisits: 0,
    totalProjectViews: 0,
    analytics: null
  })
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const [visitsRes, viewsRes, projectsRes, skillsRes, dashboardStats] = await Promise.all([
        fetchVisits(),
        fetchProjectsViews(),
        fetchProjects(),
        fetchSkills(),
        fetchDashboardStats()
      ])

      const projects = projectsRes.projects.sort(
        (a, b) => b.createdAt - a.createdAt
      )

      const skills = skillsRes.skills || []

      setData({
        visits: visitsRes.visits,
        views: viewsRes.views,
        projects,
        skills,
        projectsCount: projectsRes.count,
        skillsCount: skillsRes.count,
        totalVisits: dashboardStats.totalVisits,
        totalProjectViews: dashboardStats.totalProjectViews,
        analytics: dashboardStats.analytics
      })
      setLoading(false)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <ContentWrapper>
        <div>Loading dashboard...</div>
      </ContentWrapper>
    )
  }

  return (
    <>
      {/* First Row - Latest Project Card */}
      <div className="flex gap-5 mb-5">
        {data.projects[0] ? (
          <Card
            style={{ flex: '2', marginRight: '20px' }}
            lastProject={data.projects[0]}
          />
        ) : (
          <div style={{ flex: '2', marginRight: '20px' }} className="bg-bgSoft rounded-[10px] p-5">
            <h1 className="mb-5 text-2xl font-extralight text-textSoft">Latest Project</h1>
            <p className="text-textSoft">No projects found</p>
          </div>
        )}
        
        {/* Analytics Summary */}
        <div
          style={{ flex: '1' }}
          className="bg-bgSoft overflow-hidden rounded-[10px] p-6 border border-primary/20 hover:border-primary/40 transition-all duration-300"
        >
          <h1 className="mb-5 text-2xl font-light text-white border-b border-grey/20 pb-3">Analytics</h1>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-grey text-sm">Total Visits</span>
              <span className="text-2xl font-bold text-primary">{data.totalVisits}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-grey text-sm">Project Views</span>
              <span className="text-2xl font-bold text-primary">{data.totalProjectViews}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row - Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        {/* Projects Count */}
        <div className="bg-bgSoft rounded-[10px] p-6 border border-primary/20 hover:border-primary/40 transition-all duration-300">
          <h3 className="text-lg font-light text-white mb-4 border-b border-grey/20 pb-2">Projects</h3>
          <div className="flex flex-col items-center">
            <div className="text-4xl font-bold text-primary mb-2">
              {data.projectsCount}
            </div>
            <div className="text-grey text-sm font-mono">
              total projects
            </div>
          </div>
        </div>

        {/* Skills Count */}
        <div className="bg-bgSoft rounded-[10px] p-6 border border-primary/20 hover:border-primary/40 transition-all duration-300">
          <h3 className="text-lg font-light text-white mb-4 border-b border-grey/20 pb-2">Skills</h3>
          <div className="flex flex-col items-center">
            <div className="text-4xl font-bold text-primary mb-2">
              {data.skillsCount}
            </div>
            <div className="text-grey text-sm font-mono">
              total skills
            </div>
          </div>
        </div>

        {/* Latest Activity */}
        <div className="bg-bgSoft rounded-[10px] p-6 border border-primary/20 hover:border-primary/40 transition-all duration-300">
          <h3 className="text-lg font-light text-white mb-4 border-b border-grey/20 pb-2">Latest Activity</h3>
          <div className="space-y-2">
            {data.projects.length > 0 && (
              <div className="text-sm">
                <span className="text-grey">Last project:</span>
                <br />
                <span className="text-white font-mono">{data.projects[0].title}</span>
              </div>
            )}
            {data.skills.length > 0 && (
              <div className="text-sm">
                <span className="text-grey">Last skill:</span>
                <br />
                <span className="text-white font-mono">{data.skills[data.skills.length - 1]?.skill}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <ContentWrapper>
        <Chart
          visits={data.visits}
          projectViews={data.views}
          analytics={data.analytics}
        />
      </ContentWrapper>
    </>
  )
}

export default Dashboard