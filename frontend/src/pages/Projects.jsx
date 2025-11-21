import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function Projects() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startup_company: '',
  })

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects')
      setProjects(response.data)
    } catch (error) {
      console.error('Error fetching projects:', error)
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.')
      } else {
        const errorMessage = error.response?.data?.detail || error.message || 'Failed to fetch projects'
        toast.error(errorMessage)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await api.post('/projects', formData)
      if (response.data) {
        toast.success('Project created successfully!')
        setShowModal(false)
        setFormData({ name: '', description: '', startup_company: '' })
        fetchProjects()
      }
    } catch (error) {
      console.error('Error creating project:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to create project'
      toast.error(errorMessage)
    }
  }

  const canCreate = user?.role === 'super_admin' || user?.role === 'project_manager' || user?.role === 'project_lead'

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your projects and track progress
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium"
          >
            + New Project
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No projects found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {project.name}
              </h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {project.description || 'No description'}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {project.startup_company}
                </span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    project.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {project.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Create New Project
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Project Name
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
                    Startup Company
                  </label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    value={formData.startup_company}
                    onChange={(e) =>
                      setFormData({ ...formData, startup_company: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    Create
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

