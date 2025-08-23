'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

const ProtectedRoute = ({ children }) => {
  const { authenticated, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Loading bittiğinde ve authenticated değilse login'e yönlendir
    if (!loading && !authenticated) {
      // Mevcut sayfa bilgisini saklayalım ki login'den sonra geri dönebilsin
      sessionStorage.setItem('redirectAfterLogin', pathname)
      router.push('/admin/login')
    }
  }, [authenticated, loading, router, pathname])

  // Loading göster
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bgPrimary">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Authenticated değilse boş döndür (redirect edilecek)
  if (!authenticated) {
    return null
  }

  // Authenticated ise children'ı göster
  return children
}

export default ProtectedRoute