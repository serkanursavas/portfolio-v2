// Go API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082'

export const fetchProjects = async (q, page) => {
  const ITEM_PER_PAGE = 5

  try {
    // Go API'den projects al
    const response = await fetch(`${API_BASE_URL}/api/v1/projects`, {
      cache: 'no-store'
    })
    if (!response.ok) {
      throw new Error('Failed to fetch projects from API')
    }
    
    const data = await response.json()
    let projects = (data.projects || []).map(project => ({
      ...project,
      _id: project.id, // API'den gelen id'yi _id olarak map et
      img: project.image, // image field'ını img olarak map et
      desc: project.description, // description'ı desc olarak map et
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updated_at || project.createdAt),
      // Tools field'ını da düzelt
      tools: project.tools || []
    }))
    
    // Client-side filtering ve pagination (basit implementasyon)
    if (q) {
      const regex = new RegExp(q, 'i')
      projects = projects.filter(project => regex.test(project.title))
    }
    
    // Sayfalama işlemi - eğer page parametresi varsa
    if (page) {
      const totalCount = projects.length
      const startIndex = (page - 1) * ITEM_PER_PAGE
      const paginatedProjects = projects.slice(startIndex, startIndex + ITEM_PER_PAGE)
      return { count: totalCount, projects: paginatedProjects }
    }
    
    // Sayfalama yoksa tüm projeleri dön
    return { count: projects.length, projects }
  } catch (error) {
    console.log(error)
    // Return mock data for build time
    return { count: 0, projects: [] }
  }
}

export const fetchProject = async id => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/projects/${id}`, {
      cache: 'no-store'
    })
    if (!response.ok) {
      throw new Error('Failed to fetch project from API')
    }
    
    const data = await response.json()
    const project = {
      ...data.project,
      _id: data.project.id,
      createdAt: new Date(data.project.createdAt),
      updatedAt: new Date(data.project.updated_at || data.project.createdAt)
    }
    return { project }
  } catch (error) {
    console.log(error)
    // Return mock data for build time
    return { 
      project: { 
        _id: id, 
        title: 'Loading...', 
        desc: 'Loading...', 
        tools: '[]',
        status: 'Draft',
        image: '',
        link: ''
      } 
    }
  }
}

export const fetchSkills = async (q, page) => {
  const ITEM_PER_PAGE = 5

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/skills`, {
      cache: 'no-store'
    })
    if (!response.ok) {
      throw new Error('Failed to fetch skills from API')
    }
    
    const data = await response.json()
    let skills = (data.skills || []).map(skill => ({
      ...skill,
      createdAt: new Date(skill.createdAt || Date.now())
    }))
    
    // Client-side filtering ve pagination
    if (q) {
      const regex = new RegExp(q, 'i')
      skills = skills.filter(skill => regex.test(skill.skill))
    }
    
    if (!page) {
      return { count: skills.length, skills }
    }
    
    const totalCount = skills.length
    const startIndex = (page - 1) * ITEM_PER_PAGE
    const paginatedSkills = skills.slice(startIndex, startIndex + ITEM_PER_PAGE)
    
    return { count: totalCount, skills: paginatedSkills }
  } catch (error) {
    console.log(error)
    // Return mock data for build time
    return { 
      count: 0, 
      skills: [] 
    }
  }
}

export const fetchVisits = async () => {
  try {
    const timestamp = Date.now()
    const response = await fetch(`${API_BASE_URL}/api/v1/analytics/all?t=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    if (!response.ok) {
      throw new Error('Failed to fetch visits from API')
    }
    
    const data = await response.json()
    
    // Backend'den daily_stats geliyorsa onu kullan, yoksa hesapla
    if (data.daily_stats && data.daily_stats.length > 0) {
      const visits = data.daily_stats.map(stat => {
        const date = new Date(stat.date)
        const dayName = date.toLocaleDateString('en', { weekday: 'short' })
        
        return {
          date: stat.date,
          dayName: dayName,
          visits: stat.site_visits || 0 // Gerçek günlük veriyi kullan
        }
      })
      
      return { visits }
    }
    
    // Fallback: Eğer daily_stats yoksa son 7 günü 0 ile doldur
    const visits = []
    const today = new Date()
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      
      const dayName = date.toLocaleDateString('en', { weekday: 'short' })
      const dateStr = date.toISOString().split('T')[0]
      
      visits.push({
        date: dateStr,
        dayName: dayName,
        visits: 0 // Gerçek veri olmadığında 0 göster
      })
    }
    
    return { visits }
  } catch (error) {
    console.log('Error fetching visits:', error)
    // Fallback data - hata durumunda 0 göster
    const visits = []
    const today = new Date()
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dayName = date.toLocaleDateString('en', { weekday: 'short' })
      const dateStr = date.toISOString().split('T')[0]
      
      visits.push({
        date: dateStr,
        dayName: dayName,
        visits: 0 // Hata durumunda 0 göster
      })
    }
    
    return { visits }
  }
}

export const fetchProjectsViews = async () => {
  try {
    const timestamp = Date.now()
    const response = await fetch(`${API_BASE_URL}/api/v1/analytics/all?t=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    if (!response.ok) {
      throw new Error('Failed to fetch project views from API')
    }
    
    const data = await response.json()
    
    // Backend'den daily_stats geliyorsa onu kullan
    if (data.daily_stats && data.daily_stats.length > 0) {
      const views = data.daily_stats.map(stat => {
        const date = new Date(stat.date)
        const dayName = date.toLocaleDateString('en', { weekday: 'short' })
        
        return {
          date: stat.date,
          dayName: dayName,
          views: stat.project_views || 0 // Gerçek günlük veriyi kullan
        }
      })
      
      return { views }
    }
    
    // Fallback: Eğer daily_stats yoksa son 7 günü 0 ile doldur
    const views = []
    const today = new Date()
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      
      const dayName = date.toLocaleDateString('en', { weekday: 'short' })
      const dateStr = date.toISOString().split('T')[0]
      
      views.push({
        date: dateStr,
        dayName: dayName,
        views: 0 // Gerçek veri olmadığında 0 göster
      })
    }
    
    return { views }
  } catch (error) {
    console.log('Error fetching project views:', error)
    // Fallback data - hata durumunda 0 göster
    const views = []
    const today = new Date()
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dayName = date.toLocaleDateString('en', { weekday: 'short' })
      const dateStr = date.toISOString().split('T')[0]
      
      views.push({
        date: dateStr,
        dayName: dayName,
        views: 0 // Hata durumunda 0 göster
      })
    }
    
    return { views }
  }
}

export const fetchDashboardStats = async () => {
  try {
    const timestamp = Date.now()
    const response = await fetch(`${API_BASE_URL}/api/v1/analytics/all?t=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    if (!response.ok) {
      throw new Error('Failed to fetch dashboard stats from API')
    }
    
    const analytics = await response.json()
    
    return {
      totalVisits: analytics.visits || 0,
      totalProjectViews: analytics.project_view || 0,
      totalBlogViews: analytics.blog_views || 0,
      analytics: analytics
    }
  } catch (error) {
    console.log('Error fetching dashboard stats:', error)
    // Fallback data
    return {
      totalVisits: 0,
      totalProjectViews: 0,
      totalBlogViews: 0,
      analytics: null
    }
  }
}
