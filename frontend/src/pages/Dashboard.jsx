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
    invoices: {
      total: 0,
      pending: 0,
      partial: 0,
      paid: 0,
      total_amount: 0,
      total_paid: 0,
      pending_amount: 0,
    },
    payments: {
      total: 0,
      total_amount: 0,
    },
  })
  const [recentInvoices, setRecentInvoices] = useState([])

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Fetch projects
      let projects = 0
      try {
        const projectsRes = await api.get('/projects')
        projects = projectsRes.data.length
        console.log(`[Dashboard] Fetched ${projects} projects for ${user?.role}:`, projectsRes.data)
      } catch (error) {
        console.error('Error fetching projects:', error)
      }

      // Fetch timesheets (project owners don't have access)
      let timesheets = []
      let pending = 0
      if (user?.role !== 'project_owner') {
        try {
          const timesheetsRes = await api.get('/timesheets')
          timesheets = timesheetsRes.data || []
          pending = timesheets.filter((t) => t.status === 'pending').length
        } catch (error) {
          console.error('Error fetching timesheets:', error)
        }
      }

      let earnings = 0
      if (user?.role === 'developer') {
        try {
          const earningsRes = await api.get('/payments/earnings/developer')
          const earningsData = earningsRes.data[0]
          if (earningsData) {
            earnings = earningsData.total_earnings
          }
        } catch (err) {
          // Developer might not have earnings endpoint access
        }
      }

      // Fetch invoices (for project owners, leads, and super admins)
      let invoices = []
      if (user?.role === 'project_owner' || user?.role === 'project_lead' || user?.role === 'super_admin') {
        try {
          const invoicesRes = await api.get('/payments/invoices')
          invoices = invoicesRes.data || []
          console.log(`[Dashboard] Fetched ${invoices.length} invoices for ${user?.role}:`, invoices)
        } catch (error) {
          console.error('Error fetching invoices:', error)
          console.error('Error details:', error.response?.data)
          // Project owners should have access, but handle gracefully
        }
      }

      // Calculate invoice statistics
      const invoiceStats = {
        total: invoices.length,
        pending: invoices.filter((inv) => inv.status === 'pending').length,
        partial: invoices.filter((inv) => inv.status === 'partial').length,
        paid: invoices.filter((inv) => inv.status === 'paid').length,
        total_amount: invoices.reduce((sum, inv) => sum + (inv.invoice_amount || 0), 0),
        total_paid: invoices.reduce((sum, inv) => sum + (inv.total_paid || 0), 0),
        pending_amount: invoices
          .filter((inv) => inv.status === 'pending')
          .reduce((sum, inv) => sum + (inv.invoice_amount - (inv.total_paid || 0)), 0),
      }

      // Fetch payments for each invoice to calculate payment stats
      let paymentStats = { total: 0, total_amount: 0 }
      try {
        for (const invoice of invoices) {
          try {
            const paymentsRes = await api.get(`/payments/invoices/${invoice.id}/payments`)
            const payments = paymentsRes.data || []
            paymentStats.total += payments.length
            paymentStats.total_amount += payments.reduce((sum, p) => sum + (p.amount || 0), 0)
          } catch (err) {
            // Skip if can't fetch payments for this invoice
          }
        }
      } catch (err) {
        // Handle payment fetch errors
      }

      // Get recent invoices (last 5)
      const recent = invoices
        .sort((a, b) => new Date(b.invoice_date) - new Date(a.invoice_date))
        .slice(0, 5)

      setStats({
        projects,
        timesheets: timesheets.length,
        pending_timesheets: pending,
        earnings,
        invoices: invoiceStats,
        payments: paymentStats,
      })
      setRecentInvoices(recent)
      
      // Debug logging
      if (user?.role === 'project_owner') {
        console.log('[Dashboard Debug] Project Owner Stats:', {
          projects,
          invoices: invoiceStats,
          payments: paymentStats,
          recentInvoices: recent.length
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      // Set default values on error to prevent undefined states
      setStats(prev => ({
        ...prev,
        projects: prev.projects || 0,
        timesheets: prev.timesheets || 0,
        pending_timesheets: prev.pending_timesheets || 0,
      }))
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600 text-lg">
          Welcome back, <span className="font-semibold text-gray-900">{user?.full_name}</span>! 👋
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Projects Card */}
        <div className="stat-card group hover:shadow-medium transition-all duration-300">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Total Projects</p>
                <p className="text-3xl font-bold text-gray-900">{stats.projects}</p>
              </div>
              <div className="stat-card-icon bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
          </div>
          <div className="card-header bg-gradient-to-r from-blue-50 to-blue-100/50">
            <Link
              to="/projects"
              className="text-sm font-semibold text-blue-700 hover:text-blue-800 inline-flex items-center group-hover:translate-x-1 transition-transform"
            >
              View all projects
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Timesheets Card */}
        <div className="stat-card group hover:shadow-medium transition-all duration-300">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Timesheets</p>
                <p className="text-3xl font-bold text-gray-900">{stats.timesheets}</p>
              </div>
              <div className="stat-card-icon bg-purple-100 text-purple-600 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="card-header bg-gradient-to-r from-purple-50 to-purple-100/50">
            <Link
              to="/timesheets"
              className="text-sm font-semibold text-purple-700 hover:text-purple-800 inline-flex items-center group-hover:translate-x-1 transition-transform"
            >
              View all timesheets
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Pending Validation Card - Project Lead */}
        {user?.role === 'project_lead' && (
          <div className="stat-card group hover:shadow-medium transition-all duration-300">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">Pending Validation</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pending_timesheets}</p>
                </div>
                <div className="stat-card-icon bg-yellow-100 text-yellow-600 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="card-header bg-gradient-to-r from-yellow-50 to-yellow-100/50">
              <Link
                to="/timesheets?status=pending"
                className="text-sm font-semibold text-yellow-700 hover:text-yellow-800 inline-flex items-center group-hover:translate-x-1 transition-transform"
              >
                Review pending
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        )}

        {/* Earnings Card - Developer */}
        {user?.role === 'developer' && (
          <div className="stat-card group hover:shadow-medium transition-all duration-300">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Earnings</p>
                  <p className="text-3xl font-bold text-green-600">₹{stats.earnings.toFixed(2)}</p>
                </div>
                <div className="stat-card-icon bg-green-100 text-green-600 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="card-header bg-gradient-to-r from-green-50 to-green-100/50">
              <Link
                to="/earnings"
                className="text-sm font-semibold text-green-700 hover:text-green-800 inline-flex items-center group-hover:translate-x-1 transition-transform"
              >
                View details
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Invoice & Payment Statistics Section */}
      {(user?.role === 'project_lead' || user?.role === 'project_owner' || user?.role === 'super_admin') && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Invoices & Payments Overview</h2>
          </div>

          {/* Invoice Stats Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Invoices */}
            <div className="stat-card group hover:shadow-medium transition-all duration-300">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">Total Invoices</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.invoices.total}</p>
                  </div>
                  <div className="stat-card-icon bg-indigo-100 text-indigo-600 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="card-header bg-gradient-to-r from-indigo-50 to-indigo-100/50">
                <Link
                  to="/payments"
                  className="text-sm font-semibold text-indigo-700 hover:text-indigo-800 inline-flex items-center group-hover:translate-x-1 transition-transform"
                >
                  View all invoices
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Pending Invoices */}
            <div className="stat-card group hover:shadow-medium transition-all duration-300">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">Pending Invoices</p>
                    <p className="text-3xl font-bold text-orange-600">{stats.invoices.pending}</p>
                    <p className="text-xs text-gray-500 mt-1">₹{stats.invoices.pending_amount.toFixed(2)}</p>
                  </div>
                  <div className="stat-card-icon bg-orange-100 text-orange-600 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="card-header bg-gradient-to-r from-orange-50 to-orange-100/50">
                <Link
                  to="/payments"
                  className="text-sm font-semibold text-orange-700 hover:text-orange-800 inline-flex items-center group-hover:translate-x-1 transition-transform"
                >
                  View pending
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Total Invoice Amount */}
            <div className="stat-card group hover:shadow-medium transition-all duration-300">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">Total Invoice Amount</p>
                    <p className="text-3xl font-bold text-blue-600">₹{stats.invoices.total_amount.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">{stats.invoices.paid} paid</p>
                  </div>
                  <div className="stat-card-icon bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="card-header bg-gradient-to-r from-blue-50 to-blue-100/50">
                <Link
                  to="/payments"
                  className="text-sm font-semibold text-blue-700 hover:text-blue-800 inline-flex items-center group-hover:translate-x-1 transition-transform"
                >
                  View details
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Total Paid */}
            <div className="stat-card group hover:shadow-medium transition-all duration-300">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">Total Paid</p>
                    <p className="text-3xl font-bold text-green-600">₹{stats.invoices.total_paid.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">{stats.payments.total} payments</p>
                  </div>
                  <div className="stat-card-icon bg-green-100 text-green-600 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="card-header bg-gradient-to-r from-green-50 to-green-100/50">
                <Link
                  to="/payments"
                  className="text-sm font-semibold text-green-700 hover:text-green-800 inline-flex items-center group-hover:translate-x-1 transition-transform"
                >
                  View payments
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Invoices */}
          {recentInvoices.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-bold text-gray-900">Recent Invoices</h3>
              </div>
              <div className="card-body">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Invoice #</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Paid</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Remaining</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentInvoices.map((invoice) => {
                        const remaining = invoice.invoice_amount - (invoice.total_paid || 0)
                        const getStatusBadge = (status) => {
                          switch (status) {
                            case 'paid':
                              return 'bg-green-100 text-green-800'
                            case 'partial':
                              return 'bg-yellow-100 text-yellow-800'
                            default:
                              return 'bg-gray-100 text-gray-800'
                          }
                        }
                        return (
                          <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <Link
                                to="/payments"
                                className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                              >
                                #{invoice.id}
                              </Link>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {new Date(invoice.invoice_date).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-sm font-medium text-gray-900 text-right">
                              ₹{invoice.invoice_amount.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 text-right">
                              ₹{(invoice.total_paid || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-sm font-medium text-right">
                              <span className={remaining > 0 ? 'text-orange-600' : 'text-green-600'}>
                                ₹{remaining.toFixed(2)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(invoice.status)}`}>
                                {invoice.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-center">
                  <Link
                    to="/payments"
                    className="text-sm font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center"
                  >
                    View all invoices
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

