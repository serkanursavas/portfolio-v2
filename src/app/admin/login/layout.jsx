'use client'

import { AuthProvider } from '../../../contexts/AuthContext'

export default function LoginLayout({ children }) {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#151c2c',
      color: 'white',
      fontFamily: 'system-ui, sans-serif'
    }}>
      {children}
    </div>
  )
}