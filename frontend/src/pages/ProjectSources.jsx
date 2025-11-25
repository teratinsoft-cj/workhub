import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function ProjectSources() {
  const { user } = useAuth()
  const [projectSources, setProjectSources] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingSource, setEditingSource] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    contact_no: '',
    email: '',
    address: '',
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchProjectSources()
  }, [])

  const fetchProjectSources = async () => {
    try {
      const response = await api.get('/project-sources')
      setProjectSources(response.data)
    } catch (error) {
      console.error('Error fetching project sources:', error)
      toast.error('Failed to fetch project sources')
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    // Email validation
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address'
      }
    }
    
    // Mobile number validation
    if (formData.contact_no && formData.contact_no.trim()) {
      // Remove spaces, dashes, and parentheses for validation
      const cleanedPhone = formData.contact_no.replace(/[\s\-\(\)]/g, '')
      // Allow exactly 10 digits
      const phoneRegex = /^\d{10}$/
      if (!phoneRegex.test(cleanedPhone)) {
        newErrors.contact_no = 'Please enter a valid mobile number (exactly 10 digits)'
      }
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
      if (editingSource) {
        await api.put(`/project-sources/${editingSource.id}`, formData)
        toast.success('Project source updated successfully!')
      } else {
        await api.post('/project-sources', formData)
        toast.success('Project source created successfully!')
      }
      setShowModal(false)
      setEditingSource(null)
      setFormData({ name: '', contact_no: '', email: '', address: '' })
      setErrors({})
      fetchProjectSources()
    } catch (error) {
      console.error('Error saving project source:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to save project source'
      toast.error(errorMessage)
    }
  }

  const handleEdit = (source) => {
    setEditingSource(source)
    setFormData({
      name: source.name,
      contact_no: source.contact_no || '',
      email: source.email || '',
      address: source.address || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (sourceId) => {
    if (!window.confirm('Are you sure you want to delete this project source?')) {
      return
    }
    try {
      await api.delete(`/project-sources/${sourceId}`)
      toast.success('Project source deleted successfully!')
      fetchProjectSources()
    } catch (error) {
      console.error('Error deleting project source:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete project source'
      toast.error(errorMessage)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingSource(null)
    setFormData({ name: '', contact_no: '', email: '', address: '' })
    setErrors({})
  }

  if (user?.role !== 'super_admin') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">You don't have access to this page</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Project Sources</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage project sources (startup companies)
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium"
        >
          + New Project Source
        </button>
      </div>

      {projectSources.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No project sources found</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Contact No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projectSources.map((source) => (
                <tr key={source.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {source.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {source.contact_no || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {source.email || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {source.address || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(source.created_at), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(source)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(source.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingSource ? 'Edit Project Source' : 'Create New Project Source'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Contact No
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g., 1234567890"
                    maxLength={10}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                      errors.contact_no ? 'border-red-300' : 'border-gray-300'
                    }`}
                    value={formData.contact_no}
                    onChange={(e) => {
                      // Only allow digits
                      const value = e.target.value.replace(/\D/g, '')
                      setFormData({ ...formData, contact_no: value })
                      if (errors.contact_no) {
                        setErrors({ ...errors, contact_no: '' })
                      }
                    }}
                  />
                  {errors.contact_no && (
                    <p className="mt-1 text-sm text-red-600">{errors.contact_no}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="e.g., contact@example.com"
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
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
                  <label className="block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <textarea
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    {editingSource ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

