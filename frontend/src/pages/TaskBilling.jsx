import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export default function TaskBilling() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState({}) // project_id -> project object
  const [selectedTasks, setSelectedTasks] = useState([])
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filterProject, setFilterProject] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterBilling, setFilterBilling] = useState('all') // all, billed, unbilled

  // Redirect if not project lead or super admin
  useEffect(() => {
    if (user && user.role !== 'project_lead' && user.role !== 'super_admin') {
      navigate('/projects')
    }
  }, [user, navigate])

  useEffect(() => {
    if (user && (user.role === 'project_lead' || user.role === 'super_admin')) {
      fetchTasks()
      fetchProjects()
    }
  }, [user])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const response = await api.get('/tasks/lead/all-tasks')
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

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedTasks(filteredTasks.map(t => t.id))
    } else {
      setSelectedTasks([])
    }
  }

  const handleSelectTask = (taskId) => {
    if (selectedTasks.includes(taskId)) {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId))
    } else {
      setSelectedTasks([...selectedTasks, taskId])
    }
  }

  const selectedTasksData = tasks.filter(t => selectedTasks.includes(t.id))

  if (user?.role !== 'project_lead' && user?.role !== 'super_admin') {
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
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Task Billing Management</h1>
        <p className="text-gray-600">View tasks, check billing status, and create invoices. Created invoices can be viewed and paid in the <strong>Invoices & Payments</strong> menu.</p>
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

      {/* Selection Bar */}
      {selectedTasks.length > 0 && (
        <div className="card shadow-md border-2 border-primary-200 bg-primary-50 mb-6">
          <div className="card-body py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-semibold text-primary-800">
                  {selectedTasks.length} task(s) selected
                </span>
                <span className="text-xs text-primary-600">
                  Total Billable Hours: {selectedTasksData.reduce((sum, task) => sum + (task.billable_hours || 0), 0).toFixed(2)} hrs
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedTasks([])}
                  className="btn btn-secondary text-sm py-1.5 px-3"
                >
                  Clear Selection
                </button>
                <button
                  onClick={() => setShowInvoiceModal(true)}
                  className="btn btn-primary text-sm py-1.5 px-3"
                >
                  <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Create Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tasks Table */}
      <div className="card shadow-lg border-0 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={filteredTasks.length > 0 && selectedTasks.length === filteredTasks.length && filteredTasks.every(t => selectedTasks.includes(t.id))}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                </th>
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
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No tasks found
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      selectedTasks.includes(task.id) ? 'bg-primary-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedTasks.includes(task.id)}
                        onChange={() => handleSelectTask(task.id)}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-primary-600">
                        {projects[task.project_id]?.name || `Project ${task.project_id}`}
                      </div>
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

      {/* Invoice Modal */}
      {showInvoiceModal && selectedTasksData.length > 0 && (
        <InvoiceModal
          selectedTasks={selectedTasksData}
          projects={projects}
          onClose={() => {
            setShowInvoiceModal(false)
            setSelectedTasks([])
          }}
          onSuccess={() => {
            setShowInvoiceModal(false)
            setSelectedTasks([])
            fetchTasks()
          }}
        />
      )}
    </div>
  )
}

