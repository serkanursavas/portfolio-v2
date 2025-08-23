'use client'

import React, { Suspense } from 'react'
import { AuthProvider } from '../../contexts/AuthContext'
import ProtectedRoute from '../../components/ProtectedRoute'
import Aside from '../../components/admin-ui/dashboard/aside/aside'
import Navbar from '../../components/admin-ui/dashboard/navbar/navbar'
import { usePathname } from 'next/navigation'

function Layout({ children }) {
  return (
    <AuthProvider>
      <LayoutContent>{children}</LayoutContent>
    </AuthProvider>
  )
}

function LayoutContent({ children }) {
  const pathname = usePathname()
  
  // Login sayfası için protection yok
  if (pathname === '/admin/login' || pathname === '/admin/login/') {
    return children
  }
  
  // Diğer admin sayfalar için protection var
  return (
    <ProtectedRoute>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </ProtectedRoute>
  )
}

function AdminLayoutContent({ children }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <div className="w-[200px] bg-bgSoft">
        <Aside />
      </div>
      <div className="flex-1 flex flex-col bg-bgPrimary">
        <Navbar />
        <main className="flex-1 p-5 overflow-y-auto">
          <Suspense fallback={<div>Loading...</div>}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  )
}

export default Layout