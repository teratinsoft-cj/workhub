import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function Developers() {
  const { user } = useAuth()
  const [developers, setDevelopers] = useState([])

  // Helper function to check if user can view developers
  const canViewDevelopers = () => {
    if (!user) return false
    // Project owners cannot view developers
    if (user.role === 'project_owner') {
      return false
    }
    // Super admin, project manager, and project lead can always view
    if (user.role === 'super_admin' || user.role === 'project_lead') {
      return true
    }
    // Pure developers cannot view
    return false
  }

  useEffect(() => {
    if (canViewDevelopers()) {
      fetchDevelopers()
    }
  }, [user])

  const fetchDevelopers = async () => {
    try {
      const response = await api.get('/developers/available')
      setDevelopers(response.data)
    } catch (error) {
      toast.error('Failed to fetch developers')
    }
  }

  if (!canViewDevelopers()) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">You don't have access to this page</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Developers</h1>
        <p className="mt-2 text-sm text-gray-600">
          View all available developers
        </p>
      </div>

      {developers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No developers found</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {developers.map((dev) => (
                <tr key={dev.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {dev.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {dev.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {dev.username}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

