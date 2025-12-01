import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function Accounting() {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterProject, setFilterProject] = useState('all')
  const [filterTransactionType, setFilterTransactionType] = useState('all')
  const [filterAccountType, setFilterAccountType] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [projects, setProjects] = useState({})

  useEffect(() => {
    if (user && (user.role === 'project_lead' || user.role === 'super_admin')) {
      fetchEntries()
      fetchSummary()
      fetchProjects()
    }
  }, [user, filterProject, filterTransactionType, filterAccountType, startDate, endDate])

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

  const fetchEntries = async () => {
    try {
      setLoading(true)
      const params = {}
      if (filterProject !== 'all') {
        params.project_id = parseInt(filterProject)
      }
      if (filterTransactionType !== 'all') {
        params.transaction_type = filterTransactionType
      }
      if (filterAccountType !== 'all') {
        params.account_type = filterAccountType
      }
      if (startDate) {
        params.start_date = startDate
      }
      if (endDate) {
        params.end_date = endDate
      }

      const response = await api.get('/accounting/entries', { params })
      setEntries(response.data)
    } catch (error) {
      console.error('Error fetching accounting entries:', error)
      toast.error('Failed to fetch accounting entries')
    } finally {
      setLoading(false)
    }
  }

  const fetchSummary = async () => {
    try {
      const params = {}
      if (filterProject !== 'all') {
        params.project_id = parseInt(filterProject)
      }
      if (startDate) {
        params.start_date = startDate
      }
      if (endDate) {
        params.end_date = endDate
      }

      const response = await api.get('/accounting/summary', { params })
      setSummary(response.data)
    } catch (error) {
      console.error('Error fetching accounting summary:', error)
    }
  }

  const getAccountTypeLabel = (type) => {
    const labels = {
      'accounts_receivable': 'Accounts Receivable',
      'accounts_payable': 'Accounts Payable',
      'cash': 'Cash',
      'bank': 'Bank',
      'revenue': 'Revenue',
      'expense': 'Expense'
    }
    return labels[type] || type
  }

  const getTransactionTypeLabel = (type) => {
    const labels = {
      'invoice_created': 'Invoice Created',
      'invoice_payment': 'Invoice Payment',
      'voucher_created': 'Voucher Created',
      'voucher_payment': 'Voucher Payment'
    }
    return labels[type] || type
  }

  const getEntryTypeColor = (type) => {
    return type === 'debit' 
      ? 'text-red-600 bg-red-50' 
      : 'text-green-600 bg-green-50'
  }

  if (user?.role !== 'project_lead' && user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500 text-lg">You don't have permission to view accounting</p>
        </div>
      </div>
    )
  }

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const projectIds = [...new Set(entries.map(e => e.project_id).filter(Boolean))]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mb-3">
        <h1 className="text-2xl font-bold text-gray-900">Accounting Ledger</h1>
        <p className="text-gray-600 text-xs">
          Track all credits and debits from invoices, vouchers, and payments
        </p>
      </div>

      {/* Profit & Loss and Reconciliation - Side by Side */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
          {/* Profit & Loss Statement */}
          <div className="card border border-gray-200">
            <div className="card-header bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200 py-2">
              <h2 className="text-lg font-bold text-gray-900">Profit & Loss</h2>
            </div>
            <div className="card-body py-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium text-gray-700">Revenue</span>
                  </div>
                  <span className="text-xl font-bold text-green-600">₹{(summary.total_revenue || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                    <span className="text-sm font-medium text-gray-700">Expenses</span>
                  </div>
                  <span className="text-xl font-bold text-red-600">₹{(summary.total_expenses || 0).toFixed(2)}</span>
                </div>
                <div className={`flex items-center justify-between py-1.5 rounded px-2 ${
                  (summary.profit_loss || 0) >= 0 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <span className={`text-sm font-semibold ${(summary.profit_loss || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {(summary.profit_loss || 0) >= 0 ? 'Net Profit' : 'Net Loss'}
                  </span>
                  <span className={`text-xl font-bold ${(summary.profit_loss || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    ₹{Math.abs(summary.profit_loss || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ledger Reconciliation */}
          <div className="card border border-blue-200">
            <div className="card-header bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 py-2">
              <h2 className="text-lg font-bold text-gray-900">Reconciliation</h2>
            </div>
            <div className="card-body py-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium text-gray-700">Total Credits</span>
                  </div>
                  <span className="text-xl font-bold text-green-600">₹{summary.total_credits.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                    <span className="text-sm font-medium text-gray-700">Total Debits</span>
                  </div>
                  <span className="text-xl font-bold text-red-600">₹{summary.total_debits.toFixed(2)}</span>
                </div>
                <div className={`flex items-center justify-between py-1.5 rounded px-2 ${
                  summary.balance === 0 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <span className={`text-sm font-semibold ${summary.balance === 0 ? 'text-green-700' : 'text-yellow-700'}`}>
                    Balance {summary.balance === 0 ? '✓' : '⚠'}
                  </span>
                  <span className={`text-xl font-bold ${summary.balance === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                    ₹{summary.balance.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Balances - Compact */}
      {summary && (
        <div className="card mb-3">
          <div className="card-header py-1.5">
            <h3 className="text-base font-semibold text-gray-900">Account Balances</h3>
          </div>
          <div className="card-body py-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="text-center p-2 bg-blue-50 rounded border border-blue-100">
                <p className="text-xs font-medium text-gray-600 mb-1">Accounts Receivable</p>
                <p className="text-lg font-bold text-blue-600">₹{summary.accounts_receivable.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">Outstanding invoices</p>
              </div>
              <div className="text-center p-2 bg-orange-50 rounded border border-orange-100">
                <p className="text-xs font-medium text-gray-600 mb-1">Accounts Payable</p>
                <p className="text-lg font-bold text-orange-600">₹{summary.accounts_payable.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">Outstanding vouchers</p>
              </div>
              <div className="text-center p-2 bg-green-50 rounded border border-green-100">
                <p className="text-xs font-medium text-gray-600 mb-1">Cash In</p>
                <p className="text-lg font-bold text-green-600">₹{summary.cash_in.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">Payments received</p>
              </div>
              <div className="text-center p-2 bg-red-50 rounded border border-red-100">
                <p className="text-xs font-medium text-gray-600 mb-1">Cash Out</p>
                <p className="text-lg font-bold text-red-600">₹{summary.cash_out.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">Payments made</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Project
              </label>
              <select
                className="input text-sm py-1.5"
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
              >
                <option value="all">All Projects</option>
                {projectIds.map(projectId => (
                  <option key={projectId} value={projectId}>
                    {projects[projectId]?.name || `Project ${projectId}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Transaction
              </label>
              <select
                className="input text-sm py-1.5"
                value={filterTransactionType}
                onChange={(e) => setFilterTransactionType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="invoice_created">Invoice Created</option>
                <option value="invoice_payment">Invoice Payment</option>
                <option value="voucher_created">Voucher Created</option>
                <option value="voucher_payment">Voucher Payment</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Account
              </label>
              <select
                className="input text-sm py-1.5"
                value={filterAccountType}
                onChange={(e) => setFilterAccountType(e.target.value)}
              >
                <option value="all">All Accounts</option>
                <option value="accounts_receivable">Accounts Receivable</option>
                <option value="accounts_payable">Accounts Payable</option>
                <option value="cash">Cash</option>
                <option value="revenue">Revenue</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Start Date
              </label>
              <input
                type="date"
                className="input text-sm py-1.5"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                End Date
              </label>
              <input
                type="date"
                className="input text-sm py-1.5"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="card">
        <div className="card-header py-1.5">
          <h3 className="text-base font-semibold text-gray-900">Accounting Ledger</h3>
        </div>
        <div className="card-body py-2">
          {entries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No accounting entries found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Account</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Description</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Reference</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Project</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Debit</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {format(new Date(entry.transaction_date), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-gray-600">
                          {getTransactionTypeLabel(entry.transaction_type)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-gray-600">
                          {getAccountTypeLabel(entry.account_type)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{entry.description || '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-primary-600">
                          {entry.reference_number || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600">
                          {entry.project_id ? (projects[entry.project_id]?.name || `Project ${entry.project_id}`) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {entry.entry_type === 'debit' ? (
                          <span className="font-semibold text-red-600">₹{entry.amount.toFixed(2)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {entry.entry_type === 'credit' ? (
                          <span className="font-semibold text-green-600">₹{entry.amount.toFixed(2)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

