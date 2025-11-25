import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export default function DeveloperPayments() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [workSummary, setWorkSummary] = useState([])
  const [projects, setProjects] = useState({})
  const [loading, setLoading] = useState(true)
  const [filterProject, setFilterProject] = useState('all')
  const [filterDeveloper, setFilterDeveloper] = useState('all')
  const [selectedTasks, setSelectedTasks] = useState([])

  // Redirect if not project lead or super admin
  useEffect(() => {
    if (user && user.role !== 'project_lead' && user.role !== 'super_admin') {
      navigate('/projects')
    }
  }, [user, navigate])

  useEffect(() => {
    if (user && (user.role === 'project_lead' || user.role === 'super_admin')) {
      fetchWorkSummary()
      fetchProjects()
    }
  }, [user])

  const fetchWorkSummary = async () => {
    try {
      setLoading(true)
      // Always fetch all data - filters are applied client-side
      const response = await api.get('/developer-payments/work-summary')
      setWorkSummary(response.data || [])
    } catch (error) {
      console.error('Error fetching work summary:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to fetch developer work summary'
      toast.error(`Error: ${errorMessage}`)
      setWorkSummary([]) // Set to empty array on error
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

  const handleSelectTask = (developerId, taskId) => {
    const key = `${developerId}-${taskId}`
    if (selectedTasks.includes(key)) {
      setSelectedTasks(selectedTasks.filter(k => k !== key))
    } else {
      setSelectedTasks([...selectedTasks, key])
    }
  }

  const handleSelectAllTasks = (developer) => {
    const unpaidTasks = (developer.allTasks || developer.tasks || []).filter(t => !t.is_paid)
    const keys = unpaidTasks.map(t => `${developer.developer_id}-${t.id}`)
    
    const allSelected = keys.every(key => selectedTasks.includes(key))
    if (allSelected) {
      setSelectedTasks(selectedTasks.filter(k => !keys.includes(k)))
    } else {
      setSelectedTasks([...new Set([...selectedTasks, ...keys])])
    }
  }

  const handleCreateVoucher = async (developer, selectedUnpaidTasks) => {
    if (selectedUnpaidTasks.length === 0) {
      toast.error('Please select at least one task to create a payment voucher')
      return
    }
    
    // Group tasks by project
    const tasksByProject = {}
    selectedUnpaidTasks.forEach(task => {
      if (!tasksByProject[task.project_id]) {
        tasksByProject[task.project_id] = {
          project_id: task.project_id,
          project_name: task.project_name,
          tasks: []
        }
      }
      tasksByProject[task.project_id].tasks.push(task)
    })
    
    const projectKeys = Object.keys(tasksByProject)
    
    // If tasks from multiple projects are selected, show error
    if (projectKeys.length > 1) {
      toast.error('Please select tasks from only one project at a time for payment voucher')
      return
    }
    
    // Get the project (should be only one)
    const projectData = tasksByProject[projectKeys[0]]
    
    const totalAmount = projectData.tasks.reduce((sum, task) => sum + task.earnings, 0)
    
    try {
      setLoading(true)
      const payload = {
        developer_id: developer.developer_id,
        project_id: projectData.project_id,
        voucher_amount: totalAmount,
        voucher_date: new Date().toISOString(),
        notes: `Payment voucher for ${projectData.tasks.length} task(s)`,
        task_ids: projectData.tasks.map(t => t.id)
      }
      
      await api.post('/developer-payments/vouchers', payload)
      toast.success('Payment voucher created successfully!')
      setSelectedTasks([])
      fetchWorkSummary()
    } catch (error) {
      console.error('Error creating voucher:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to create payment voucher'
      toast.error(`Voucher creation failed: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }


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

  // Get unique project IDs and developer IDs for filters
  const projectIds = [...new Set((workSummary || []).map(w => w.project_id))]
  const developerIds = [...new Set((workSummary || []).map(w => w.developer_id))]

  // Filter work summary based on selected filters
  // Only show developers with pending payments (eligible for payment)
  const filteredWorkSummary = (workSummary || []).filter(w => {
    // Only show developers with pending payments
    if (w.pending_amount <= 0) {
      return false
    }
    if (filterProject !== 'all' && w.project_id !== parseInt(filterProject)) {
      return false
    }
    if (filterDeveloper !== 'all' && w.developer_id !== parseInt(filterDeveloper)) {
      return false
    }
    return true
  })

  // Calculate summary statistics - only count unique developers eligible for payment (pending > 0)
  const uniqueDeveloperIds = new Set()
  const summaryStats = filteredWorkSummary.reduce((acc, dev) => {
    acc.totalHours += dev.total_productivity_hours
    acc.totalEarnings += dev.total_earnings
    acc.totalPaid += dev.paid_amount
    acc.totalPending += dev.pending_amount
    // Only count unique developers with pending payments
    if (dev.pending_amount > 0 && !uniqueDeveloperIds.has(dev.developer_id)) {
      uniqueDeveloperIds.add(dev.developer_id)
      acc.eligibleDeveloperCount += 1
    }
    return acc
  }, {
    totalHours: 0,
    totalEarnings: 0,
    totalPaid: 0,
    totalPending: 0,
    eligibleDeveloperCount: 0
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Developer Payments</h1>
        <p className="text-gray-600 text-lg">
          View developer work and earnings, then pay them for completed tasks
        </p>
      </div>

      {/* Summary Card */}
      <div className="card shadow-lg border-0 bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="card-body">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Developer(s)</div>
              <div className="text-2xl font-bold text-gray-900">{summaryStats.eligibleDeveloperCount}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Total Hours</div>
              <div className="text-2xl font-bold text-blue-600">{summaryStats.totalHours.toFixed(2)}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Total Earnings</div>
              <div className="text-2xl font-bold text-green-600">₹{summaryStats.totalEarnings.toFixed(2)}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Paid</div>
              <div className="text-2xl font-bold text-purple-600">₹{summaryStats.totalPaid.toFixed(2)}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Pending</div>
              <div className="text-2xl font-bold text-orange-600">₹{summaryStats.totalPending.toFixed(2)}</div>
            </div>
          </div>
        </div>
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
                    {workSummary.find(w => w.project_id === projectId)?.project_name || `Project ${projectId}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Filter by Developer
              </label>
              <select
                className="input"
                value={filterDeveloper}
                onChange={(e) => setFilterDeveloper(e.target.value)}
              >
                <option value="all">All Developers</option>
                {developerIds.map(developerId => {
                  // Get developer name from workSummary (all data, not filtered)
                  const dev = workSummary.find(w => w.developer_id === developerId)
                  return (
                    <option key={developerId} value={developerId}>
                      {dev?.developer_name || `Developer ${developerId}`}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Work Summary */}
      {!workSummary || workSummary.length === 0 ? (
        <div className="card text-center py-16">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg font-medium mb-1">No developer work found</p>
            <p className="text-gray-400 text-sm">Developers need to have tasks with productivity hours set</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {(() => {
            // Group by developer
            const groupedByDeveloper = {}
            filteredWorkSummary.forEach(dev => {
              if (!groupedByDeveloper[dev.developer_id]) {
                groupedByDeveloper[dev.developer_id] = {
                  developer_id: dev.developer_id,
                  developer_name: dev.developer_name,
                  projects: []
                }
              }
              groupedByDeveloper[dev.developer_id].projects.push(dev)
            })

            // Calculate totals for each developer
            Object.keys(groupedByDeveloper).forEach(devId => {
              const dev = groupedByDeveloper[devId]
              dev.totalHours = dev.projects.reduce((sum, p) => sum + p.total_productivity_hours, 0)
              dev.totalEarnings = dev.projects.reduce((sum, p) => sum + p.total_earnings, 0)
              dev.totalPaid = dev.projects.reduce((sum, p) => sum + p.paid_amount, 0)
              dev.totalPending = dev.projects.reduce((sum, p) => sum + p.pending_amount, 0)
              dev.allTasks = dev.projects.flatMap(p => 
                p.tasks.map(t => ({ ...t, project_id: p.project_id, project_name: p.project_name, hourly_rate: p.hourly_rate }))
              )
            })

            return Object.values(groupedByDeveloper).map((developer) => {
              const unpaidTasks = developer.allTasks.filter(t => !t.is_paid)
              const selectedCount = unpaidTasks.filter(t => 
                selectedTasks.includes(`${developer.developer_id}-${t.id}`)
              ).length
              
              return (
                <div key={developer.developer_id} className="card shadow-lg">
                  <div className="card-body">
                    {/* Developer Header */}
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{developer.developer_name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {developer.projects.length} Project{developer.projects.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Earnings Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">Total Hours</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {developer.totalHours.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">Total Earnings</div>
                        <div className="text-2xl font-bold text-green-600">
                          ₹{developer.totalEarnings.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">Paid</div>
                        <div className="text-2xl font-bold text-purple-600">
                          ₹{developer.totalPaid.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">Pending</div>
                        <div className="text-2xl font-bold text-orange-600">
                          ₹{developer.totalPending.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Tasks Table */}
                    {developer.allTasks.length > 0 ? (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-700">Tasks</h4>
                          {unpaidTasks.length > 0 && (
                            <button
                              onClick={() => {
                                const unpaidTaskKeys = unpaidTasks.map(t => `${developer.developer_id}-${t.id}`)
                                const allSelected = unpaidTaskKeys.every(key => selectedTasks.includes(key))
                                if (allSelected) {
                                  setSelectedTasks(selectedTasks.filter(k => !unpaidTaskKeys.includes(k)))
                                } else {
                                  setSelectedTasks([...new Set([...selectedTasks, ...unpaidTaskKeys])])
                                }
                              }}
                              className="text-sm text-primary-600 hover:text-primary-700"
                            >
                              {unpaidTasks.every(t => selectedTasks.includes(`${developer.developer_id}-${t.id}`))
                                ? 'Deselect All' : 'Select All Unpaid'}
                            </button>
                          )}
                        </div>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left font-semibold text-gray-700 w-12">
                                    {unpaidTasks.length > 0 && (
                                      <input
                                        type="checkbox"
                                        checked={unpaidTasks.length > 0 && unpaidTasks.every(t => 
                                          selectedTasks.includes(`${developer.developer_id}-${t.id}`)
                                        )}
                                        onChange={() => {
                                          const unpaidTaskKeys = unpaidTasks.map(t => `${developer.developer_id}-${t.id}`)
                                          const allSelected = unpaidTaskKeys.every(key => selectedTasks.includes(key))
                                          if (allSelected) {
                                            setSelectedTasks(selectedTasks.filter(k => !unpaidTaskKeys.includes(k)))
                                          } else {
                                            setSelectedTasks([...new Set([...selectedTasks, ...unpaidTaskKeys])])
                                          }
                                        }}
                                        className="w-4 h-4 text-primary-600 border-gray-300 rounded"
                                      />
                                    )}
                                  </th>
                                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Project</th>
                                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Task</th>
                                  <th className="px-4 py-2 text-right font-semibold text-gray-700">Hours</th>
                                  <th className="px-4 py-2 text-right font-semibold text-gray-700">Rate</th>
                                  <th className="px-4 py-2 text-right font-semibold text-gray-700">Earnings</th>
                                  <th className="px-4 py-2 text-center font-semibold text-gray-700">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {developer.allTasks.map((task) => {
                                  const isSelected = selectedTasks.includes(`${developer.developer_id}-${task.id}`)
                                  return (
                                    <tr
                                      key={`${task.id}-${task.project_id}`}
                                      className={`hover:bg-gray-50 ${isSelected ? 'bg-primary-50' : ''} ${task.is_paid ? 'opacity-60' : ''}`}
                                    >
                                      <td className="px-4 py-2">
                                        {!task.is_paid && (
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleSelectTask(developer.developer_id, task.id)}
                                            className="w-4 h-4 text-primary-600 border-gray-300 rounded"
                                          />
                                        )}
                                      </td>
                                      <td className="px-4 py-2">
                                        <div className="font-medium text-primary-600">{task.project_name}</div>
                                      </td>
                                      <td className="px-4 py-2">
                                        <div className="font-medium text-gray-900">{task.title}</div>
                                      </td>
                                      <td className="px-4 py-2 text-right font-semibold">
                                        {task.productivity_hours.toFixed(2)} hrs
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        ₹{task.hourly_rate.toFixed(2)}/hr
                                      </td>
                                      <td className="px-4 py-2 text-right font-bold text-primary-600">
                                        ₹{task.earnings.toFixed(2)}
                                      </td>
                                      <td className="px-4 py-2 text-center">
                                        {task.is_paid ? (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                            Paid
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                            Pending
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic mb-4">No tasks with productivity hours set</p>
                    )}

                    {/* Pay Button */}
                    {unpaidTasks.length > 0 && (
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                          {selectedCount > 0 && (
                            <span>
                              {selectedCount} task(s) selected • Total: ₹
                              {unpaidTasks
                                .filter(t => selectedTasks.includes(`${developer.developer_id}-${t.id}`))
                                .reduce((sum, t) => sum + t.earnings, 0)
                                .toFixed(2)}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            const selectedUnpaidTasks = unpaidTasks.filter(t => 
                              selectedTasks.includes(`${developer.developer_id}-${t.id}`)
                            )
                            handleCreateVoucher(developer, selectedUnpaidTasks)
                          }}
                          disabled={selectedCount === 0}
                          className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Create Payment Voucher
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          })()}
        </div>
      )}

    </div>
  )
}

