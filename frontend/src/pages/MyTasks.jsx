import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function MyTasks() {
  const { user } = useAuth()
  const [tasksByProject, setTasksByProject] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProjectId, setSelectedProjectId] = useState('all') // 'all' or project_id
  const [showTimesheetModal, setShowTimesheetModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [timesheetForm, setTimesheetForm] = useState({
    date: new Date().toISOString().split('T')[0],
    hours: '',
    description: '',
  })

  const columns = [
    { id: 'todo', title: 'To Do', color: 'gray' },
    { id: 'in_progress', title: 'In Progress', color: 'yellow' },
    { id: 'testing', title: 'Testing', color: 'blue' },
    { id: 'completed', title: 'Completed', color: 'green' },
  ]

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const response = await api.get('/tasks/developer/my-tasks')
      console.log('Fetched tasks:', response.data) // Debug log
      setTasksByProject(response.data)
    } catch (error) {
      console.error('Error fetching tasks:', error)
      toast.error('Failed to fetch tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (taskId, newStatus, projectId) => {
    try {
      await api.patch(`/tasks/${taskId}/status?status=${newStatus}`)
      toast.success('Task status updated')
      fetchTasks()
    } catch (error) {
      console.error('Error updating task status:', error)
      toast.error(error.response?.data?.detail || 'Failed to update task status')
    }
  }

  const handleOpenTimesheet = (task, projectId) => {
    setSelectedTask({ ...task, project_id: projectId })
    setTimesheetForm({
      date: new Date().toISOString().split('T')[0],
      hours: '',
      description: '',
    })
    setShowTimesheetModal(true)
  }

  const handleTimesheetSubmit = async (e) => {
    e.preventDefault()
    if (!selectedTask) return

    try {
      const payload = {
        project_id: selectedTask.project_id,
        task_id: selectedTask.id,
        date: new Date(timesheetForm.date).toISOString(),
        hours: parseFloat(timesheetForm.hours),
        description: timesheetForm.description,
      }
      await api.post('/timesheets', payload)
      toast.success('Timesheet entry created successfully!')
      setShowTimesheetModal(false)
      setSelectedTask(null)
      fetchTasks()
    } catch (error) {
      console.error('Error creating timesheet:', error)
      toast.error(error.response?.data?.detail || 'Failed to create timesheet')
    }
  }

  const getTasksByStatus = (tasks, status) => {
    return tasks.filter(task => task.status === status)
  }

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'badge-success'
      case 'testing':
        return 'badge-primary'
      case 'in_progress':
        return 'badge-warning'
      case 'todo':
        return 'badge-gray'
      default:
        return 'badge-gray'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Get filtered tasks based on selected project
  // Only show projects where developer has assigned tasks
  const getFilteredTasksByProject = () => {
    // Filter out projects with no tasks
    const validProjects = tasksByProject.filter(p => 
      p.tasks && p.tasks.length > 0
    )
    
    if (selectedProjectId === 'all') {
      return validProjects
    }
    return validProjects.filter(p => p.project_id === parseInt(selectedProjectId))
  }

  const filteredProjects = getFilteredTasksByProject()
  
  // Get unique projects for dropdown (only those with tasks)
  const availableProjects = tasksByProject.filter(p => 
    p.tasks && p.tasks.length > 0
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                My Tasks
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your tasks in a Kanban board view
              </p>
            </div>
          </div>
        </div>

        {/* Project Filter */}
        {availableProjects.length > 0 && (
          <div className="card shadow-lg border-0 bg-white">
            <div className="card-body py-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4 w-full sm:w-auto">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <label className="text-sm font-bold text-gray-700">
                      Filter by Project:
                    </label>
                  </div>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="input max-w-xs border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                  >
                    <option value="all">All Projects</option>
                    {availableProjects.map((projectData) => (
                      <option key={projectData.project_id} value={projectData.project_id}>
                        {projectData.project_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center space-x-2 px-4 py-2 bg-primary-50 rounded-lg border border-primary-200">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <span className="text-sm font-bold text-primary-700">
                    {filteredProjects.reduce((total, p) => total + p.tasks.length, 0)} task(s) total
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Tasks by Project - Kanban Board */}
      {filteredProjects.length === 0 ? (
        <div className="card shadow-xl border-0 bg-white text-center py-20">
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-6 shadow-inner">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No tasks assigned</h3>
            <p className="text-gray-500 max-w-md">You don't have any tasks assigned to you yet. Tasks will appear here once they are assigned to you.</p>
          </div>
        </div>
      ) : (
        <div className="card shadow-xl border-0 bg-white overflow-hidden">
          <div className="card-body p-6">
            {/* Unified Kanban Board - Tasks from selected project(s) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {columns.map((column) => {
                // Get all tasks from filtered projects for this status
                const allTasks = filteredProjects.flatMap(projectData => 
                  getTasksByStatus(projectData.tasks, column.id)
                )
                
                // Define column colors
                const columnColors = {
                  todo: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'badge-gray', accent: 'bg-gray-500' },
                  in_progress: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', badge: 'badge-warning', accent: 'bg-yellow-500' },
                  testing: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', badge: 'badge-primary', accent: 'bg-blue-500' },
                  completed: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', badge: 'badge-success', accent: 'bg-green-500' }
                }
                
                const colors = columnColors[column.id] || columnColors.todo
                
                return (
                  <div key={column.id} className="flex flex-col">
                    {/* Column Header */}
                    <div className={`mb-4 px-4 py-3 rounded-xl ${colors.bg} ${colors.border} border-2 shadow-sm`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${colors.accent}`}></div>
                          <h3 className={`font-bold ${colors.text} text-sm uppercase tracking-wide`}>{column.title}</h3>
                        </div>
                        <span className={`${colors.badge} text-xs font-bold px-2.5 py-1 rounded-full`}>
                          {allTasks.length}
                        </span>
                      </div>
                    </div>
                    
                    {/* Tasks in Column */}
                    <div 
                      className={`flex-1 space-y-3 min-h-[300px] p-2 rounded-lg transition-colors duration-200 ${colors.bg} bg-opacity-30`}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.currentTarget.classList.add('bg-opacity-50', 'ring-2', 'ring-primary-300')
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove('bg-opacity-50', 'ring-2', 'ring-primary-300')
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        e.currentTarget.classList.remove('bg-opacity-50', 'ring-2', 'ring-primary-300')
                        const taskId = parseInt(e.dataTransfer.getData('taskId'))
                        const projectId = parseInt(e.dataTransfer.getData('projectId'))
                        if (taskId) {
                          handleStatusChange(taskId, column.id, projectId)
                        }
                      }}
                    >
                      {allTasks.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                          <p className="text-gray-400 text-sm font-medium">No tasks</p>
                        </div>
                      ) : (
                        allTasks.map((task) => {
                          // Find which project this task belongs to
                          const taskProject = filteredProjects.find(p => 
                            p.tasks.some(t => t.id === task.id)
                          )
                          return (
                            <div
                              key={task.id}
                              className="card hover:shadow-xl transition-all duration-300 cursor-move bg-white border-2 border-gray-100 hover:border-primary-300 group"
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('taskId', task.id.toString())
                                e.dataTransfer.setData('projectId', taskProject?.project_id?.toString() || '')
                                e.currentTarget.style.opacity = '0.5'
                                e.currentTarget.style.transform = 'rotate(2deg)'
                              }}
                              onDragEnd={(e) => {
                                e.currentTarget.style.opacity = '1'
                                e.currentTarget.style.transform = 'rotate(0deg)'
                              }}
                            >
                              <div className="card-body p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <h4 className="font-bold text-gray-900 text-sm flex-1 group-hover:text-primary-600 transition-colors line-clamp-2">
                                    {task.title}
                                  </h4>
                                </div>
                                
                                {task.description && (
                                  <p className="text-xs text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                                    {task.description}
                                  </p>
                                )}
                                
                                <div className="space-y-3 pt-3 border-t border-gray-100">
                                  <div className="flex items-center justify-between text-xs bg-purple-50 px-2 py-1.5 rounded-md">
                                    <span className="text-gray-600 font-medium flex items-center">
                                      <svg className="w-3 h-3 mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      Estimation:
                                    </span>
                                    <span className="font-bold text-purple-600">
                                      {task.estimation_hours?.toFixed(2) || '0.00'}h
                                    </span>
                                  </div>
                                  
                                  {/* Status Dropdown */}
                                  <select
                                    value={task.status}
                                    onChange={(e) => handleStatusChange(task.id, e.target.value, taskProject?.project_id)}
                                    className="w-full text-xs px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white font-medium"
                                  >
                                    <option value="todo">To Do</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="testing">Testing</option>
                                    <option value="completed">Completed</option>
                                  </select>
                                  
                                  {/* Timesheet Button */}
                                  <button
                                    onClick={() => handleOpenTimesheet(task, taskProject?.project_id)}
                                    className="w-full btn btn-primary text-xs py-2.5 mt-2 font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center"
                                  >
                                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Log Time
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Timesheet Modal */}
      {showTimesheetModal && selectedTask && (
        <div className="modal-overlay" onClick={() => setShowTimesheetModal(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Log Time</h3>
                <button
                  onClick={() => setShowTimesheetModal(false)}
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
                <p className="text-sm text-gray-900">{selectedTask.title}</p>
              </div>
              
              <form onSubmit={handleTimesheetSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    className="input"
                    value={timesheetForm.date}
                    onChange={(e) => setTimesheetForm({ ...timesheetForm, date: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Hours *
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    required
                    className="input"
                    value={timesheetForm.hours}
                    onChange={(e) => setTimesheetForm({ ...timesheetForm, hours: e.target.value })}
                    placeholder="Enter hours worked"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    className="input"
                    value={timesheetForm.description}
                    onChange={(e) => setTimesheetForm({ ...timesheetForm, description: e.target.value })}
                    placeholder="What did you work on?"
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowTimesheetModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    Log Time
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
