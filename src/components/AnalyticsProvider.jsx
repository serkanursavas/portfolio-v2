'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAnalytics } from '@/hooks/useAnalytics'

export default function AnalyticsProvider() {
  const pathname = usePathname()
  const { trackPageVisit, trackSiteVisit } = useAnalytics()

  useEffect(() => {
    // Admin sayfalarında tracking yapma
    if (pathname?.startsWith('/admin')) {
      return
    }

    // Sadece site visit track et (V1 API uyumluluğu için)
    trackSiteVisit()
  }, [pathname, trackSiteVisit])

  return null // Bu component görsel bir şey render etmiyor
}