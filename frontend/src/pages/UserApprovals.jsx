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

  const handleApproval = async (userId, approved) => {
    try {
      await api.put('/auth/approve-user', {
        user_id: userId,
        approved: approved,
      })
      toast.success(`User ${approved ? 'approved' : 'rejected'} successfully!`)
      fetchPendingUsers()
      if (showAll) {
        fetchAllUsers()
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user approval')
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
          <h1 className="text-3xl font-bold text-gray-900">User Approvals</h1>
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-primary-100 text-primary-800">
                      {u.role?.replace('_', ' ').toUpperCase()}
                    </span>
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
                    {u.role !== 'super_admin' && (
                      <div className="flex space-x-2">
                        {!u.is_approved ? (
                          <button
                            onClick={() => handleApproval(u.id, true)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Approve
                          </button>
                        ) : (
                          <button
                            onClick={() => handleApproval(u.id, false)}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
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
    </div>
  )
}

