'use client'

import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext({})

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  // Token'ı localStorage'dan al (development için)
  const getToken = () => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('admin_token')
  }

  // Token'ı localStorage'a kaydet
  const setToken = (token) => {
    if (typeof window === 'undefined') return
    if (token) {
      localStorage.setItem('admin_token', token)
    } else {
      localStorage.removeItem('admin_token')
    }
  }

  // Token doğrulama
  const verifyToken = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUser({ username: data.username })
        setAuthenticated(true)
        return true
      } else {
        // Token geçersiz, temizle
        setToken(null)
        setUser(null)
        setAuthenticated(false)
        return false
      }
    } catch (error) {
      console.error('Token verification failed:', error)
      setToken(null)
      setUser(null)
      setAuthenticated(false)
      return false
    }
  }

  // Login fonksiyonu
  const login = async (username, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok) {
        setToken(data.token)
        setUser({ username })
        setAuthenticated(true)
        return { success: true, message: data.message }
      } else {
        return { success: false, error: data.error || 'Login failed' }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Network error occurred' }
    }
  }

  // Logout fonksiyonu
  const logout = async () => {
    try {
      const token = getToken()
      if (token) {
        // Backend'e logout isteği gönder
        await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Her durumda local state'i temizle
      setToken(null)
      setUser(null)
      setAuthenticated(false)
    }
  }

  // Auth state'ini kontrol et (sayfa yüklendiğinde)
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true)
      const token = getToken()
      
      if (token) {
        await verifyToken(token)
      } else {
        setAuthenticated(false)
      }
      
      setLoading(false)
    }

    initAuth()
  }, [])

  // API istekleri için token'lı fetch wrapper
  const authenticatedFetch = async (url, options = {}) => {
    const token = getToken()
    
    if (!token) {
      throw new Error('No authentication token available')
    }

    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }

    const response = await fetch(url, { ...options, ...defaultOptions })

    // Token geçersizse logout yap
    if (response.status === 401) {
      logout()
      throw new Error('Authentication expired')
    }

    return response
  }

  const value = {
    user,
    authenticated,
    loading,
    login,
    logout,
    verifyToken,
    authenticatedFetch,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Auth hook
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}