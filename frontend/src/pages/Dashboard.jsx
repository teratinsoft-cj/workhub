import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    projects: 0,
    timesheets: 0,
    pending_timesheets: 0,
    earnings: 0,
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const [projectsRes, timesheetsRes] = await Promise.all([
        api.get('/projects'),
        api.get('/timesheets'),
      ])

      const projects = projectsRes.data.length
      const timesheets = timesheetsRes.data
      const pending = timesheets.filter((t) => t.status === 'pending').length

      let earnings = 0
      if (user?.role === 'developer') {
        const earningsRes = await api.get('/payments/earnings/developer')
        const earningsData = earningsRes.data[0]
        if (earningsData) {
          earnings = earningsData.total_earnings
        }
      }

      setStats({
        projects,
        timesheets: timesheets.length,
        pending_timesheets: pending,
        earnings,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Welcome back, {user?.full_name}!
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">📁</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Projects
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.projects}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link
                to="/projects"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                View all
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">⏰</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Timesheets
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.timesheets}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link
                to="/timesheets"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                View all
              </Link>
            </div>
          </div>
        </div>

        {(user?.role === 'project_manager' || user?.role === 'project_lead') && (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-3xl">⏳</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pending Validation
                    </dt>
                    <dd className="text-lg font-medium text-yellow-600">
                      {stats.pending_timesheets}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <Link
                  to="/timesheets?status=pending"
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  Review
                </Link>
              </div>
            </div>
          </div>
        )}

        {user?.role === 'developer' && (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-3xl">💵</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Earnings
                    </dt>
                    <dd className="text-lg font-medium text-green-600">
                      ${stats.earnings.toFixed(2)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <Link
                  to="/earnings"
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  View details
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

