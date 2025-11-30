import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { format } from 'date-fns'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    projects: 0,
    timesheets: 0,
    pending_timesheets: 0,
    approved_timesheets: 0,
    rejected_timesheets: 0,
    tasks: {
      total: 0,
      todo: 0,
      in_progress: 0,
      testing: 0,
      completed: 0,
    },
    earnings: 0,
    paid_amount: 0,
    pending_amount: 0,
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
  const [developerStats, setDeveloperStats] = useState({
    vouchers: {
      total: 0,
      pending: 0,
      partial: 0,
      paid: 0,
    },
    recentVouchers: [],
    recentPayments: [],
    pendingTasks: [],
  })
  const [leadStats, setLeadStats] = useState({
    vouchers: {
      total: 0,
      pending: 0,
      partial: 0,
      paid: 0,
      total_amount: 0,
      paid_amount: 0,
      pending_amount: 0,
    },
    payments: {
      total: 0,
      total_amount: 0,
    },
    recentVouchers: [],
    recentPayments: [],
  })

  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user])

  const fetchStats = async () => {
    if (!user) {
      console.log('[Dashboard] User not available yet, skipping fetch')
      return
    }
    
    console.log(`[Dashboard] Fetching stats for user: ${user?.full_name} (${user?.role})`)
    console.log(`[Dashboard] User object:`, user)
    console.log(`[Dashboard] User role type:`, typeof user?.role)
    console.log(`[Dashboard] User role value:`, user?.role)
    
    try {
      // Fetch projects
      let projects = 0
      try {
        const projectsRes = await api.get('/projects')
        console.log('[Dashboard] Projects raw response:', projectsRes)
        console.log('[Dashboard] Projects response.data:', projectsRes.data)
        
        const projectsData = Array.isArray(projectsRes.data) ? projectsRes.data : []
        projects = projectsData.length
        console.log(`[Dashboard] Fetched ${projects} projects for ${user?.role}:`, projectsData)
        
        if (projectsData.length > 0) {
          console.log('[Dashboard] Sample project:', projectsData[0])
        }
      } catch (error) {
        console.error('Error fetching projects:', error)
        console.error('Error response:', error.response?.data)
        console.error('Error status:', error.response?.status)
      }

      // Fetch timesheets (project owners don't have access)
      let timesheets = []
      let pending = 0
      let approved = 0
      let rejected = 0
      if (user?.role !== 'project_owner') {
        try {
          const timesheetsRes = await api.get('/timesheets')
          console.log('[Dashboard] Timesheets raw response:', timesheetsRes)
          console.log('[Dashboard] Timesheets response.data:', timesheetsRes.data)
          
          timesheets = Array.isArray(timesheetsRes.data) ? timesheetsRes.data : []
          console.log('[Dashboard] Timesheets array:', timesheets)
          
          pending = timesheets.filter((t) => t && t.status === 'pending').length
          approved = timesheets.filter((t) => t && t.status === 'approved').length
          rejected = timesheets.filter((t) => t && t.status === 'rejected').length
          console.log(`[Dashboard] Fetched ${timesheets.length} timesheets (${approved} approved, ${pending} pending, ${rejected} rejected)`)
        } catch (error) {
          console.error('Error fetching timesheets:', error)
          console.error('Error response:', error.response?.data)
          console.error('Error status:', error.response?.status)
        }
      }

      // Fetch tasks statistics
      let taskStats = {
        total: 0,
        todo: 0,
        in_progress: 0,
        testing: 0,
        completed: 0,
      }
      
      if (user?.role === 'developer') {
        try {
          const tasksRes = await api.get('/tasks/developer/my-tasks')
          console.log('[Dashboard] Developer tasks raw response:', tasksRes)
          console.log('[Dashboard] Developer tasks response.data:', tasksRes.data)
          
          const tasksData = Array.isArray(tasksRes.data) ? tasksRes.data : []
          console.log('[Dashboard] Developer tasks data (array):', tasksData)
          
          // Flatten tasks from all projects
          const allTasks = tasksData.flatMap(project => {
            if (!project || !project.tasks) return []
            return Array.isArray(project.tasks) ? project.tasks : []
          })
          
          console.log('[Dashboard] Developer allTasks (flattened):', allTasks)
          console.log('[Dashboard] Developer allTasks count:', allTasks.length)
          
          taskStats = {
            total: allTasks.length,
            todo: allTasks.filter(t => t && t.status === 'todo').length,
            in_progress: allTasks.filter(t => t && t.status === 'in_progress').length,
            testing: allTasks.filter(t => t && t.status === 'testing').length,
            completed: allTasks.filter(t => t && t.status === 'completed').length,
          }
          console.log('[Dashboard] Developer task stats:', taskStats)
        } catch (error) {
          console.error('Error fetching developer tasks:', error)
          console.error('Error response:', error.response?.data)
          console.error('Error status:', error.response?.status)
        }
      } else if (user?.role === 'project_lead' || user?.role === 'super_admin') {
        try {
          const tasksRes = await api.get('/tasks/lead/all-tasks')
          console.log('[Dashboard] Lead tasks raw response:', tasksRes)
          console.log('[Dashboard] Lead tasks response.data:', tasksRes.data)
          
          const allTasks = Array.isArray(tasksRes.data) ? tasksRes.data : []
          console.log('[Dashboard] Lead tasks data (array):', allTasks)
          console.log('[Dashboard] Lead tasks count:', allTasks.length)
          
          if (allTasks.length > 0) {
            console.log('[Dashboard] Sample task:', allTasks[0])
            console.log('[Dashboard] Sample task status:', allTasks[0]?.status)
          }
          
          taskStats = {
            total: allTasks.length,
            todo: allTasks.filter(t => t && t.status === 'todo').length,
            in_progress: allTasks.filter(t => t && t.status === 'in_progress').length,
            testing: allTasks.filter(t => t && t.status === 'testing').length,
            completed: allTasks.filter(t => t && t.status === 'completed').length,
          }
          console.log('[Dashboard] Lead task stats:', JSON.stringify(taskStats, null, 2))
          console.log('[Dashboard] Lead task stats breakdown:', {
            total: taskStats.total,
            todo: taskStats.todo,
            in_progress: taskStats.in_progress,
            testing: taskStats.testing,
            completed: taskStats.completed
          })
        } catch (error) {
          console.error('Error fetching lead tasks:', error)
          console.error('Error response:', error.response?.data)
          console.error('Error status:', error.response?.status)
        }
      } else if (user?.role === 'project_owner') {
        try {
          const tasksRes = await api.get('/tasks/owner/all-tasks')
          const allTasks = tasksRes.data || []
          console.log('[Dashboard] Owner tasks data:', allTasks)
          taskStats = {
            total: allTasks.length,
            todo: allTasks.filter(t => t.status === 'todo').length,
            in_progress: allTasks.filter(t => t.status === 'in_progress').length,
            testing: allTasks.filter(t => t.status === 'testing').length,
            completed: allTasks.filter(t => t.status === 'completed').length,
          }
          console.log('[Dashboard] Owner task stats:', taskStats)
        } catch (error) {
          console.error('Error fetching owner tasks:', error)
          console.error('Error response:', error.response?.data)
        }
      }

      let earnings = 0
      let paidAmount = 0
      let pendingAmount = 0
      let developerVoucherStats = {
        total: 0,
        pending: 0,
        partial: 0,
        paid: 0,
      }
      let recentVouchers = []
      let recentPayments = []
      let pendingTasks = []
      
      if (user?.role === 'developer') {
        try {
          const earningsRes = await api.get('/payments/earnings/developer')
          const earningsData = earningsRes.data || []
          console.log('[Dashboard] Developer earnings data:', earningsData)
          
          // Sum up all earnings from all vouchers
          earnings = earningsData.reduce((sum, earning) => sum + (earning.total_earnings || 0), 0)
          paidAmount = earningsData.reduce((sum, earning) => sum + (earning.paid_amount || 0), 0)
          pendingAmount = earningsData.reduce((sum, earning) => sum + (earning.pending_amount || 0), 0)
          
          // Calculate voucher statistics
          const voucherMap = new Map()
          earningsData.forEach(earning => {
            const voucherId = earning.voucher_id
            if (!voucherMap.has(voucherId)) {
              voucherMap.set(voucherId, {
                voucher_id: voucherId,
                voucher_date: earning.voucher_date,
                total_earnings: earning.total_earnings,
                paid_amount: earning.paid_amount,
                pending_amount: earning.pending_amount,
                project_name: earning.project_name,
                payment_history: earning.payment_history || [],
              })
            } else {
              // Aggregate if same voucher appears multiple times (different projects)
              const existing = voucherMap.get(voucherId)
              existing.total_earnings += earning.total_earnings
              existing.paid_amount += earning.paid_amount
              existing.pending_amount += earning.pending_amount
            }
          })
          
          const vouchers = Array.from(voucherMap.values())
          developerVoucherStats.total = vouchers.length
          
          vouchers.forEach(voucher => {
            if (voucher.pending_amount === 0) {
              developerVoucherStats.paid++
            } else if (voucher.paid_amount > 0) {
              developerVoucherStats.partial++
            } else {
              developerVoucherStats.pending++
            }
          })
          
          // Get recent vouchers (last 5, sorted by date)
          recentVouchers = vouchers
            .sort((a, b) => new Date(b.voucher_date) - new Date(a.voucher_date))
            .slice(0, 5)
          
          // Get recent payments from all payment histories
          const allPayments = []
          vouchers.forEach(voucher => {
            if (voucher.payment_history && voucher.payment_history.length > 0) {
              voucher.payment_history.forEach(payment => {
                allPayments.push({
                  ...payment,
                  voucher_id: voucher.voucher_id,
                  project_name: voucher.project_name,
                })
              })
            }
          })
          
          recentPayments = allPayments
            .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
            .slice(0, 5)
          
          console.log('[Dashboard] Developer voucher stats:', developerVoucherStats)
          console.log('[Dashboard] Recent vouchers:', recentVouchers)
          console.log('[Dashboard] Recent payments:', recentPayments)
        } catch (err) {
          console.error('Error fetching developer earnings:', err)
          console.error('Error response:', err.response?.data)
        }
        
        // Get pending tasks (tasks with status 'todo' or 'in_progress')
        try {
          const tasksRes = await api.get('/tasks/developer/my-tasks')
          const tasksData = tasksRes.data || []
          const allTasks = tasksData.flatMap(project => project.tasks || [])
          pendingTasks = allTasks
            .filter(t => t && (t.status === 'todo' || t.status === 'in_progress'))
            .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
            .slice(0, 5)
          
          console.log('[Dashboard] Pending tasks:', pendingTasks)
        } catch (err) {
          console.error('Error fetching pending tasks:', err)
        }
      }

      // Fetch invoices (for project owners, leads, and super admins)
      let invoices = []
      if (user?.role === 'project_owner' || user?.role === 'project_lead' || user?.role === 'super_admin') {
        try {
          const invoicesRes = await api.get('/payments/invoices')
          console.log('[Dashboard] Invoices raw response:', invoicesRes)
          console.log('[Dashboard] Invoices response.data:', invoicesRes.data)
          
          invoices = Array.isArray(invoicesRes.data) ? invoicesRes.data : []
          console.log(`[Dashboard] Fetched ${invoices.length} invoices for ${user?.role}:`, invoices)
          
          if (invoices.length > 0) {
            console.log('[Dashboard] Sample invoice:', invoices[0])
          }
        } catch (error) {
          console.error('Error fetching invoices:', error)
          console.error('Error details:', error.response?.data)
          console.error('Error status:', error.response?.status)
          // Project owners should have access, but handle gracefully
        }
      }

      // Fetch vouchers and payments for project leads
      let leadVoucherStats = {
        total: 0,
        pending: 0,
        partial: 0,
        paid: 0,
        total_amount: 0,
        paid_amount: 0,
        pending_amount: 0,
      }
      let leadPaymentStats = {
        total: 0,
        total_amount: 0,
      }
      let leadRecentVouchers = []
      let leadRecentPayments = []
      
      if (user?.role === 'project_lead' || user?.role === 'super_admin') {
        try {
          // Fetch vouchers
          const vouchersRes = await api.get('/developer-payments/vouchers')
          const vouchers = Array.isArray(vouchersRes.data) ? vouchersRes.data : []
          console.log('[Dashboard] Lead vouchers:', vouchers)
          
          leadVoucherStats.total = vouchers.length
          vouchers.forEach(voucher => {
            leadVoucherStats.total_amount += voucher.voucher_amount || 0
            leadVoucherStats.paid_amount += voucher.total_paid || 0
            leadVoucherStats.pending_amount += (voucher.voucher_amount || 0) - (voucher.total_paid || 0)
            
            if (voucher.status === 'paid') {
              leadVoucherStats.paid++
            } else if (voucher.status === 'partial') {
              leadVoucherStats.partial++
            } else {
              leadVoucherStats.pending++
            }
          })
          
          // Get recent vouchers (last 5)
          leadRecentVouchers = vouchers
            .sort((a, b) => new Date(b.voucher_date) - new Date(a.voucher_date))
            .slice(0, 5)
          
          console.log('[Dashboard] Lead voucher stats:', leadVoucherStats)
          console.log('[Dashboard] Recent vouchers:', leadRecentVouchers)
        } catch (error) {
          console.error('Error fetching vouchers:', error)
          console.error('Error response:', error.response?.data)
        }
        
        try {
          // Fetch developer payments
          const paymentsRes = await api.get('/developer-payments/payments')
          const payments = Array.isArray(paymentsRes.data) ? paymentsRes.data : []
          console.log('[Dashboard] Lead payments:', payments)
          
          leadPaymentStats.total = payments.length
          leadPaymentStats.total_amount = payments.reduce((sum, p) => sum + (p.payment_amount || 0), 0)
          
          // Get recent payments (last 5)
          leadRecentPayments = payments
            .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
            .slice(0, 5)
          
          console.log('[Dashboard] Lead payment stats:', leadPaymentStats)
          console.log('[Dashboard] Recent payments:', leadRecentPayments)
        } catch (error) {
          console.error('Error fetching developer payments:', error)
          console.error('Error response:', error.response?.data)
        }
      }

      // Calculate invoice statistics
      // Note: Partial payments are now treated as pending
      const invoiceStats = {
        total: invoices.length,
        pending: invoices.filter((inv) => inv.status === 'pending').length,
        partial: 0, // Partial status removed, all treated as pending
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

      const finalStats = {
        projects,
        timesheets: timesheets.length,
        pending_timesheets: pending,
        approved_timesheets: approved,
        rejected_timesheets: rejected,
        tasks: taskStats,
        earnings,
        paid_amount: paidAmount,
        pending_amount: pendingAmount,
        invoices: invoiceStats,
        payments: paymentStats,
      }
      
      console.log('='.repeat(50))
      console.log('[Dashboard] FINAL STATS SUMMARY')
      console.log('='.repeat(50))
      console.log('User Role:', user?.role)
      console.log('Projects:', projects)
      console.log('Timesheets:', { total: timesheets.length, approved, pending, rejected })
      console.log('Tasks:', taskStats)
      console.log('Earnings:', { total: earnings, paid: paidAmount, pending: pendingAmount })
      console.log('Final Stats Object:', finalStats)
      console.log('='.repeat(50))
      
      setStats(finalStats)
      setRecentInvoices(recent)
      
      // Set developer-specific stats
      if (user?.role === 'developer') {
        setDeveloperStats({
          vouchers: developerVoucherStats,
          recentVouchers,
          recentPayments,
          pendingTasks,
        })
      }
      
      // Set lead-specific stats
      if (user?.role === 'project_lead' || user?.role === 'super_admin') {
        setLeadStats({
          vouchers: leadVoucherStats,
          payments: leadPaymentStats,
          recentVouchers: leadRecentVouchers,
          recentPayments: leadRecentPayments,
        })
      }
      
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

        {/* Tasks Card */}
        {user?.role !== 'developer' && (
          <div className="stat-card group hover:shadow-medium transition-all duration-300">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Tasks</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.tasks.total}</p>
                </div>
                <div className="stat-card-icon bg-indigo-100 text-indigo-600 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="card-header bg-gradient-to-r from-indigo-50 to-indigo-100/50">
              <Link
                to={user?.role === 'developer' ? '/my-tasks' : '/tasks'}
                className="text-sm font-semibold text-indigo-700 hover:text-indigo-800 inline-flex items-center group-hover:translate-x-1 transition-transform"
              >
                View all tasks
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        )}

        {/* Timesheets Card */}
        {user?.role !== 'project_owner' && (
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
        )}

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

      {/* Developer Statistics Section */}
      {user?.role === 'developer' && (
        <div className="space-y-6">
          {/* Task & Timesheet Status Breakdown */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Task Status Breakdown */}
            <div className="card shadow-soft hover:shadow-medium transition-all duration-300">
              <div className="card-header bg-gradient-to-r from-indigo-50 to-indigo-100/50">
                <h3 className="text-lg font-semibold text-gray-900">Task Status</h3>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                      <span className="text-sm font-medium text-gray-700">Todo</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{stats.tasks.todo}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm font-medium text-gray-700">In Progress</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{stats.tasks.in_progress}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <span className="text-sm font-medium text-gray-700">Testing</span>
                    </div>
                    <span className="text-lg font-bold text-purple-600">{stats.tasks.testing}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-gray-700">Completed</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">{stats.tasks.completed}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Timesheet Status Breakdown */}
            <div className="card shadow-soft hover:shadow-medium transition-all duration-300">
              <div className="card-header bg-gradient-to-r from-purple-50 to-purple-100/50">
                <h3 className="text-lg font-semibold text-gray-900">Timesheet Status</h3>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-gray-700">Approved</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">{stats.approved_timesheets}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-sm font-medium text-gray-700">Pending</span>
                    </div>
                    <span className="text-lg font-bold text-yellow-600">{stats.pending_timesheets}</span>
                  </div>
                  {stats.rejected_timesheets > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-sm font-medium text-gray-700">Rejected</span>
                      </div>
                      <span className="text-lg font-bold text-red-600">{stats.rejected_timesheets}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Voucher Status & Recent Activity */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Voucher Status */}
            <div className="card shadow-soft hover:shadow-medium transition-all duration-300">
              <div className="card-header bg-gradient-to-r from-green-50 to-green-100/50">
                <h3 className="text-lg font-semibold text-gray-900">Payment Vouchers</h3>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-sm font-medium text-gray-700">Pending</span>
                    </div>
                    <span className="text-lg font-bold text-yellow-600">{developerStats.vouchers.pending}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span className="text-sm font-medium text-gray-700">Partial</span>
                    </div>
                    <span className="text-lg font-bold text-orange-600">{developerStats.vouchers.partial}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-gray-700">Paid</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">{developerStats.vouchers.paid}</span>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">Total</span>
                      <span className="text-lg font-bold text-gray-900">{developerStats.vouchers.total}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Vouchers */}
            <div className="card shadow-soft hover:shadow-medium transition-all duration-300">
              <div className="card-header bg-gradient-to-r from-blue-50 to-blue-100/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Vouchers</h3>
                  <Link to="/earnings" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                    View all
                  </Link>
                </div>
              </div>
              <div className="card-body">
                {developerStats.recentVouchers.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No vouchers yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {developerStats.recentVouchers.map((voucher) => (
                      <div key={voucher.voucher_id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Voucher #{voucher.voucher_id}</p>
                            <p className="text-xs text-gray-500">{voucher.project_name}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            voucher.pending_amount === 0 ? 'bg-green-100 text-green-800' :
                            voucher.paid_amount > 0 ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {voucher.pending_amount === 0 ? 'Paid' : voucher.paid_amount > 0 ? 'Partial' : 'Pending'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">{format(new Date(voucher.voucher_date), 'MMM dd, yyyy')}</span>
                          <span className="font-semibold text-gray-900">₹{voucher.total_earnings.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Payments */}
            <div className="card shadow-soft hover:shadow-medium transition-all duration-300">
              <div className="card-header bg-gradient-to-r from-emerald-50 to-emerald-100/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Payments</h3>
                  <Link to="/earnings" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                    View all
                  </Link>
                </div>
              </div>
              <div className="card-body">
                {developerStats.recentPayments.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No payments yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {developerStats.recentPayments.map((payment, idx) => (
                      <div key={payment.id || idx} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">₹{payment.payment_amount.toFixed(2)}</p>
                            <p className="text-xs text-gray-500">{payment.project_name}</p>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-800">
                            Paid
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">{format(new Date(payment.payment_date), 'MMM dd, yyyy')}</span>
                          <span className="text-gray-500">Voucher #{payment.voucher_id}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pending Tasks */}
          {developerStats.pendingTasks.length > 0 && (
            <div className="card shadow-soft hover:shadow-medium transition-all duration-300">
              <div className="card-header bg-gradient-to-r from-yellow-50 to-yellow-100/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Pending Tasks</h3>
                  <Link to="/my-tasks" className="text-xs text-yellow-600 hover:text-yellow-700 font-medium">
                    View all
                  </Link>
                </div>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  {developerStats.pendingTasks.map((task) => (
                    <div key={task.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                          {task.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ml-3 ${
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.status === 'in_progress' ? 'In Progress' : 'Todo'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invoice & Payment Statistics Section */}
      {(user?.role === 'project_lead' || user?.role === 'project_owner' || user?.role === 'super_admin') && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Invoices Overview</h2>
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
                    <p className="text-xs text-gray-500 mt-1">All invoices</p>
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

      {/* Voucher & Payment Statistics Section for Project Leads */}
      {(user?.role === 'project_lead' || user?.role === 'super_admin') && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Vouchers & Developer Payments</h2>
          </div>

          {/* Voucher Stats Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Vouchers */}
            <div className="stat-card group hover:shadow-medium transition-all duration-300">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">Total Vouchers</p>
                    <p className="text-3xl font-bold text-gray-900">{leadStats.vouchers.total}</p>
                  </div>
                  <div className="stat-card-icon bg-emerald-100 text-emerald-600 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="card-header bg-gradient-to-r from-emerald-50 to-emerald-100/50">
                <Link
                  to="/payment-vouchers"
                  className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center group-hover:translate-x-1 transition-transform"
                >
                  View all vouchers
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Pending Vouchers */}
            <div className="stat-card group hover:shadow-medium transition-all duration-300">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">Pending Vouchers</p>
                    <p className="text-3xl font-bold text-yellow-600">{leadStats.vouchers.pending}</p>
                    <p className="text-xs text-gray-500 mt-1">₹{leadStats.vouchers.pending_amount.toFixed(2)}</p>
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
                  to="/payment-vouchers?status=pending"
                  className="text-sm font-semibold text-yellow-700 hover:text-yellow-800 inline-flex items-center group-hover:translate-x-1 transition-transform"
                >
                  View pending
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Total Voucher Amount */}
            <div className="stat-card group hover:shadow-medium transition-all duration-300">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">Total Voucher Amount</p>
                    <p className="text-3xl font-bold text-blue-600">₹{leadStats.vouchers.total_amount.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">{leadStats.vouchers.paid} paid</p>
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
                  to="/payment-vouchers"
                  className="text-sm font-semibold text-blue-700 hover:text-blue-800 inline-flex items-center group-hover:translate-x-1 transition-transform"
                >
                  View all vouchers
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Total Payments */}
            <div className="stat-card group hover:shadow-medium transition-all duration-300">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">Total Payments</p>
                    <p className="text-3xl font-bold text-green-600">{leadStats.payments.total}</p>
                    <p className="text-xs text-gray-500 mt-1">₹{leadStats.payments.total_amount.toFixed(2)}</p>
                  </div>
                  <div className="stat-card-icon bg-green-100 text-green-600 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="card-header bg-gradient-to-r from-green-50 to-green-100/50">
                <Link
                  to="/developer-payments"
                  className="text-sm font-semibold text-green-700 hover:text-green-800 inline-flex items-center group-hover:translate-x-1 transition-transform"
                >
                  View all payments
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          {/* Voucher Status Breakdown & Recent Activity */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Voucher Status Breakdown */}
            <div className="card shadow-soft hover:shadow-medium transition-all duration-300">
              <div className="card-header bg-gradient-to-r from-emerald-50 to-emerald-100/50">
                <h3 className="text-lg font-semibold text-gray-900">Voucher Status</h3>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-sm font-medium text-gray-700">Pending</span>
                    </div>
                    <span className="text-lg font-bold text-yellow-600">{leadStats.vouchers.pending}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span className="text-sm font-medium text-gray-700">Partial</span>
                    </div>
                    <span className="text-lg font-bold text-orange-600">{leadStats.vouchers.partial}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-gray-700">Paid</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">{leadStats.vouchers.paid}</span>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">Total Amount</span>
                      <span className="text-lg font-bold text-gray-900">₹{leadStats.vouchers.total_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-600">Paid</span>
                      <span className="text-sm font-medium text-green-600">₹{leadStats.vouchers.paid_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Pending</span>
                      <span className="text-sm font-medium text-yellow-600">₹{leadStats.vouchers.pending_amount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Vouchers */}
            <div className="card shadow-soft hover:shadow-medium transition-all duration-300">
              <div className="card-header bg-gradient-to-r from-blue-50 to-blue-100/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Vouchers</h3>
                  <Link to="/payment-vouchers" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                    View all
                  </Link>
                </div>
              </div>
              <div className="card-body">
                {leadStats.recentVouchers.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No vouchers yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leadStats.recentVouchers.map((voucher) => (
                      <div key={voucher.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Voucher #{voucher.id}</p>
                            <p className="text-xs text-gray-500">{voucher.developer?.full_name || 'Developer'}</p>
                            <p className="text-xs text-gray-400">{voucher.project?.name || 'Project'}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            voucher.status === 'paid' ? 'bg-green-100 text-green-800' :
                            voucher.status === 'partial' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {voucher.status === 'paid' ? 'Paid' : voucher.status === 'partial' ? 'Partial' : 'Pending'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">{format(new Date(voucher.voucher_date), 'MMM dd, yyyy')}</span>
                          <span className="font-semibold text-gray-900">₹{voucher.voucher_amount.toFixed(2)}</span>
                        </div>
                        {voucher.total_paid > 0 && (
                          <div className="mt-1 text-xs text-gray-500">
                            Paid: ₹{voucher.total_paid.toFixed(2)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Payments */}
            <div className="card shadow-soft hover:shadow-medium transition-all duration-300">
              <div className="card-header bg-gradient-to-r from-green-50 to-green-100/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Payments</h3>
                  <Link to="/developer-payments" className="text-xs text-green-600 hover:text-green-700 font-medium">
                    View all
                  </Link>
                </div>
              </div>
              <div className="card-body">
                {leadStats.recentPayments.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No payments yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leadStats.recentPayments.map((payment) => (
                      <div key={payment.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">₹{payment.payment_amount.toFixed(2)}</p>
                            <p className="text-xs text-gray-500">{payment.developer?.full_name || 'Developer'}</p>
                            <p className="text-xs text-gray-400">{payment.project?.name || 'Project'}</p>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-800">
                            Paid
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">{format(new Date(payment.payment_date), 'MMM dd, yyyy')}</span>
                          {payment.voucher_id && (
                            <span className="text-gray-500">Voucher #{payment.voucher_id}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

