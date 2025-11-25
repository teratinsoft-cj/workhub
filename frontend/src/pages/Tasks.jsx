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
      <div className="card mb-6">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
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
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
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
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Billable Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Billing Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
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
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/projects/${task.project_id}`}
                        className="text-sm font-semibold text-primary-600 hover:text-primary-700 hover:underline"
                      >
                        {projects[task.project_id]?.name || `Project ${task.project_id}`}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{task.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-md">
                        {task.description || <span className="text-gray-400 italic">No description</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-primary-600">
                        {task.billable_hours !== null && task.billable_hours !== undefined
                          ? `${task.billable_hours.toFixed(2)} hrs`
                          : <span className="text-gray-400">Not set</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

