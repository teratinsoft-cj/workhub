import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useNavigate, Link } from 'react-router-dom'

export default function Tasks() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState({}) // project_id -> project object
  const [loading, setLoading] = useState(true)
  const [filterProject, setFilterProject] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterBilling, setFilterBilling] = useState('all') // all, billed, unbilled
  const [showDescriptionModal, setShowDescriptionModal] = useState(false)
  const [selectedTaskDescription, setSelectedTaskDescription] = useState(null)

  // Redirect if not project owner or super admin
  useEffect(() => {
    if (user && user.role !== 'project_owner' && user.role !== 'super_admin') {
      navigate('/projects')
    }
  }, [user, navigate])

  useEffect(() => {
    if (user && (user.role === 'project_owner' || user.role === 'super_admin')) {
      fetchTasks()
      fetchProjects()
    }
  }, [user])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const response = await api.get('/tasks/owner/all-tasks')
      setTasks(response.data)
    } catch (error) {
      console.error('Error fetching tasks:', error)
      toast.error('Failed to fetch tasks')
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects')
      const projectsMap = {}
      response.data.forEach(project => {
        projectsMap[project.id] = project
      })
      setProjects(projectsMap)
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (filterProject !== 'all' && task.project_id !== parseInt(filterProject)) {
      return false
    }
    if (filterStatus !== 'all' && task.status !== filterStatus) {
      return false
    }
    if (filterBilling === 'billed' && !task.is_paid) {
      return false
    }
    if (filterBilling === 'unbilled' && task.is_paid) {
      return false
    }
    return true
  })

  if (user?.role !== 'project_owner' && user?.role !== 'super_admin') {
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Get unique project IDs for filter
  const projectIds = [...new Set(tasks.map(t => t.project_id))]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Tasks</h1>
        <p className="text-gray-600 text-lg">
          View all tasks across your projects with billing status
        </p>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="card-body">
          <div className="filter-grid">
            <div className="form-group">
              <label className="form-label">
                Filter by Project
              </label>
              <select
                className="input"
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
              >
                <option value="all">All Projects</option>
                {projectIds.map(projectId => (
                  <option key={projectId} value={projectId}>
                    {projects[projectId]?.name || `Project ${projectId}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">
                Filter by Status
              </label>
              <select
                className="input"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="testing">Testing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">
                Filter by Billing Status
              </label>
              <select
                className="input"
                value={filterBilling}
                onChange={(e) => setFilterBilling(e.target.value)}
              >
                <option value="all">All</option>
                <option value="billed">Billed</option>
                <option value="unbilled">Unbilled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="card shadow-lg border-0 bg-white overflow-hidden">
        <div className="table-wrapper">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">
                  Project
                </th>
                <th className="table-header-cell">
                  Task
                </th>
                <th className="table-header-cell">
                  Status
                </th>
                <th className="table-header-cell">
                  Billable Hours
                </th>
                <th className="table-header-cell">
                  Billing Status
                </th>
                <th className="table-header-cell w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="table-body">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-cell text-center py-12">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-lg font-medium mb-1">No tasks found</p>
                      <p className="text-gray-400 text-sm">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="table-row"
                  >
                    <td className="table-cell">
                      <Link
                        to={`/projects/${task.project_id}`}
                        className="text-sm font-semibold text-primary-600 hover:text-primary-700 hover:underline"
                      >
                        {projects[task.project_id]?.name || `Project ${task.project_id}`}
                      </Link>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm font-semibold text-gray-900 break-words whitespace-normal">{task.title}</div>
                    </td>
                    <td className="table-cell">
                      <span
                        className={`badge ${
                          task.status === 'completed'
                            ? 'badge-success'
                            : task.status === 'in_progress'
                            ? 'badge-warning'
                            : task.status === 'testing'
                            ? 'badge-primary'
                            : 'badge-gray'
                        }`}
                      >
                        {task.status?.charAt(0).toUpperCase() + task.status?.slice(1).replace('_', ' ')}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm font-semibold text-primary-600">
                        {task.billable_hours !== null && task.billable_hours !== undefined
                          ? `${task.billable_hours.toFixed(2)} hrs`
                          : <span className="text-gray-400">Not set</span>}
                      </div>
                    </td>
                    <td className="table-cell">
                      {task.is_paid ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Billed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Unbilled
                        </span>
                      )}
                    </td>
                    <td className="table-cell">
                      {task.description && (
                        <button
                          onClick={() => {
                            setSelectedTaskDescription({ title: task.title, description: task.description })
                            setShowDescriptionModal(true)
                          }}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200"
                          title="View description"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Description View Modal */}
      {showDescriptionModal && selectedTaskDescription && (
        <div className="modal-overlay" onClick={() => setShowDescriptionModal(false)}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Task Description</h3>
                <button
                  onClick={() => setShowDescriptionModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="card-body">
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Task:</h4>
                <p className="text-lg font-bold text-gray-900">{selectedTaskDescription.title}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Description:</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap break-words leading-relaxed">
                  {selectedTaskDescription.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