// Invoice Modal Component
function InvoiceModal({ selectedTasks, projects, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    project_id: '',
    invoice_amount: '',
    invoice_date: new Date().toISOString().split('T')[0],
    notes: '',
    date_range_start: '',
    date_range_end: '',
  })
  const [loading, setLoading] = useState(false)

  // Group tasks by project
  const tasksByProject = {}
  selectedTasks.forEach(task => {
    if (!tasksByProject[task.project_id]) {
      tasksByProject[task.project_id] = []
    }
    tasksByProject[task.project_id].push(task)
  })

  // Set default project if only one project
  useEffect(() => {
    const projectIds = Object.keys(tasksByProject)
    if (projectIds.length === 1) {
      setFormData(prev => ({ ...prev, project_id: projectIds[0] }))
    }
  }, [selectedTasks])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.project_id) {
      toast.error('Please select a project')
      return
    }

    // Get tasks for selected project
    const projectTasks = tasksByProject[parseInt(formData.project_id)] || []
    if (projectTasks.length === 0) {
      toast.error('No tasks selected for this project')
      return
    }

    setLoading(true)
    try {
      const payload = {
        project_id: parseInt(formData.project_id),
        invoice_amount: parseFloat(formData.invoice_amount),
        invoice_date: new Date(formData.invoice_date).toISOString(),
        notes: formData.notes,
        date_range_start: formData.date_range_start
          ? new Date(formData.date_range_start).toISOString()
          : null,
        date_range_end: formData.date_range_end
          ? new Date(formData.date_range_end).toISOString()
          : null,
        task_ids: projectTasks.map(t => t.id),
      }
      await api.post('/payments/invoices', payload)
      toast.success('Invoice created successfully!')
      onSuccess()
    } catch (error) {
      console.error('Error creating invoice:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to create invoice'
      console.error('Full error response:', error.response?.data)
      toast.error(`Invoice creation failed: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  // Calculate total billable hours per project
  const getProjectTotalHours = (projectId) => {
    const projectTasks = tasksByProject[projectId] || []
    return projectTasks.reduce((sum, task) => sum + (task.billable_hours || 0), 0)
  }

  // Calculate total amount based on rate_per_hour and billable hours
  const calculateTotalAmount = () => {
    if (!formData.project_id) return 0
    const projectId = parseInt(formData.project_id)
    const project = projects[projectId]
    if (!project || !project.rate_per_hour) return 0
    
    const projectTasks = tasksByProject[projectId] || []
    const totalHours = projectTasks.reduce((sum, task) => sum + (task.billable_hours || 0), 0)
    return totalHours * parseFloat(project.rate_per_hour)
  }

  // Update amount when project or tasks change
  useEffect(() => {
    if (formData.project_id) {
      const calculatedAmount = calculateTotalAmount()
      setFormData(prev => ({ ...prev, invoice_amount: calculatedAmount > 0 ? calculatedAmount.toFixed(2) : '' }))
    }
  }, [formData.project_id, selectedTasks])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Create Invoice</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="card-body">
          {/* Project Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Project *
            </label>
            <select
              className="input"
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              required
            >
              <option value="">Choose a project...</option>
              {Object.keys(tasksByProject).map(projectId => (
                <option key={projectId} value={projectId}>
                  {projects[parseInt(projectId)]?.name || `Project ${projectId}`} ({tasksByProject[projectId].length} tasks)
                </option>
              ))}
            </select>
          </div>

          {/* Selected Tasks by Project */}
          {formData.project_id && (
            <div className="mb-6">
              <h4 className="text-sm font-bold text-gray-700 mb-3">
                Selected Tasks for {projects[parseInt(formData.project_id)]?.name || 'Project'}:
              </h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Task</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-700">Billable Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(tasksByProject[parseInt(formData.project_id)] || []).map((task) => (
                      <tr key={task.id}>
                        <td className="px-4 py-2">
                          <div className="font-medium text-gray-900">{task.title}</div>
                          {task.description && (
                            <div className="text-xs text-gray-500 mt-1">{task.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-2">
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
                        <td className="px-4 py-2 text-right">
                          {task.billable_hours !== null && task.billable_hours !== undefined ? (
                            <span className="font-semibold text-primary-600">
                              {task.billable_hours.toFixed(2)} hrs
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Not set</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                    <tr>
                      <td colSpan="2" className="px-4 py-3 text-right font-bold text-gray-700">
                        Total Billable Hours:
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-primary-600">
                        {getProjectTotalHours(parseInt(formData.project_id)).toFixed(2)} hrs
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                className="input bg-gray-50"
                value={formData.invoice_amount}
                readOnly
                placeholder="Calculated automatically"
              />
              <p className="mt-1 text-xs text-gray-500">
                {formData.project_id && projects[parseInt(formData.project_id)]?.rate_per_hour ? (
                  <>
                    Calculated: {getProjectTotalHours(parseInt(formData.project_id)).toFixed(2)} hrs × 
                    ₹{parseFloat(projects[parseInt(formData.project_id)].rate_per_hour).toFixed(2)}/hr = 
                    ₹{calculateTotalAmount().toFixed(2)}
                  </>
                ) : (
                  'Please set rate per hour for this project to calculate amount automatically'
                )}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Invoice Date *
              </label>
              <input
                type="date"
                required
                className="input"
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date Range Start
                </label>
                <input
                  type="date"
                  className="input"
                  value={formData.date_range_start}
                  onChange={(e) => setFormData({ ...formData, date_range_start: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date Range End
                </label>
                <input
                  type="date"
                  className="input"
                  value={formData.date_range_end}
                  onChange={(e) => setFormData({ ...formData, date_range_end: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                rows={3}
                className="input"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this invoice..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !formData.project_id}
              >
                {loading ? 'Creating...' : 'Create Invoice'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

