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

  // Project owners cannot access timesheets
  useEffect(() => {
    if (user?.role === 'project_owner') {
      window.location.href = '/projects'
    }
  }, [user])

  useEffect(() => {
    if (user?.role === 'project_owner') {
      return
    }
    fetchTimesheets()
    fetchProjects()
  }, [user])

  if (user?.role === 'project_owner') {
    return null
  }

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
        task_id: parseInt(formData.task_id),  // Now mandatory
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

  const canValidate = user?.role === 'project_lead'

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
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="empty-state-title">No timesheets found</p>
            <p className="empty-state-description">Timesheets will appear here once created</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Date</th>
                  <th className="table-header-cell">Project</th>
                  <th className="table-header-cell">Task</th>
                  <th className="table-header-cell">Hours</th>
                  <th className="table-header-cell">User</th>
                  <th className="table-header-cell">Status</th>
                  {canValidate && (
                    <th className="table-header-cell">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="table-body">
                {timesheets.map((ts) => (
                  <tr key={ts.id} className="table-row">
                    <td className="table-cell">
                      {format(new Date(ts.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="table-cell text-gray-500">
                      {projectsMap[ts.project_id] || `Project #${ts.project_id}`}
                    </td>
                    <td className="table-cell text-gray-500">
                      {ts.task?.title || 'N/A'}
                    </td>
                    <td className="table-cell">
                      {ts.hours}
                    </td>
                    <td className="table-cell text-gray-500">
                      {ts.user?.full_name}
                    </td>
                    <td className="table-cell">
                      <span
                        className={`badge ${
                          ts.status === 'approved'
                            ? 'badge-success'
                            : ts.status === 'rejected'
                            ? 'badge-danger'
                            : 'badge-warning'
                        }`}
                      >
                        {ts.status}
                      </span>
                    </td>
                    {canValidate && ts.status === 'pending' && (
                      <td className="table-cell">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleValidate(ts.id, true)}
                            className="btn btn-success text-sm py-1 px-3"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleValidate(ts.id, false)}
                            className="btn btn-danger text-sm py-1 px-3"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                  Task *
                </label>
                <select
                  required
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  value={formData.task_id}
                  onChange={(e) =>
                    setFormData({ ...formData, task_id: e.target.value })
                  }
                  disabled={!selectedProject}
                >
                  <option value="">Select task</option>
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

