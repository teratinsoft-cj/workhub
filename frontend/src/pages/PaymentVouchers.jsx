import { useEffect, useState } from 'react'
import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export default function PaymentVouchers() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [vouchers, setVouchers] = useState([])
  const [projects, setProjects] = useState({})
  const [loading, setLoading] = useState(true)
  const [filterProject, setFilterProject] = useState('all')
  const [filterDeveloper, setFilterDeveloper] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedVoucher, setSelectedVoucher] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  // Redirect if not project lead or super admin
  useEffect(() => {
    if (user && user.role !== 'project_lead' && user.role !== 'super_admin') {
      navigate('/projects')
    }
  }, [user, navigate])

  useEffect(() => {
    if (user && (user.role === 'project_lead' || user.role === 'super_admin')) {
      fetchVouchers()
      fetchProjects()
    }
  }, [user])

  const fetchVouchers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/developer-payments/vouchers')
      setVouchers(response.data)
    } catch (error) {
      console.error('Error fetching vouchers:', error)
      toast.error('Failed to fetch payment vouchers')
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

  const handlePayVoucher = (voucher) => {
    setSelectedVoucher(voucher)
    setShowPaymentModal(true)
  }

  const handlePrintVoucher = (voucher) => {
    const printWindow = window.open('', '_blank')
    const printContent = generateVoucherHTML(voucher)
    
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.focus()
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const generateVoucherHTML = (voucher) => {
    const currentDate = new Date().toLocaleDateString()
    const voucherDate = new Date(voucher.voucher_date).toLocaleDateString()
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Voucher #${voucher.id}</title>
          <style>
            @media print {
              @page {
                margin: 20mm;
                size: A4;
              }
              body {
                margin: 0;
                padding: 0;
              }
              .no-print {
                display: none;
              }
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #333;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              color: #1f2937;
            }
            .header p {
              margin: 5px 0;
              color: #6b7280;
            }
            .voucher-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .info-section {
              background: #f9fafb;
              padding: 15px;
              border-radius: 8px;
            }
            .info-section h3 {
              margin: 0 0 10px 0;
              font-size: 14px;
              color: #6b7280;
              text-transform: uppercase;
            }
            .info-section p {
              margin: 5px 0;
              font-size: 16px;
              color: #111827;
              font-weight: 600;
            }
            .amount-section {
              text-align: center;
              background: #eff6ff;
              padding: 30px;
              border-radius: 8px;
              margin: 30px 0;
            }
            .amount-section .label {
              font-size: 14px;
              color: #6b7280;
              margin-bottom: 10px;
            }
            .amount-section .amount {
              font-size: 36px;
              font-weight: bold;
              color: #1e40af;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            table th {
              background: #f3f4f6;
              padding: 12px;
              text-align: left;
              font-weight: 600;
              border: 1px solid #e5e7eb;
            }
            table td {
              padding: 12px;
              border: 1px solid #e5e7eb;
            }
            .payment-history {
              margin-top: 30px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
            }
            .signature {
              text-align: center;
            }
            .signature-line {
              border-top: 1px solid #111827;
              margin-top: 60px;
              padding-top: 5px;
            }
            .notes {
              background: #fef3c7;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .status-badge {
              display: inline-block;
              padding: 5px 15px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              margin-left: 10px;
            }
            .status-pending { background: #fef3c7; color: #92400e; }
            .status-partial { background: #dbeafe; color: #1e40af; }
            .status-paid { background: #d1fae5; color: #065f46; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PAYMENT VOUCHER</h1>
            <p>WorkHub Payment Management System</p>
            <p>Generated on: ${currentDate}</p>
          </div>

          <div class="voucher-info">
            <div class="info-section">
              <h3>Voucher Details</h3>
              <p>Voucher #${voucher.id}</p>
              <p style="margin-top: 10px; font-size: 14px; color: #6b7280;">Date: ${voucherDate}</p>
              <span class="status-badge status-${voucher.status}">${voucher.status.charAt(0).toUpperCase() + voucher.status.slice(1)}</span>
            </div>
            <div class="info-section">
              <h3>Developer Information</h3>
              <p>${voucher.developer?.full_name || 'N/A'}</p>
              <p style="margin-top: 10px; font-size: 14px; color: #6b7280;">${voucher.developer?.email || ''}</p>
            </div>
            <div class="info-section">
              <h3>Project Information</h3>
              <p>${voucher.project?.name || 'N/A'}</p>
            </div>
            <div class="info-section">
              <h3>Payment Status</h3>
              <p>Paid: ₹${voucher.total_paid.toFixed(2)}</p>
              <p>Pending: ₹${(voucher.voucher_amount - voucher.total_paid).toFixed(2)}</p>
            </div>
          </div>

          <div class="amount-section">
            <div class="label">Total Voucher Amount</div>
            <div class="amount">₹${voucher.voucher_amount.toFixed(2)}</div>
          </div>

          ${voucher.tasks && voucher.tasks.length > 0 ? `
            <h3 style="margin-top: 30px; margin-bottom: 15px;">Tasks Included</h3>
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th style="text-align: right;">Hours</th>
                  <th style="text-align: right;">Rate</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${voucher.tasks.map(task => `
                  <tr>
                    <td>${task.title}</td>
                    <td style="text-align: right;">${task.productivity_hours.toFixed(2)} hrs</td>
                    <td style="text-align: right;">₹${task.hourly_rate.toFixed(2)}/hr</td>
                    <td style="text-align: right; font-weight: 600;">₹${task.amount.toFixed(2)}</td>
                  </tr>
                `).join('')}
                <tr style="background: #f3f4f6; font-weight: bold;">
                  <td colspan="3" style="text-align: right;">Total:</td>
                  <td style="text-align: right;">₹${voucher.voucher_amount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          ` : ''}

          ${voucher.payments && voucher.payments.length > 0 ? `
            <div class="payment-history">
              <h3>Payment History</h3>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th style="text-align: right;">Amount</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${voucher.payments.map(payment => `
                    <tr>
                      <td>${new Date(payment.payment_date).toLocaleDateString()}</td>
                      <td style="text-align: right; font-weight: 600; color: #059669;">₹${payment.payment_amount.toFixed(2)}</td>
                      <td>${payment.notes || '-'}</td>
                    </tr>
                  `).join('')}
                  <tr style="background: #f3f4f6; font-weight: bold;">
                    <td>Total Paid:</td>
                    <td style="text-align: right;">₹${voucher.total_paid.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          ` : ''}

          ${voucher.notes ? `
            <div class="notes">
              <strong>Notes:</strong> ${voucher.notes}
            </div>
          ` : ''}

          <div class="footer">
            <div class="signature">
              <div class="signature-line">Developer Signature</div>
            </div>
            <div class="signature">
              <div class="signature-line">Authorized Signature</div>
            </div>
          </div>
        </body>
      </html>
    `
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

  // Get unique developer IDs for filter
  const developerIds = [...new Set(vouchers.map(v => v.developer_id))]

  // Filter vouchers
  const filteredVouchers = vouchers.filter(v => {
    if (filterProject !== 'all' && v.project_id !== parseInt(filterProject)) {
      return false
    }
    if (filterDeveloper !== 'all' && v.developer_id !== parseInt(filterDeveloper)) {
      return false
    }
    if (filterStatus !== 'all' && v.status !== filterStatus) {
      return false
    }
    return true
  })

  // Calculate summary statistics
  const summaryStats = filteredVouchers.reduce((acc, voucher) => {
    acc.totalVouchers += 1
    acc.totalAmount += voucher.voucher_amount
    acc.totalPaid += voucher.total_paid
    acc.totalPending += (voucher.voucher_amount - voucher.total_paid)
    
    if (voucher.status === 'pending') acc.pendingCount += 1
    if (voucher.status === 'partial') acc.partialCount += 1
    if (voucher.status === 'paid') acc.paidCount += 1
    
    return acc
  }, {
    totalVouchers: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalPending: 0,
    pendingCount: 0,
    partialCount: 0,
    paidCount: 0
  })

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      partial: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800'
    }
    return badges[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Payment Vouchers</h1>
        <p className="text-gray-600 text-lg">
          View payment vouchers and make payments against them
        </p>
      </div>

      {/* Summary Card */}
      <div className="card shadow-lg border-0 bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="card-body">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Total Vouchers</div>
              <div className="text-2xl font-bold text-gray-900">{summaryStats.totalVouchers}</div>
              <div className="text-xs text-gray-500 mt-1">
                {summaryStats.pendingCount} Pending • {summaryStats.partialCount} Partial • {summaryStats.paidCount} Paid
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Total Amount</div>
              <div className="text-2xl font-bold text-blue-600">₹{summaryStats.totalAmount.toFixed(2)}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Total Paid</div>
              <div className="text-2xl font-bold text-green-600">₹{summaryStats.totalPaid.toFixed(2)}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Total Pending</div>
              <div className="text-2xl font-bold text-orange-600">₹{summaryStats.totalPending.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Filter by Project
              </label>
              <select
                className="input"
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
              >
                <option value="all">All Projects</option>
                {Object.values(projects).map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
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
                  const voucher = vouchers.find(v => v.developer_id === developerId)
                  return (
                    <option key={developerId} value={developerId}>
                      {voucher?.developer?.full_name || `Developer ${developerId}`}
                    </option>
                  )
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                className="input"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Vouchers List */}
      {filteredVouchers.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <p className="text-gray-500 text-lg">No payment vouchers found</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredVouchers.map((voucher) => {
            const remainingAmount = voucher.voucher_amount - voucher.total_paid
            return (
              <div key={voucher.id} className="card shadow-lg">
                <div className="card-body">
                  <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          Voucher #{voucher.id}
                        </h3>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(voucher.status)}`}>
                          {voucher.status.charAt(0).toUpperCase() + voucher.status.slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <button
                          onClick={() => handlePrintVoucher(voucher)}
                          className="text-sm text-primary-600 hover:text-primary-700 flex items-center px-3 py-1 border border-primary-300 rounded hover:bg-primary-50 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          Print Voucher
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Developer</div>
                          <div className="font-semibold text-gray-900">{voucher.developer?.full_name || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Project</div>
                          <div className="font-semibold text-gray-900">{voucher.project?.name || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Voucher Date</div>
                          <div className="font-semibold text-gray-900">
                            {new Date(voucher.voucher_date).toLocaleDateString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600">Voucher Amount</div>
                          <div className="font-bold text-primary-600 text-lg">
                            ₹{voucher.voucher_amount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Summary */}
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Total Paid</div>
                        <div className="font-bold text-green-600">₹{voucher.total_paid.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Remaining</div>
                        <div className="font-bold text-orange-600">₹{remainingAmount.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Progress</div>
                        <div className="font-bold text-gray-900">
                          {((voucher.total_paid / voucher.voucher_amount) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min((voucher.total_paid / voucher.voucher_amount) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Tasks */}
                  {voucher.tasks && voucher.tasks.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Tasks ({voucher.tasks.length})</h4>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Task</th>
                                <th className="px-4 py-2 text-right font-semibold text-gray-700">Hours</th>
                                <th className="px-4 py-2 text-right font-semibold text-gray-700">Rate</th>
                                <th className="px-4 py-2 text-right font-semibold text-gray-700">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {voucher.tasks.map((task) => (
                                <tr key={task.id}>
                                  <td className="px-4 py-2">
                                    <div className="font-medium text-gray-900">{task.title}</div>
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    {task.productivity_hours.toFixed(2)} hrs
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    ₹{task.hourly_rate.toFixed(2)}/hr
                                  </td>
                                  <td className="px-4 py-2 text-right font-semibold text-primary-600">
                                    ₹{task.amount.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment History */}
                  {voucher.payments && voucher.payments.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Payment History</h4>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Date</th>
                                <th className="px-4 py-2 text-right font-semibold text-gray-700">Amount</th>
                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Notes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {voucher.payments.map((payment) => (
                                <tr key={payment.id}>
                                  <td className="px-4 py-2">
                                    {new Date(payment.payment_date).toLocaleDateString()}
                                  </td>
                                  <td className="px-4 py-2 text-right font-semibold text-green-600">
                                    ₹{payment.payment_amount.toFixed(2)}
                                  </td>
                                  <td className="px-4 py-2 text-gray-600">
                                    {payment.notes || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {voucher.notes && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm font-semibold text-gray-700 mb-1">Notes</div>
                      <div className="text-sm text-gray-600">{voucher.notes}</div>
                    </div>
                  )}

                  {/* Pay Button */}
                  {remainingAmount > 0.01 && (
                    <div className="flex justify-end pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handlePayVoucher(voucher)}
                        className="btn btn-primary"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Pay ₹{remainingAmount.toFixed(2)}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedVoucher && (
        <PaymentModal
          voucher={selectedVoucher}
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedVoucher(null)
          }}
          onSuccess={() => {
            setShowPaymentModal(false)
            setSelectedVoucher(null)
            fetchVouchers()
          }}
        />
      )}
    </div>
  )
}

// Payment Modal Component
function PaymentModal({ voucher, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    payment_amount: (voucher.voucher_amount - voucher.total_paid).toFixed(2),
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [loading, setLoading] = useState(false)

  const remainingAmount = voucher.voucher_amount - voucher.total_paid

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      payment_amount: remainingAmount.toFixed(2)
    }))
  }, [remainingAmount])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const paymentAmount = parseFloat(formData.payment_amount)
    
    if (paymentAmount <= 0) {
      toast.error('Payment amount must be greater than 0')
      return
    }
    
    if (paymentAmount > remainingAmount + 0.01) {
      toast.error(`Payment amount cannot exceed remaining amount of ₹${remainingAmount.toFixed(2)}`)
      return
    }
    
    setLoading(true)
    try {
      const payload = {
        voucher_id: voucher.id,
        payment_amount: paymentAmount,
        payment_date: new Date(formData.payment_date).toISOString(),
        notes: formData.notes || null,
      }
      
      await api.post('/developer-payments/pay', payload)
      toast.success('Payment processed successfully!')
      onSuccess()
    } catch (error) {
      console.error('Error processing payment:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to process payment'
      toast.error(`Payment failed: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Pay Against Voucher</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="card-body">
          {/* Voucher Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Voucher #{voucher.id}</div>
            <div className="text-lg font-bold text-gray-900">
              {voucher.developer?.full_name || 'N/A'} - {voucher.project?.name || 'N/A'}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Voucher Amount: <span className="font-semibold">₹{voucher.voucher_amount.toFixed(2)}</span> • 
              Paid: <span className="font-semibold text-green-600">₹{voucher.total_paid.toFixed(2)}</span> • 
              Remaining: <span className="font-semibold text-orange-600">₹{remainingAmount.toFixed(2)}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Payment Amount */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={remainingAmount}
                required
                className="input"
                value={formData.payment_amount}
                onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })}
                placeholder="Enter payment amount"
              />
              <p className="mt-1 text-xs text-gray-500">
                Maximum: ₹{remainingAmount.toFixed(2)}
              </p>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Date *
              </label>
              <input
                type="date"
                required
                className="input"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                rows={3}
                className="input"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this payment..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Process Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

