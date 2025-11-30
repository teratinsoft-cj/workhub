import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
// import { format } from 'date-fns' // Removed unused import

export default function ProjectDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [project, setProject] = useState(null)
  const [developers, setDevelopers] = useState([])
  const [tasks, setTasks] = useState([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showDeveloperModal, setShowDeveloperModal] = useState(false)
  const [availableDevelopers, setAvailableDevelopers] = useState([])
  const [editingTask, setEditingTask] = useState(null)
  const [taskForm, setTaskForm] = useState({ title: '', description: '', status: 'todo', estimation_hours: '' })
  const [developerForm, setDeveloperForm] = useState({ developer_id: '', hourly_rate: '' })
  const [aiRefining, setAiRefining] = useState({ title: false, description: false })
  const [activeTab, setActiveTab] = useState('developers') // 'developers' or 'tasks'
  const [showRateModal, setShowRateModal] = useState(false)
  const [ratePerHour, setRatePerHour] = useState('')
  const [showAiReviewModal, setShowAiReviewModal] = useState(false)
  const [aiReviewData, setAiReviewData] = useState({ field: null, original: '', refined: '' })

  // Developers should not access project detail pages
  useEffect(() => {
    if (user?.role === 'developer') {
      // Redirect to My Tasks if developer tries to access project details
      window.location.href = '/my-tasks'
    }
  }, [user])

  if (user?.role === 'developer') {
    return null
  }

  useEffect(() => {
    fetchProject()
    // Project owners don't see developers
    if (user?.role !== 'project_owner') {
      fetchDevelopers()
      if (user?.role === 'super_admin' || user?.role === 'project_lead') {
        fetchAvailableDevelopers()
      }
    } else {
      // Set default tab to tasks for project owners
      setActiveTab('tasks')
    }
    fetchTasks()
  }, [id, user])

  const fetchProject = async () => {
    try {
      const response = await api.get(`/projects/${id}`)
      setProject(response.data)
      if (response.data.rate_per_hour !== null && response.data.rate_per_hour !== undefined) {
        setRatePerHour(response.data.rate_per_hour.toString())
      }
    } catch (error) {
      toast.error('Failed to fetch project')
    }
  }

  const handleUpdateRatePerHour = async () => {
    try {
      const rateValue = ratePerHour ? parseFloat(ratePerHour) : null
      if (rateValue !== null && (isNaN(rateValue) || rateValue < 0)) {
        toast.error('Please enter a valid rate (must be a positive number)')
        return
      }
      
      // Update project with rate_per_hour
      const projectData = {
        ...project,
        rate_per_hour: rateValue
      }
      
      await api.put(`/projects/${id}`, projectData)
      toast.success('Rate per hour updated successfully!')
      setShowRateModal(false)
      fetchProject()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update rate per hour')
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

  const handleAssignDeveloper = async (taskId, developerId) => {
    try {
      await api.post(`/tasks/${taskId}/assign-developer?developer_id=${developerId}`)
      toast.success('Developer assigned to task')
      fetchTasks()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign developer')
    }
  }

  const handleUnassignDeveloper = async (taskId, developerId) => {
    try {
      await api.delete(`/tasks/${taskId}/assign-developer/${developerId}`)
      toast.success('Developer unassigned from task')
      fetchTasks()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to unassign developer')
    }
  }

  const fetchTasks = async () => {
    try {
      setLoadingTasks(true)
      const response = await api.get(`/tasks/project/${id}`)
      console.log('Fetched tasks:', response.data) // Debug log
      setTasks(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Error fetching tasks:', error) // Debug log
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to fetch tasks'
      toast.error(errorMessage)
      setTasks([]) // Ensure tasks is always an array
    } finally {
      setLoadingTasks(false)
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
      const taskData = {
        ...taskForm,
        project_id: parseInt(id),
        estimation_hours: parseFloat(taskForm.estimation_hours)  // Mandatory
      }
      
      if (editingTask) {
        await api.put(`/tasks/${editingTask.id}`, taskData)
        toast.success('Task updated successfully!')
      } else {
        await api.post('/tasks', taskData)
        toast.success('Task created successfully!')
      }
      
      setShowTaskModal(false)
      setEditingTask(null)
      setTaskForm({ title: '', description: '', status: 'todo', estimation_hours: '' })
      fetchTasks()
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${editingTask ? 'update' : 'create'} task`)
    }
  }

  const handleEditTask = (task) => {
    setEditingTask(task)
    setTaskForm({
      title: task.title,
      description: task.description || '',
      status: task.status || 'todo',
      estimation_hours: task.estimation_hours || ''
    })
    setShowTaskModal(true)
  }

  const handleCloseTaskModal = () => {
    setShowTaskModal(false)
    setEditingTask(null)
    setTaskForm({ title: '', description: '', status: 'todo', estimation_hours: '' })
    setAiRefining({ title: false, description: false })
  }

  const handleRefineWithAI = async (field) => {
    try {
      setAiRefining(prev => ({ ...prev, [field]: true }))
      
      const requestData = {}
      let originalValue = ''
      
      if (field === 'title' && taskForm.title) {
        requestData.title = taskForm.title
        originalValue = taskForm.title
      } else if (field === 'description' && taskForm.description) {
        requestData.description = taskForm.description
        originalValue = taskForm.description
      } else {
        toast.error(`Please enter a ${field} first`)
        setAiRefining(prev => ({ ...prev, [field]: false }))
        return
      }

      const response = await api.post('/ai/refine-task', requestData)
      
      let refinedValue = ''
      if (field === 'title' && response.data.refined_title) {
        refinedValue = response.data.refined_title
      } else if (field === 'description' && response.data.refined_description) {
        refinedValue = response.data.refined_description
      }
      
      if (refinedValue) {
        // Show review modal instead of directly updating
        setAiReviewData({ field, original: originalValue, refined: refinedValue })
        setShowAiReviewModal(true)
      } else {
        toast.error('No refined content received from AI')
      }
    } catch (error) {
      console.error('Error refining with AI:', error)
      const errorMessage = error.response?.data?.detail || 'Failed to refine with AI'
      toast.error(errorMessage)
    } finally {
      setAiRefining(prev => ({ ...prev, [field]: false }))
    }
  }

  const handleAcceptAiRefinement = () => {
    if (aiReviewData.field === 'title') {
      setTaskForm(prev => ({ ...prev, title: aiReviewData.refined }))
      toast.success('Title updated with AI refinement!')
    } else if (aiReviewData.field === 'description') {
      setTaskForm(prev => ({ ...prev, description: aiReviewData.refined }))
      toast.success('Description updated with AI refinement!')
    }
    setShowAiReviewModal(false)
    setAiReviewData({ field: null, original: '', refined: '' })
  }

  const handleRejectAiRefinement = () => {
    setShowAiReviewModal(false)
    setAiReviewData({ field: null, original: '', refined: '' })
    toast.info('AI refinement rejected')
  }

  const handleDeveloperSubmit = async (e) => {
    e.preventDefault()
    
    // Validate form data
    if (!developerForm.developer_id || !developerForm.hourly_rate) {
      toast.error('Please fill in all fields')
      return
    }

    // Check if token exists before making request
    const token = localStorage.getItem('token')
    if (!token) {
      toast.error('Your session has expired. Please log in again.')
      setTimeout(() => {
        window.location.href = '/login'
      }, 1500)
      return
    }

    try {
      const response = await api.post('/developers', {
        developer_id: parseInt(developerForm.developer_id),
        project_id: parseInt(id),
        hourly_rate: parseFloat(developerForm.hourly_rate),
      })
      
      if (response.data) {
        toast.success('Developer added successfully!')
        setShowDeveloperModal(false)
        setDeveloperForm({ developer_id: '', hourly_rate: '' })
        fetchDevelopers()
      }
    } catch (error) {
      console.error('Error adding developer:', error)
      console.error('Error response:', error.response)
      
      // Handle 401 errors with a user-friendly message
      if (error.response?.status === 401) {
        toast.error('Your session has expired. Please log in again.')
        // Let the interceptor handle the redirect after a short delay
        return
      }
      
      // Handle 403 errors (permission denied)
      if (error.response?.status === 403) {
        toast.error(error.response?.data?.detail || 'You do not have permission to perform this action')
        return
      }
      
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to add developer'
      toast.error(errorMessage)
    }
  }

  const handleUpdateTaskHours = async (taskId, billableHours, productivityHours, trackSummary) => {
    try {
      // billableHours and productivityHours are already parsed or null at this point
      await api.put(`/tasks/${taskId}/hours`, {
        billable_hours: billableHours,
        productivity_hours: productivityHours,
        track_summary: trackSummary,
      })
      toast.success('Task hours updated successfully!')
      // Refresh tasks to show updated values immediately
      await fetchTasks()
    } catch (error) {
      console.error('Error updating task hours:', error)
      toast.error(error.response?.data?.detail || 'Failed to update task hours')
    }
  }

  const canManage = user?.role === 'super_admin' || user?.role === 'project_lead'
  const isProjectLead = user?.role === 'project_lead'

  if (!project) {
    return <div>Loading...</div>
  }

  return (
    <>
    <div>
      {/* Back Link */}
      <Link
        to="/projects"
        className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6 font-medium transition-colors"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Projects
      </Link>

      {/* Project Header Card */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{project.name}</h1>
              <p className="text-gray-600 text-lg">{project.description || 'No description provided'}</p>
            </div>
            <span
              className={`badge ${
                project.status === 'ACTIVE' || project.status === 'active'
                  ? 'badge-success'
                  : project.status === 'OPEN' || project.status === 'open'
                  ? 'badge-primary'
                  : project.status === 'HOLD' || project.status === 'hold'
                  ? 'badge-warning'
                  : project.status === 'CLOSED' || project.status === 'closed'
                  ? 'badge-gray'
                  : 'badge-gray'
              }`}
            >
              {project.status?.charAt(0).toUpperCase() + project.status?.slice(1).toLowerCase()}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div className="space-y-2">
              {project.project_source && (
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="font-medium text-gray-700">Source:</span>
                  <span className="ml-1">{project.project_source.name}</span>
                </div>
              )}
              {project.project_owner && (
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="font-medium text-gray-700">Owner:</span>
                  <span className="ml-1">{project.project_owner.full_name}</span>
                </div>
              )}
              {(isProjectLead || user?.role === 'super_admin') && (
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium text-gray-700">Rate/Hour:</span>
                  <span className="ml-1 font-semibold text-primary-600">
                    {project.rate_per_hour !== null && project.rate_per_hour !== undefined
                      ? `₹${parseFloat(project.rate_per_hour).toFixed(2)}`
                      : 'Not set'}
                  </span>
                  <button
                    onClick={() => {
                      setRatePerHour(project.rate_per_hour !== null && project.rate_per_hour !== undefined ? project.rate_per_hour.toString() : '')
                      setShowRateModal(true)
                    }}
                    className="ml-2 text-primary-600 hover:text-primary-700 text-xs font-medium"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-medium text-gray-700">Start:</span>
                <span className="ml-1">{new Date(project.start_date).toLocaleDateString()}</span>
              </div>
              {project.deadline && (
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium text-gray-700">Deadline:</span>
                  <span className="ml-1">{new Date(project.deadline).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
          
          {(project.status === 'HOLD' || project.status === 'hold') && project.hold_reason && (
            <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
              <p className="text-sm font-semibold text-yellow-800 mb-1">Hold Reason</p>
              <p className="text-sm text-yellow-700">{project.hold_reason}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs for Developers and Tasks */}
      <div className="bg-white rounded-lg shadow">
        {/* Tab Headers */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {user?.role !== 'project_owner' && (
              <button
                onClick={() => setActiveTab('developers')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'developers'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Developers ({developers.length})
              </button>
            )}
            <button
              onClick={() => setActiveTab('tasks')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tasks'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Tasks ({tasks.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="card-body">
          {activeTab === 'developers' && user?.role !== 'project_owner' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Developers</h2>
                {canManage && (
                  <button
                    onClick={() => setShowDeveloperModal(true)}
                    className="btn btn-primary"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Developer
                  </button>
                )}
              </div>
              {developers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-base font-medium mb-1">No developers assigned</p>
                  {canManage && (
                    <p className="text-sm text-gray-400">Click "Add Developer" to assign developers to this project</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {developers.map((dev) => (
                    <div
                      key={dev.id}
                      className="card hover:shadow-medium transition-all duration-300"
                    >
                      <div className="card-body">
                        <div className="flex items-center mb-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold mr-3">
                            {dev.developer?.full_name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{dev.developer?.full_name}</p>
                            <p className="text-sm text-gray-500">{dev.developer?.email}</p>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-gray-100">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 font-medium">Hourly Rate</span>
                            <span className="font-bold text-primary-600 text-lg">₹{dev.hourly_rate}/hr</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
                {canManage && (
                  <button
                    onClick={() => {
                      setEditingTask(null)
                      setTaskForm({ title: '', description: '', status: 'todo', estimation_hours: '' })
                      setShowTaskModal(true)
                    }}
                    className="btn btn-primary"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Task
                  </button>
                )}
              </div>
              {loadingTasks ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-sm">Loading tasks...</p>
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-sm mb-2">No tasks created</p>
                  {canManage && (
                    <p className="text-xs text-gray-400">Click "Add Task" to create tasks for this project</p>
                  )}
                </div>
              ) : user?.role === 'project_owner' ? (
                // List/Table view for project owners
                <div className="space-y-4">
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
                              Billed
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {tasks.map((task) => (
                            <tr 
                              key={task.id} 
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-semibold text-primary-600">{project?.name || 'N/A'}</div>
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
                                {task.is_paid ? (
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Yes
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    No
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                // Card view for project leads and super admins
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tasks.map((task) => (
                    <TaskCard
                      key={`task-${task.id}-${task.billable_hours}-${task.productivity_hours}`}
                      task={task}
                      isProjectLead={isProjectLead}
                      canManage={canManage}
                      availableDevelopers={developers}
                      onUpdateHours={handleUpdateTaskHours}
                      onEdit={handleEditTask}
                      onAssignDeveloper={handleAssignDeveloper}
                      onUnassignDeveloper={handleUnassignDeveloper}
                      />
                    ))}
                  </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={handleCloseTaskModal}>
          <div className="modal-content max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">{editingTask ? 'Edit Task' : 'Create Task'}</h3>
                <button
                  onClick={handleCloseTaskModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="card-body">
              <form onSubmit={handleTaskSubmit} className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Title *
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRefineWithAI('title')}
                      disabled={aiRefining.title || !taskForm.title}
                      className="text-xs btn btn-sm btn-outline-primary flex items-center gap-1"
                      title="Refine title with AI"
                    >
                      {aiRefining.title ? (
                        <>
                          <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Refining...
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          AI Refine
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    className="input"
                    value={taskForm.title}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, title: e.target.value })
                    }
                    placeholder="Enter task title"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Description
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRefineWithAI('description')}
                      disabled={aiRefining.description || !taskForm.description}
                      className="text-xs btn btn-sm btn-outline-primary flex items-center gap-1"
                      title="Refine description with AI"
                    >
                      {aiRefining.description ? (
                        <>
                          <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Refining...
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          AI Refine
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    className="input resize-y"
                    value={taskForm.description}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, description: e.target.value })
                    }
                    placeholder="Enter task description (supports multiple lines)"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Estimation Hours *
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      required
                      className="input"
                      value={taskForm.estimation_hours}
                      onChange={(e) =>
                        setTaskForm({ ...taskForm, estimation_hours: e.target.value })
                      }
                      placeholder="Enter estimated hours"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      className="input"
                      value={taskForm.status}
                      onChange={(e) =>
                        setTaskForm({ ...taskForm, status: e.target.value })
                      }
                    >
                      <option value="todo">Todo</option>
                      <option value="in_progress">In Progress</option>
                      <option value="testing">Testing</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCloseTaskModal}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    {editingTask ? 'Update Task' : 'Create Task'}
                  </button>
                </div>
              </form>
            </div>
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
                  Hourly Rate (₹)
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


      {/* AI Review Modal */}
      {showAiReviewModal && (
        <div className="modal-overlay" onClick={handleRejectAiRefinement}>
          <div className="modal-content max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  Review AI Refinement - {aiReviewData.field === 'title' ? 'Title' : aiReviewData.field === 'description' ? 'Description' : 'Track Summary'}
                </h3>
                <button
                  onClick={handleRejectAiRefinement}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Original Content
                  </label>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiReviewData.original || '(empty)'}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    AI Refined Content
                  </label>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiReviewData.refined}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-4">
                <button
                  onClick={handleRejectAiRefinement}
                  className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={handleAcceptAiRefinement}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  Accept & Use
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rate Per Hour Modal */}
      {showRateModal && (
        <div className="modal-overlay" onClick={() => setShowRateModal(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Set Rate Per Hour</h3>
                <button
                  onClick={() => setShowRateModal(false)}
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Rate Per Hour (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input"
                  value={ratePerHour}
                  onChange={(e) => setRatePerHour(e.target.value)}
                  placeholder="Enter rate per hour (e.g., 1500.00)"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This rate will be used for calculating invoice amounts based on billable hours
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowRateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateRatePerHour}
                  className="btn btn-primary"
                >
                  Save Rate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}

// Task Card Component
function TaskCard({ task, isProjectLead, canManage, availableDevelopers, onUpdateHours, onEdit, onAssignDeveloper, onUnassignDeveloper }) {
  const { user } = useAuth()
  const [showHoursModal, setShowHoursModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [billableHours, setBillableHours] = useState('')
  const [productivityHours, setProductivityHours] = useState('')
  const [trackSummary, setTrackSummary] = useState('')
  const [selectedDeveloperId, setSelectedDeveloperId] = useState('')
  const [timesheets, setTimesheets] = useState([])
  const [loadingTimesheets, setLoadingTimesheets] = useState(false)
  const [refiningTrackSummary, setRefiningTrackSummary] = useState(false)
  const [showTrackSummaryReviewModal, setShowTrackSummaryReviewModal] = useState(false)
  const [trackSummaryReviewData, setTrackSummaryReviewData] = useState({ original: '', refined: '' })
  
  // Safety check for task
  if (!task) {
    return null
  }
  
  // Fetch timesheets when hours modal opens
  useEffect(() => {
    if (showHoursModal && isProjectLead) {
      fetchTimesheets()
    }
  }, [showHoursModal, task.id, isProjectLead])

  // Update state when task changes or modal opens
  useEffect(() => {
    if (showHoursModal) {
      setBillableHours(task.billable_hours !== null && task.billable_hours !== undefined ? task.billable_hours.toString() : '')
      setProductivityHours(task.productivity_hours !== null && task.productivity_hours !== undefined ? task.productivity_hours.toString() : '')
      // Set track_summary, defaulting to title + description if track_summary is empty
      if (task.track_summary) {
        setTrackSummary(task.track_summary)
      } else {
        const summaryParts = []
        if (task.title) summaryParts.push(task.title)
        if (task.description) summaryParts.push(task.description)
        setTrackSummary(summaryParts.join('\n\n'))
      }
    }
  }, [task.billable_hours, task.productivity_hours, task.track_summary, task.title, task.description, showHoursModal])

  const fetchTimesheets = async () => {
    try {
      setLoadingTimesheets(true)
      const response = await api.get(`/timesheets?task_id=${task.id}`)
      setTimesheets(response.data || [])
    } catch (error) {
      console.error('Error fetching timesheets:', error)
      setTimesheets([])
    } finally {
      setLoadingTimesheets(false)
    }
  }
  
  const assignedDeveloperIds = task.assigned_developer_ids || []
  // Get developers from the project's developer list
  const projectDevelopers = (availableDevelopers || []).map(dp => dp?.developer).filter(Boolean)
  
  const assignedDevelopers = projectDevelopers
    .filter(dev => assignedDeveloperIds.includes(dev.id))
  
  // For single developer assignment, show all developers (including currently assigned one for replacement)
  const unassignedDevelopers = projectDevelopers
  
  const handleAssign = () => {
    if (selectedDeveloperId) {
      onAssignDeveloper(task.id, parseInt(selectedDeveloperId))
      setShowAssignModal(false)
      setSelectedDeveloperId('')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Convert empty strings to null, and parse valid numbers
    const billableValue = billableHours.trim() === '' ? null : (isNaN(parseFloat(billableHours)) ? null : parseFloat(billableHours))
    const productivityValue = productivityHours.trim() === '' ? null : (isNaN(parseFloat(productivityHours)) ? null : parseFloat(productivityHours))
    const trackSummaryValue = trackSummary.trim() === '' ? null : trackSummary.trim()
    onUpdateHours(task.id, billableValue, productivityValue, trackSummaryValue)
    setShowHoursModal(false)
  }

  const handleRefineTrackSummary = async () => {
    if (!trackSummary) {
      toast.error('Please enter a track summary first')
      return
    }

    try {
      setRefiningTrackSummary(true)
      const response = await api.post('/ai/refine-task', { track_summary: trackSummary })
      
      if (response.data.refined_track_summary) {
        // Show review modal instead of directly updating
        setTrackSummaryReviewData({ original: trackSummary, refined: response.data.refined_track_summary })
        setShowTrackSummaryReviewModal(true)
      } else {
        toast.error('No refined content received from AI')
      }
    } catch (error) {
      console.error('Error refining track summary with AI:', error)
      const errorMessage = error.response?.data?.detail || 'Failed to refine track summary with AI'
      toast.error(errorMessage)
    } finally {
      setRefiningTrackSummary(false)
    }
  }

  const handleAcceptTrackSummaryRefinement = () => {
    setTrackSummary(trackSummaryReviewData.refined)
    setShowTrackSummaryReviewModal(false)
    setTrackSummaryReviewData({ original: '', refined: '' })
    toast.success('Track summary updated with AI refinement!')
  }

  const handleRejectTrackSummaryRefinement = () => {
    setShowTrackSummaryReviewModal(false)
    setTrackSummaryReviewData({ original: '', refined: '' })
    toast.info('AI refinement rejected')
  }

  return (
    <>
      <div className="card hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary-500">
        <div className="card-body p-6">
          {/* Task Title - Full Width */}
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900 leading-tight">{task.title}</h3>
          </div>

          {/* Hours Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-gray-500 mb-1">Estimation</span>
              <span className="text-base font-bold text-purple-600">
                {task.estimation_hours?.toFixed(2) || '0.00'} hrs
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-gray-500 mb-1">Worked</span>
              <span className="text-base font-bold text-gray-900">
                {task.cumulative_worked_hours?.toFixed(2) || '0.00'} hrs
              </span>
            </div>
            {task.billable_hours !== null && task.billable_hours !== undefined && (
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500 mb-1">Billable</span>
                <span className="text-base font-bold text-primary-600">
                  {task.billable_hours.toFixed(2)} hrs
                </span>
              </div>
            )}
            {task.productivity_hours !== null && task.productivity_hours !== undefined && (
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500 mb-1">Productivity</span>
                <span className="text-base font-bold text-blue-600">
                  {task.productivity_hours.toFixed(2)} hrs
                </span>
              </div>
            )}
          </div>

          {/* Footer with Status, Developers, and Actions */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
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
              
              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                {canManage && (
                  <button
                    onClick={() => onEdit(task)}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200"
                    title="Edit task"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
                {isProjectLead && (
                  <button
                    onClick={() => {
                      setShowHoursModal(true)
                    }}
                    className="btn btn-sm btn-outline-primary"
                    title="View timesheets and set hours"
                  >
                    View
                  </button>
                )}
              </div>
            </div>
            
            {/* Assigned Developer */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Assigned Developer</span>
                {canManage && (
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="text-xs text-primary-600 hover:text-primary-700 font-semibold hover:underline"
                  >
                    {assignedDevelopers.length > 0 ? 'Change' : '+ Assign'}
                  </button>
                )}
              </div>
              {assignedDevelopers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {assignedDevelopers.map((dev) => (
                    <span
                      key={dev.id}
                      className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-primary-100 text-primary-800 border border-primary-200"
                    >
                      {dev.full_name}
                      {canManage && (
                        <button
                          onClick={() => onUnassignDeveloper(task.id, dev.id)}
                          className="ml-1.5 text-primary-600 hover:text-primary-800 font-bold"
                          title="Remove developer"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No developer assigned</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Assign Developer Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Assign Developer</h3>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="card-body">
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-semibold text-gray-700 mb-1">Task:</p>
                <p className="text-sm text-gray-900">{task.title}</p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {assignedDevelopers.length > 0 ? 'Change Developer' : 'Select Developer'} *
                </label>
                {assignedDevelopers.length > 0 && (
                  <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                    Currently assigned: <strong>{assignedDevelopers[0].full_name}</strong>
                  </div>
                )}
                <select
                  className="input"
                  value={selectedDeveloperId}
                  onChange={(e) => setSelectedDeveloperId(e.target.value)}
                >
                  <option value="">Choose a developer...</option>
                  {unassignedDevelopers.map((dev) => (
                    <option key={dev.id} value={dev.id}>
                      {dev.full_name} ({dev.email})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false)
                    setSelectedDeveloperId('')
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssign}
                  disabled={!selectedDeveloperId}
                  className="btn btn-primary"
                >
                  {assignedDevelopers.length > 0 ? 'Change' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHoursModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white my-10">
            <h3 className="text-lg font-medium mb-4">Set Task Hours</h3>
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">
                Task: <strong>{task.title}</strong>
              </p>
              {task.description && (
                <p className="text-sm text-gray-600 mt-2 break-words whitespace-normal">
                  {task.description}
                </p>
              )}
            </div>
            
            {/* Timesheets Section */}
            {isProjectLead && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Timesheets for this Task</h4>
                {loadingTimesheets ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                  </div>
                ) : timesheets.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No timesheets found for this task</p>
                ) : (
                  <div>
                    {/* Group timesheets by developer */}
                    {(() => {
                      const groupedByDeveloper = timesheets.reduce((acc, ts) => {
                        const devName = ts.user?.full_name || `User ${ts.user_id}`
                        if (!acc[devName]) {
                          acc[devName] = []
                        }
                        acc[devName].push(ts)
                        return acc
                      }, {})
                      
                      return Object.entries(groupedByDeveloper).map(([developerName, devTimesheets]) => (
                        <div key={developerName} className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
                          {/* Developer Header */}
                          <div className="bg-primary-50 px-4 py-2 border-b border-gray-200">
                            <h5 className="text-sm font-semibold text-gray-900">
                              Developer: <span className="text-primary-700">{developerName}</span>
                            </h5>
                          </div>
                          
                          {/* Timesheet Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Date</th>
                                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Description</th>
                                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Hours</th>
                                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {devTimesheets.map((timesheet) => (
                                  <tr key={timesheet.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2">
                                      {new Date(timesheet.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-2 text-gray-600 break-words">
                                      {timesheet.description || <span className="text-gray-400 italic">No description</span>}
                                    </td>
                                    <td className="px-4 py-2 font-semibold">
                                      {timesheet.hours.toFixed(2)} hrs
                                    </td>
                                    <td className="px-4 py-2">
                                      <span
                                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                                          timesheet.status === 'approved'
                                            ? 'bg-green-100 text-green-800'
                                            : timesheet.status === 'rejected'
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                        }`}
                                      >
                                        {timesheet.status?.charAt(0).toUpperCase() + timesheet.status?.slice(1)}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))
                    })()}
                    
                    {/* Total Summary */}
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-700">Total Approved Hours:</span>
                        <span className="text-sm font-bold text-primary-600">
                          {timesheets
                            .filter(t => t.status === 'approved')
                            .reduce((sum, t) => sum + t.hours, 0)
                            .toFixed(2)} hrs
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Billable Hours (for Project Owner)
                </label>
                <input
                  type="number"
                  step="0.25"
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  value={billableHours}
                  onChange={(e) => setBillableHours(e.target.value)}
                  placeholder="Enter billable hours"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Hours to bill the project owner for this task
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Productivity Hours
                </label>
                <input
                  type="number"
                  step="0.25"
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  value={productivityHours}
                  onChange={(e) => setProductivityHours(e.target.value)}
                  placeholder="Enter productivity hours"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Hours for productivity tracking
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Track Summary (for Invoice)
                  </label>
                  <button
                    type="button"
                    onClick={handleRefineTrackSummary}
                    disabled={refiningTrackSummary || !trackSummary}
                    className="text-xs btn btn-sm btn-outline-primary flex items-center gap-1"
                    title="Refine track summary with AI"
                  >
                    {refiningTrackSummary ? (
                      <>
                        <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Refining...
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        AI Refine
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  rows={4}
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  value={trackSummary}
                  onChange={(e) => setTrackSummary(e.target.value)}
                  placeholder="Summary to show in invoice (auto-filled from task description)"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This summary will be shown to the project owner in the invoice instead of the task list. Initially copied from task description, but can be modified.
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowHoursModal(false)
                    setTimesheets([])
                  }}
                  className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Track Summary Review Modal */}
      {showTrackSummaryReviewModal && (
        <div className="modal-overlay" onClick={handleRejectTrackSummaryRefinement}>
          <div className="modal-content max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Review AI Refinement - Track Summary</h3>
                <button
                  onClick={handleRejectTrackSummaryRefinement}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Original Content
                  </label>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{trackSummaryReviewData.original || '(empty)'}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    AI Refined Content
                  </label>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{trackSummaryReviewData.refined}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-4">
                <button
                  onClick={handleRejectTrackSummaryRefinement}
                  className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={handleAcceptTrackSummaryRefinement}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  Accept & Use
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}


