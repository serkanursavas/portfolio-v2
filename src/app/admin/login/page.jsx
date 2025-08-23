'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'

function Login() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login, authenticated } = useAuth()
  const router = useRouter()

  // Login component rendered

  // Eğer zaten authenticated ise admin paneline yönlendir
  useEffect(() => {
    if (authenticated) {
      const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/admin'
      sessionStorage.removeItem('redirectAfterLogin')
      router.push(redirectPath)
    }
  }, [authenticated, router])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await login(formData.username, formData.password)
    
    if (result.success) {
      const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/admin'
      sessionStorage.removeItem('redirectAfterLogin')
      router.push(redirectPath)
    } else {
      setError(result.error)
    }
    
    setLoading(false)
  }

  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  }

  const formContainerStyle = {
    maxWidth: '400px',
    width: '100%',
    padding: '32px',
    backgroundColor: '#182034',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  }

  const inputStyle = {
    width: '100%',
    padding: '12px',
    marginBottom: '16px',
    backgroundColor: '#151c2c',
    border: '1px solid #374151',
    borderRadius: '6px',
    color: 'white',
    fontSize: '14px'
  }

  const buttonStyle = {
    width: '100%',
    padding: '12px',
    backgroundColor: '#C778DD',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  }

  return (
    <div style={containerStyle}>
        <div style={formContainerStyle}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚡</div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
              Admin Panel
            </h2>
            <p style={{ color: '#b7bac1', fontSize: '14px' }}>Sign in to continue</p>
          </div>
          
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                backgroundColor: 'rgba(220, 38, 38, 0.2)',
                border: '1px solid rgba(220, 38, 38, 0.5)',
                color: '#fca5a5',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '16px',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}
            
            <div>
              <label style={{ display: 'block', color: '#b7bac1', fontSize: '14px', marginBottom: '8px' }}>
                Username
              </label>
              <input
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Enter username"
              />
            </div>
            
            <div>
              <label style={{ display: 'block', color: '#b7bac1', fontSize: '14px', marginBottom: '8px' }}>
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Enter password"
              />
            </div>

            <button type="submit" disabled={loading} style={buttonStyle}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
            
          </form>
        </div>
    </div>
  )
}

export default Login