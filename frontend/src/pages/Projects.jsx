import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function Projects() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  
  // Developers should not access this page
  useEffect(() => {
    if (user?.role === 'developer') {
      // Redirect to My Tasks if developer tries to access projects
      window.location.href = '/my-tasks'
    }
  }, [user])
  
  if (user?.role === 'developer') {
    return null
  }
  const [projectSources, setProjectSources] = useState([])
  const [projectOwners, setProjectOwners] = useState([])
  const [projectLeads, setProjectLeads] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    project_source_id: '',
    project_owner_id: '',
    project_lead_id: '',
    start_date: '',
    deadline: '',
    status: 'open',
    hold_reason: '',
  })

  useEffect(() => {
    fetchProjects()
    fetchProjectSources()
    if (user?.role === 'super_admin') {
      fetchProjectOwners()
      fetchProjectLeads()
    }
  }, [user])

  const fetchProjectSources = async () => {
    try {
      const response = await api.get('/project-sources/public/list')
      setProjectSources(response.data)
    } catch (error) {
      console.error('Error fetching project sources:', error)
    }
  }

  const fetchProjectOwners = async () => {
    try {
      const response = await api.get('/auth/all-users')
      const owners = response.data.filter(u => u.role === 'project_owner')
      setProjectOwners(owners)
    } catch (error) {
      console.error('Error fetching project owners:', error)
    }
  }

  const fetchProjectLeads = async () => {
    try {
      const response = await api.get('/auth/all-users')
      const leads = response.data.filter(u => u.role === 'project_lead')
      setProjectLeads(leads)
    } catch (error) {
      console.error('Error fetching project leads:', error)
    }
  }

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
      // Convert empty string to null for optional fields
      // Convert date strings to ISO format (date only, set time to midnight UTC)
      const submitData = {
        ...formData,
        project_source_id: formData.project_source_id ? parseInt(formData.project_source_id) : null,
        project_owner_id: formData.project_owner_id ? parseInt(formData.project_owner_id) : null,
        project_lead_id: formData.project_lead_id ? parseInt(formData.project_lead_id) : null,
        hold_reason: formData.status === 'hold' ? formData.hold_reason : null,
        start_date: formData.start_date ? new Date(formData.start_date + 'T00:00:00').toISOString() : null,
        deadline: formData.deadline ? new Date(formData.deadline + 'T00:00:00').toISOString() : null,
      }
      
      if (editingProject) {
        await api.put(`/projects/${editingProject.id}`, submitData)
        toast.success('Project updated successfully!')
      } else {
        await api.post('/projects', submitData)
        toast.success('Project created successfully!')
      }
      
      setShowModal(false)
      setEditingProject(null)
      setFormData({ 
        name: '', 
        description: '', 
        project_source_id: '', 
        project_owner_id: '',
        project_lead_id: '',
        start_date: '', 
        deadline: '', 
        status: 'open',
        hold_reason: ''
      })
      fetchProjects()
    } catch (error) {
      console.error('Error saving project:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to save project'
      toast.error(errorMessage)
    }
  }

  const handleEdit = (project) => {
    setEditingProject(project)
    // Format dates for input fields (YYYY-MM-DD)
    const startDate = project.start_date ? new Date(project.start_date).toISOString().split('T')[0] : ''
    const deadline = project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : ''
    
    setFormData({
      name: project.name,
      description: project.description || '',
      project_source_id: project.project_source_id || '',
      project_owner_id: project.project_owner_id || '',
      project_lead_id: project.project_lead_id || '',
      start_date: startDate,
      deadline: deadline,
      status: project.status?.toLowerCase() || 'open',
      hold_reason: project.hold_reason || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }
    try {
      await api.delete(`/projects/${projectId}`)
      toast.success('Project deleted successfully!')
      fetchProjects()
    } catch (error) {
      console.error('Error deleting project:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete project'
      toast.error(errorMessage)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingProject(null)
    setFormData({ 
      name: '', 
      description: '', 
      project_source_id: '', 
      project_owner_id: '',
      start_date: '', 
      deadline: '', 
      status: 'open',
      hold_reason: ''
    })
  }

  const canCreate = user?.role === 'super_admin' || user?.role === 'project_lead'
  const canEdit = (project) => {
    if (user?.role === 'super_admin') return true
    if (user?.role === 'project_lead') {
      return project.project_lead_id === user?.id
    }
    return false
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Projects</h1>
          <p className="text-gray-600 text-lg">
            Manage your projects and track progress
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </button>
        )}
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="empty-state-title">No projects found</p>
            <p className="empty-state-description">Get started by creating your first project</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const statusColor = 
              project.status === 'ACTIVE' || project.status === 'active' ? 'from-green-500 to-emerald-600' :
              project.status === 'OPEN' || project.status === 'open' ? 'from-blue-500 to-indigo-600' :
              project.status === 'HOLD' || project.status === 'hold' ? 'from-yellow-500 to-amber-600' :
              'from-gray-500 to-gray-600'
            
            return (
              <div
                key={project.id}
                className="card group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden relative"
              >
                {/* Status Indicator Bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${statusColor}`}></div>
                
                <div className="card-body pt-5">
                  {/* Header Section */}
                  <div className="flex justify-between items-start mb-4">
                    <Link
                      to={`/projects/${project.id}`}
                      className="flex-1 group-hover:text-primary-600 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${statusColor} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-gray-900 mb-1 line-clamp-1 group-hover:text-primary-600 transition-colors">
                            {project.name}
                          </h3>
                          {project.project_source && (
                            <div className="flex items-center text-xs text-gray-500 mt-1">
                              <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              <span className="truncate">{project.project_source.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                    {canEdit(project) && (
                      <div className="flex space-x-1 ml-2 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            handleEdit(project)
                          }}
                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200 hover:scale-110"
                          title="Edit project"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            handleDelete(project.id)
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110"
                          title="Delete project"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <Link to={`/projects/${project.id}`}>
                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-5 line-clamp-2 min-h-[2.5rem] leading-relaxed">
                      {project.description || <span className="text-gray-400 italic">No description provided</span>}
                    </p>
                    
                    {/* Status Badge */}
                    <div className="mb-4">
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
                    
                    {/* Footer Info */}
                    <div className="pt-4 border-t border-gray-100 space-y-2.5">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                          <svg className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <div className="min-w-0">
                            <div className="text-gray-400 text-[10px] uppercase tracking-wide">Start</div>
                            <div className="font-semibold text-gray-700 truncate">{new Date(project.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                          </div>
                        </div>
                        {project.deadline && (
                          <div className="flex items-center text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                            <svg className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="min-w-0">
                              <div className="text-gray-400 text-[10px] uppercase tracking-wide">Deadline</div>
                              <div className="font-semibold text-gray-700 truncate">{new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* View Project Link */}
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs font-semibold text-primary-600 group-hover:text-primary-700 flex items-center">
                          View Details
                          <svg className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingProject ? 'Edit Project' : 'Create New Project'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="form-group">
                  <label className="form-label form-label-required">
                    Project Name
                  </label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Enter project name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Project Source
                  </label>
                  <select
                    className="input"
                    value={formData.project_source_id}
                    onChange={(e) =>
                      setFormData({ ...formData, project_source_id: e.target.value || null })
                    }
                  >
                    <option value="">Select a project source (optional)</option>
                    {projectSources.map((source) => (
                      <option key={source.id} value={source.id}>
                        {source.name}
                      </option>
                    ))}
                  </select>
                </div>
                {user?.role === 'super_admin' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">
                        Project Lead
                      </label>
                      <select
                        className="input"
                        value={formData.project_lead_id}
                        onChange={(e) =>
                          setFormData({ ...formData, project_lead_id: e.target.value || null })
                        }
                      >
                        <option value="">Select a project lead (optional)</option>
                        {projectLeads.map((lead) => (
                          <option key={lead.id} value={lead.id}>
                            {lead.full_name} ({lead.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Project Owner
                      </label>
                      <select
                        className="input"
                        value={formData.project_owner_id}
                        onChange={(e) =>
                          setFormData({ ...formData, project_owner_id: e.target.value || null })
                        }
                      >
                        <option value="">Select a project owner (optional)</option>
                        {projectOwners.map((owner) => (
                          <option key={owner.id} value={owner.id}>
                            {owner.full_name} ({owner.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    className="input"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Deadline
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={formData.deadline}
                    onChange={(e) =>
                      setFormData({ ...formData, deadline: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    required
                    className="input"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value, hold_reason: e.target.value !== 'hold' ? '' : formData.hold_reason })
                    }
                  >
                    <option value="open">Open</option>
                    <option value="active">Active</option>
                    <option value="hold">Hold</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                {formData.status === 'hold' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Hold Reason *
                    </label>
                    <textarea
                      rows={3}
                      required
                      className="input"
                      value={formData.hold_reason}
                      onChange={(e) =>
                        setFormData({ ...formData, hold_reason: e.target.value })
                      }
                      placeholder="Please provide a reason for putting this project on hold"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    className="input"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Enter project description"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    {editingProject ? 'Update Project' : 'Create Project'}
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

