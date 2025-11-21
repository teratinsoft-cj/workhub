import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function ProjectDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [project, setProject] = useState(null)
  const [developers, setDevelopers] = useState([])
  const [tasks, setTasks] = useState([])
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showDeveloperModal, setShowDeveloperModal] = useState(false)
  const [availableDevelopers, setAvailableDevelopers] = useState([])
  const [taskForm, setTaskForm] = useState({ title: '', description: '', status: 'todo' })
  const [developerForm, setDeveloperForm] = useState({ developer_id: '', hourly_rate: '' })

  useEffect(() => {
    fetchProject()
    fetchDevelopers()
    fetchTasks()
    if (user?.role === 'project_manager' || user?.role === 'project_lead') {
      fetchAvailableDevelopers()
    }
  }, [id])

  const fetchProject = async () => {
    try {
      const response = await api.get(`/projects/${id}`)
      setProject(response.data)
    } catch (error) {
      toast.error('Failed to fetch project')
    }
  }

  const fetchDevelopers = async () => {
    try {
      const response = await api.get(`/developers/project/${id}`)
      setDevelopers(response.data)
    } catch (error) {
      toast.error('Failed to fetch developers')
    }
  }

  const fetchTasks = async () => {
    try {
      const response = await api.get(`/tasks/project/${id}`)
      setTasks(response.data)
    } catch (error) {
      toast.error('Failed to fetch tasks')
    }
  }

  const fetchAvailableDevelopers = async () => {
    try {
      const response = await api.get('/developers/available')
      setAvailableDevelopers(response.data)
    } catch (error) {
      toast.error('Failed to fetch available developers')
    }
  }

  const handleTaskSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/tasks', { ...taskForm, project_id: parseInt(id) })
      toast.success('Task created successfully!')
      setShowTaskModal(false)
      setTaskForm({ title: '', description: '', status: 'todo' })
      fetchTasks()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create task')
    }
  }

  const handleDeveloperSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/developers', {
        developer_id: parseInt(developerForm.developer_id),
        project_id: parseInt(id),
        hourly_rate: parseFloat(developerForm.hourly_rate),
      })
      toast.success('Developer added successfully!')
      setShowDeveloperModal(false)
      setDeveloperForm({ developer_id: '', hourly_rate: '' })
      fetchDevelopers()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add developer')
    }
  }

  const canManage = user?.role === 'project_manager' || user?.role === 'project_lead'

  if (!project) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          to="/projects"
          className="text-primary-600 hover:text-primary-500 mb-4 inline-block"
        >
          ← Back to Projects
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
        <p className="mt-2 text-sm text-gray-600">{project.description}</p>
        <div className="mt-4 flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            Company: {project.startup_company}
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Developers Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Developers</h2>
            {canManage && (
              <button
                onClick={() => setShowDeveloperModal(true)}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                + Add Developer
              </button>
            )}
          </div>
          {developers.length === 0 ? (
            <p className="text-gray-500 text-sm">No developers assigned</p>
          ) : (
            <div className="space-y-3">
              {developers.map((dev) => (
                <div
                  key={dev.id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded"
                >
                  <div>
                    <p className="font-medium">{dev.developer?.full_name}</p>
                    <p className="text-sm text-gray-500">{dev.developer?.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${dev.hourly_rate}/hr</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tasks Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Tasks</h2>
            {canManage && (
              <button
                onClick={() => setShowTaskModal(true)}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                + Add Task
              </button>
            )}
          </div>
          {tasks.length === 0 ? (
            <p className="text-gray-500 text-sm">No tasks created</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 bg-gray-50 rounded"
                >
                  <h3 className="font-medium">{task.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                  <span
                    className={`mt-2 inline-block px-2 py-1 rounded text-xs ${
                      task.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : task.status === 'in_progress'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium mb-4">Create Task</h3>
            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  value={taskForm.title}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, title: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  value={taskForm.description}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, description: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  value={taskForm.status}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, status: e.target.value })
                  }
                >
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Developer Modal */}
      {showDeveloperModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium mb-4">Add Developer</h3>
            <form onSubmit={handleDeveloperSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Developer
                </label>
                <select
                  required
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  value={developerForm.developer_id}
                  onChange={(e) =>
                    setDeveloperForm({ ...developerForm, developer_id: e.target.value })
                  }
                >
                  <option value="">Select developer</option>
                  {availableDevelopers.map((dev) => (
                    <option key={dev.id} value={dev.id}>
                      {dev.full_name} ({dev.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Hourly Rate ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  value={developerForm.hourly_rate}
                  onChange={(e) =>
                    setDeveloperForm({ ...developerForm, hourly_rate: e.target.value })
                  }
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDeveloperModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

