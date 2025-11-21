import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function Timesheets() {
  const { user } = useAuth()
  const [timesheets, setTimesheets] = useState([])
  const [projects, setProjects] = useState([])
  const [projectsMap, setProjectsMap] = useState({})
  const [tasks, setTasks] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState('')
  const [formData, setFormData] = useState({
    project_id: '',
    task_id: '',
    date: new Date().toISOString().split('T')[0],
    hours: '',
    description: '',
  })

  useEffect(() => {
    fetchTimesheets()
    fetchProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      fetchTasks(selectedProject)
    }
  }, [selectedProject])

  const fetchTimesheets = async () => {
    try {
      const response = await api.get('/timesheets')
      setTimesheets(response.data)
    } catch (error) {
      toast.error('Failed to fetch timesheets')
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects')
      setProjects(response.data)
      const map = {}
      response.data.forEach(p => {
        map[p.id] = p.name
      })
      setProjectsMap(map)
    } catch (error) {
      toast.error('Failed to fetch projects')
    }
  }

  const fetchTasks = async (projectId) => {
    try {
      const response = await api.get(`/tasks/project/${projectId}`)
      setTasks(response.data)
    } catch (error) {
      toast.error('Failed to fetch tasks')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        project_id: parseInt(formData.project_id),
        task_id: formData.task_id ? parseInt(formData.task_id) : null,
        hours: parseFloat(formData.hours),
        date: new Date(formData.date).toISOString(),
      }
      await api.post('/timesheets', payload)
      toast.success('Timesheet created successfully!')
      setShowModal(false)
      setFormData({
        project_id: '',
        task_id: '',
        date: new Date().toISOString().split('T')[0],
        hours: '',
        description: '',
      })
      setSelectedProject('')
      fetchTimesheets()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create timesheet')
    }
  }

  const handleValidate = async (timesheetId, approved) => {
    try {
      await api.put(`/timesheets/${timesheetId}/validate`, null, {
        params: { approved },
      })
      toast.success(`Timesheet ${approved ? 'approved' : 'rejected'}`)
      fetchTimesheets()
    } catch (error) {
      toast.error('Failed to validate timesheet')
    }
  }

  const canValidate = user?.role === 'project_manager' || user?.role === 'project_lead'

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Timesheets</h1>
          <p className="mt-2 text-sm text-gray-600">
            Track your work hours and manage timesheets
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium"
        >
          + New Timesheet
        </button>
      </div>

      {timesheets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No timesheets found</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Task
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                {canValidate && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {timesheets.map((ts) => (
                <tr key={ts.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(ts.date), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {projectsMap[ts.project_id] || `Project #${ts.project_id}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ts.task?.title || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {ts.hours}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ts.user?.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        ts.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : ts.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {ts.status}
                    </span>
                  </td>
                  {canValidate && ts.status === 'pending' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleValidate(ts.id, true)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleValidate(ts.id, false)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Reject
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium mb-4">Create Timesheet</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Project
                </label>
                <select
                  required
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  value={formData.project_id}
                  onChange={(e) => {
                    setFormData({ ...formData, project_id: e.target.value, task_id: '' })
                    setSelectedProject(e.target.value)
                  }}
                >
                  <option value="">Select project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Task (Optional)
                </label>
                <select
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  value={formData.task_id}
                  onChange={(e) =>
                    setFormData({ ...formData, task_id: e.target.value })
                  }
                  disabled={!selectedProject}
                >
                  <option value="">No task</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  required
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Hours
                </label>
                <input
                  type="number"
                  step="0.25"
                  required
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  value={formData.hours}
                  onChange={(e) =>
                    setFormData({ ...formData, hours: e.target.value })
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
    </div>
  )
}

