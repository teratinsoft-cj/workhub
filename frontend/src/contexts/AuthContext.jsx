import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'

const AuthContext = createContext()

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me')
      setUser(response.data)
    } catch (error) {
      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']
    } finally {
      setLoading(false)
    }
  }

  const login = async (username, password) => {
    try {
      const formData = new FormData()
      formData.append('username', username)
      formData.append('password', password)
      
      const response = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      
      const { access_token } = response.data
      localStorage.setItem('token', access_token)
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      
      await fetchUser()
      toast.success('Login successful!')
      window.location.href = '/'
      return true
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed')
      return false
    }
  }

  const register = async (userData) => {
    try {
      await api.post('/auth/register', userData)
      toast.success('Registration successful! Your account is pending approval by a Super Admin. You will be able to login once approved.')
      window.location.href = '/login'
      return true
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed')
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
    window.location.href = '/login'
    toast.success('Logged out successfully')
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    fetchUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

