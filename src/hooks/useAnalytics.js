'use client'

import { useEffect, useCallback, useRef } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082'

export const useAnalytics = () => {
  // Duplicate tracking'i önlemek için debounce
  const lastTrackingRef = useRef({})
  const projectTrackingRef = useRef({})
  
  // Site ziyaretini kaydet (sayfa yüklendiğinde)
  const trackPageVisit = useCallback(async (page = '/') => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/analytics/visit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page: page,
          duration: 0
        })
      })

      if (!response.ok) {
        console.warn('Failed to track page visit:', response.status)
      }
    } catch (error) {
      console.warn('Analytics tracking error:', error)
    }
  }, [])

  // Proje view'ını kaydet (GitHub/Live link tıklanması)
  const trackProjectView = useCallback(async (projectId, source = 'unknown') => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/projects/${projectId}/views`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: source // 'homepage', 'works_page', 'admin'
        })
      })

      if (!response.ok) {
        console.warn('Failed to track project view:', response.status)
      }
    } catch (error) {
      console.warn('Project view tracking error:', error)
    }
  }, [])

  // Site visits tracking (V1 compatibility)
  const trackSiteVisit = useCallback(async () => {
    try {
      // Duplicate tracking'i önle (1 saniye içinde aynı çağrı yapılmasın)
      const now = Date.now()
      if (lastTrackingRef.current.siteVisit && (now - lastTrackingRef.current.siteVisit) < 1000) {
        return
      }
      lastTrackingRef.current.siteVisit = now
      
      const response = await fetch(`${API_BASE_URL}/api/counter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        console.warn('Failed to track site visit:', response.status)
      }
    } catch (error) {
      console.warn('Site visit tracking error:', error)
    }
  }, [])

  // Project views tracking (V1 compatibility)
  const trackProjectViewLegacy = useCallback(async () => {
    try {
      // Duplicate tracking'i önle (3 saniye cooldown)
      const now = Date.now()
      if (lastTrackingRef.current.projectView && (now - lastTrackingRef.current.projectView) < 3000) {
        return
      }
      lastTrackingRef.current.projectView = now
      
      const response = await fetch(`${API_BASE_URL}/api/projectviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        console.warn('Failed to track project view')
      }
    } catch (error) {
      console.warn('Project view tracking error:', error)
    }
  }, [])

  return {
    trackPageVisit,
    trackProjectView,
    trackSiteVisit,
    trackProjectViewLegacy
  }
}

// HOC: Sayfa ziyaretini otomatik track et
export const withPageTracking = (WrappedComponent, pageName) => {
  return function TrackedComponent(props) {
    const { trackPageVisit, trackSiteVisit } = useAnalytics()

    useEffect(() => {
      // Session ID initialize et
      if (typeof window !== 'undefined') {
        let sessionId = sessionStorage.getItem('analytics_session_id')
        if (!sessionId) {
          sessionId = Date.now().toString()
          sessionStorage.setItem('analytics_session_id', sessionId)
        }
      }
      
      // Sayfa yüklendiğinde hem page visit hem site visit track et
      trackPageVisit(pageName)
      trackSiteVisit()
    }, [trackPageVisit, trackSiteVisit])

    return <WrappedComponent {...props} />
  }
}