import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export default function CreateUser() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'developer',
    is_approved: true,
  })
  const [errors, setErrors] = useState({})

  if (user?.role !== 'super_admin') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">You don't have access to this page</p>
      </div>
    )
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      const userData = {
        full_name: formData.full_name,
        email: formData.email,
        username: formData.username,
        password: formData.password,
        role: formData.role,
      }

      await api.post('/auth/create-user', userData)
      toast.success('User created successfully!')
      
      // Reset form
      setFormData({
        full_name: '',
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        role: 'developer',
        is_approved: true,
      })
      setErrors({})
      
      // Optionally navigate to user approvals page
      // navigate('/user-approvals')
    } catch (error) {
      console.error('Error creating user:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to create user'
      toast.error(errorMessage)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New User</h1>
        <p className="mt-2 text-sm text-gray-600">
          Create a new user account. Users created by Super Admin are automatically approved.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              required
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                errors.full_name ? 'border-red-500' : 'border-gray-300'
              }`}
              value={formData.full_name}
              onChange={(e) => {
                setFormData({ ...formData, full_name: e.target.value })
                if (errors.full_name) {
                  setErrors({ ...errors, full_name: '' })
                }
              }}
            />
            {errors.full_name && (
              <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              required
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value })
                if (errors.email) {
                  setErrors({ ...errors, email: '' })
                }
              }}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username *
            </label>
            <input
              type="text"
              required
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                errors.username ? 'border-red-500' : 'border-gray-300'
              }`}
              value={formData.username}
              onChange={(e) => {
                setFormData({ ...formData, username: e.target.value })
                if (errors.username) {
                  setErrors({ ...errors, username: '' })
                }
              }}
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role *
            </label>
            <select
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="developer">Developer</option>
              <option value="project_lead">Project Lead</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Note: Super Admin role cannot be created through this interface.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password *
            </label>
            <input
              type="password"
              required
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value })
                if (errors.password) {
                  setErrors({ ...errors, password: '' })
                }
              }}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password *
            </label>
            <input
              type="password"
              required
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
              }`}
              value={formData.confirmPassword}
              onChange={(e) => {
                setFormData({ ...formData, confirmPassword: e.target.value })
                if (errors.confirmPassword) {
                  setErrors({ ...errors, confirmPassword: '' })
                }
              }}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Users created by Super Admin are automatically approved and can log in immediately.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/user-approvals')}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

