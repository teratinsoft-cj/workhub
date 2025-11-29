import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function UserApprovals() {
  const { user } = useAuth()
  const [pendingUsers, setPendingUsers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [showAll, setShowAll] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [userRole, setUserRole] = useState('')
  const [canActAsSuperAdmin, setCanActAsSuperAdmin] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createFormData, setCreateFormData] = useState({
    full_name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'developer',
  })
  const [createErrors, setCreateErrors] = useState({})

  useEffect(() => {
    fetchPendingUsers()
  }, [])

  const fetchPendingUsers = async () => {
    try {
      const response = await api.get('/auth/pending-users')
      setPendingUsers(response.data)
    } catch (error) {
      toast.error('Failed to fetch pending users')
    }
  }

  const fetchAllUsers = async () => {
    try {
      const response = await api.get('/auth/all-users')
      setAllUsers(response.data)
      setShowAll(true)
    } catch (error) {
      toast.error('Failed to fetch all users')
    }
  }

  const handleApproval = async (userId, approved, role = null, canActAsSuper = null) => {
    try {
      const payload = {
        user_id: userId,
        approved: approved,
      }
      if (role) {
        payload.role = role
      }
      if (canActAsSuper !== null) {
        payload.can_act_as_super_admin = canActAsSuper
      }
      await api.put('/auth/approve-user', payload)
      toast.success(`User ${approved ? 'approved' : 'rejected'}${role ? ' and role updated' : ''} successfully!`)
      setEditingUser(null)
      setUserRole('')
      setCanActAsSuperAdmin(false)
      fetchPendingUsers()
      if (showAll) {
        fetchAllUsers()
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user approval')
    }
  }

  const handleRoleChange = async (userId, newRole, currentApproved, canActAsSuper) => {
    try {
      await api.put('/auth/approve-user', {
        user_id: userId,
        approved: currentApproved,
        role: newRole,
        can_act_as_super_admin: canActAsSuper,
      })
      toast.success('User role updated successfully!')
      setEditingUser(null)
      setUserRole('')
      setCanActAsSuperAdmin(false)
      fetchPendingUsers()
      if (showAll) {
        fetchAllUsers()
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user role')
    }
  }

  const openEditModal = (user) => {
    setEditingUser(user)
    setUserRole(user.role)
    setCanActAsSuperAdmin(user.can_act_as_super_admin || false)
  }

  const validateCreateForm = () => {
    const newErrors = {}

    if (!createFormData.full_name.trim()) {
      newErrors.full_name = 'Full name is required'
    }

    if (!createFormData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createFormData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (!createFormData.username.trim()) {
      newErrors.username = 'Username is required'
    } else if (createFormData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters'
    }

    if (!createFormData.password) {
      newErrors.password = 'Password is required'
    } else if (createFormData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (createFormData.password !== createFormData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setCreateErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    
    if (!validateCreateForm()) {
      return
    }

    try {
      const userData = {
        full_name: createFormData.full_name,
        email: createFormData.email,
        username: createFormData.username,
        password: createFormData.password,
        role: createFormData.role,
      }

      await api.post('/auth/create-user', userData)
      toast.success('User created successfully!')
      
      // Reset form
      setCreateFormData({
        full_name: '',
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        role: 'developer',
      })
      setCreateErrors({})
      setShowCreateModal(false)
      
      // Refresh user lists
      fetchPendingUsers()
      if (showAll) {
        fetchAllUsers()
      }
    } catch (error) {
      console.error('Error creating user:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to create user'
      toast.error(errorMessage)
    }
  }

  if (user?.role !== 'super_admin') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">You don't have access to this page</p>
      </div>
    )
  }

  const usersToDisplay = showAll ? allUsers : pendingUsers

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage user registrations and approvals
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              setShowAll(!showAll)
              if (!showAll) {
                fetchAllUsers()
              }
            }}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium"
          >
            {showAll ? 'Show Pending Only' : 'Show All Users'}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium"
          >
            + Create User
          </button>
        </div>
      </div>

      {usersToDisplay.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">
            {showAll ? 'No users found' : 'No pending approvals'}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Registered
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usersToDisplay.map((u) => (
                <tr key={u.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {u.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {u.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {u.username}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-primary-100 text-primary-800">
                          {u.role?.replace('_', ' ').toUpperCase()}
                        </span>
                        {u.role !== 'super_admin' && u.id !== user?.id && (
                          <button
                            onClick={() => openEditModal(u)}
                            className="text-primary-600 hover:text-primary-800 text-xs"
                            title="Change role"
                          >
                            ✏️
                          </button>
                        )}
                        {u.id === user?.id && (
                          <span className="text-xs text-gray-400" title="Cannot change your own role">
                            (You)
                          </span>
                        )}
                      </div>
                      {u.role === 'project_lead' && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            Developer (Auto)
                          </span>
                        </div>
                      )}
                      {u.can_act_as_super_admin && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            Can Act as Super Admin
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        u.is_approved
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {u.is_approved ? 'Approved' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(u.created_at), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {u.role !== 'super_admin' && u.id !== user?.id && (
                      <div className="flex space-x-2">
                        {!u.is_approved ? (
                          <button
                            onClick={() => openEditModal(u)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Approve & Set Role
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleApproval(u.id, false)}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              Revoke
                            </button>
                            <button
                              onClick={() => openEditModal(u)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Change Role
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    {u.id === user?.id && (
                      <span className="text-gray-400 text-xs">Cannot change own role</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!showAll && pendingUsers.length > 0 && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-sm text-yellow-800">
            <strong>{pendingUsers.length}</strong> user(s) waiting for approval
          </p>
        </div>
      )}

      {/* Edit User Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {!editingUser.is_approved ? 'Approve User & Set Role' : 'Change User Role'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    User: {editingUser.full_name} ({editingUser.email})
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <select
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                  >
                    <option value="developer">Developer</option>
                    <option value="project_lead">Project Lead</option>
                    <option value="project_owner">Project Owner</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Note: Main role cannot be Super Admin. Additional permissions can be granted below.
                  </p>
                </div>
                <div className="space-y-3 mt-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="canActAsSuperAdmin"
                      checked={canActAsSuperAdmin}
                      onChange={(e) => setCanActAsSuperAdmin(e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="canActAsSuperAdmin" className="ml-2 block text-sm text-gray-700">
                      Can Act as Super Admin
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Note: Project Leads are automatically developers and can be added to projects with hourly rates.
                  </p>
                </div>
                {!editingUser.is_approved && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-sm text-blue-800">
                      This will approve the user and set their role to <strong>{userRole?.replace('_', ' ').toUpperCase()}</strong>
                    </p>
                  </div>
                )}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUser(null)
                      setUserRole('')
                      setCanActAsSuperAdmin(false)
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!editingUser.is_approved) {
                        handleApproval(editingUser.id, true, userRole, canActAsSuperAdmin)
                      } else {
                        handleRoleChange(editingUser.id, userRole, editingUser.is_approved, canActAsSuperAdmin)
                      }
                    }}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    {!editingUser.is_approved ? 'Approve & Save' : 'Update Role'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-[700px] shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New User</h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                {/* Two Column Layout */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                        createErrors.full_name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={createFormData.full_name}
                      onChange={(e) => {
                        setCreateFormData({ ...createFormData, full_name: e.target.value })
                        if (createErrors.full_name) {
                          setCreateErrors({ ...createErrors, full_name: '' })
                        }
                      }}
                    />
                    {createErrors.full_name && (
                      <p className="mt-1 text-sm text-red-600">{createErrors.full_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                        createErrors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={createFormData.email}
                      onChange={(e) => {
                        setCreateFormData({ ...createFormData, email: e.target.value })
                        if (createErrors.email) {
                          setCreateErrors({ ...createErrors, email: '' })
                        }
                      }}
                    />
                    {createErrors.email && (
                      <p className="mt-1 text-sm text-red-600">{createErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                        createErrors.username ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={createFormData.username}
                      onChange={(e) => {
                        setCreateFormData({ ...createFormData, username: e.target.value })
                        if (createErrors.username) {
                          setCreateErrors({ ...createErrors, username: '' })
                        }
                      }}
                    />
                    {createErrors.username && (
                      <p className="mt-1 text-sm text-red-600">{createErrors.username}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role *
                    </label>
                    <select
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      value={createFormData.role}
                      onChange={(e) => setCreateFormData({ ...createFormData, role: e.target.value })}
                    >
                    <option value="developer">Developer</option>
                    <option value="project_lead">Project Lead</option>
                    <option value="project_owner">Project Owner</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Note: Super Admin role cannot be created through this interface. Any role can be assigned to users.
                  </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                        createErrors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={createFormData.password}
                      onChange={(e) => {
                        setCreateFormData({ ...createFormData, password: e.target.value })
                        if (createErrors.password) {
                          setCreateErrors({ ...createErrors, password: '' })
                        }
                      }}
                    />
                    {createErrors.password && (
                      <p className="mt-1 text-sm text-red-600">{createErrors.password}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      required
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                        createErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={createFormData.confirmPassword}
                      onChange={(e) => {
                        setCreateFormData({ ...createFormData, confirmPassword: e.target.value })
                        if (createErrors.confirmPassword) {
                          setCreateErrors({ ...createErrors, confirmPassword: '' })
                        }
                      }}
                    />
                    {createErrors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{createErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Users created by Super Admin are automatically approved and can log in immediately.
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      setCreateFormData({
                        full_name: '',
                        email: '',
                        username: '',
                        password: '',
                        confirmPassword: '',
                        role: 'developer',
                      })
                      setCreateErrors({})
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    Create User
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

