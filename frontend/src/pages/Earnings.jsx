import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'

function PaymentHistoryModal({ isOpen, onClose, payments, voucherId, projectName }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Payment History</h3>
              <p className="text-sm text-gray-600 mt-1">
                Voucher #{voucherId} • {projectName}
              </p>
            </div>
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
          {!payments || payments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No payments recorded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="text-2xl font-bold text-primary-600">
                          ₹{payment.payment_amount.toFixed(2)}
                        </div>
                        <div className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                          Paid
                        </div>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="font-medium">Payment Date:</span>
                          <span className="ml-2">{new Date(payment.payment_date).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium">Recorded At:</span>
                          <span className="ml-2">{new Date(payment.created_at).toLocaleString()}</span>
                        </div>
                        {payment.notes && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <div className="text-xs text-gray-500 font-medium mb-1">Notes:</div>
                            <div className="text-sm text-gray-700 italic">{payment.notes}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PaymentHistory({ payments, voucherId, projectName }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  if (!payments || payments.length === 0) {
    return (
      <span className="text-xs text-gray-400 italic">No payments yet</span>
    )
  }
  
  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
        <span>{payments.length} payment{payments.length !== 1 ? 's' : ''}</span>
      </button>
      
      <PaymentHistoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        payments={payments}
        voucherId={voucherId}
        projectName={projectName}
      />
    </>
  )
}

export default function Earnings() {
  const { user } = useAuth()
  const [earnings, setEarnings] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [projects, setProjects] = useState([])

  useEffect(() => {
    fetchEarnings()
    fetchProjects()
  }, [selectedProject])

  const fetchEarnings = async () => {
    try {
      const params = selectedProject ? { project_id: selectedProject } : {}
      const response = await api.get('/payments/earnings/developer', { params })
      setEarnings(response.data)
    } catch (error) {
      toast.error('Failed to fetch earnings')
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects')
      setProjects(response.data)
    } catch (error) {
      toast.error('Failed to fetch projects')
    }
  }

  const handlePrintVoucher = async (earning) => {
    try {
      // Fetch full voucher details
      const response = await api.get(`/developer-payments/vouchers/${earning.voucher_id}`)
      const voucher = response.data
      
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
    } catch (error) {
      console.error('Error fetching voucher details:', error)
      toast.error('Failed to load voucher details for printing')
    }
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

  if (user?.role !== 'developer') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">You don't have access to this page</p>
      </div>
    )
  }

  const totalEarnings = earnings.reduce((sum, e) => sum + e.total_earnings, 0)
  const totalPaid = earnings.reduce((sum, e) => sum + e.paid_amount, 0)
  const totalPending = earnings.reduce((sum, e) => sum + e.pending_amount, 0)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Earnings</h1>
        <p className="mt-2 text-sm text-gray-600">
          Track your earnings and payments
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">💰</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Earnings
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ₹{totalEarnings.toFixed(2)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">✅</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Paid Amount
                  </dt>
                  <dd className="text-lg font-medium text-green-600">
                    ₹{totalPaid.toFixed(2)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">⏳</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Amount
                  </dt>
                  <dd className="text-lg font-medium text-yellow-600">
                    ₹{totalPending.toFixed(2)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Project
        </label>
        <select
          className="block w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Earnings Table */}
      {earnings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg font-medium mb-1">No earnings data available</p>
            <p className="text-gray-400 text-sm">Payment vouchers need to be created for you to see earnings</p>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Voucher No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Earnings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pending
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment History
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {earnings.map((earning, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                      {earning.project_name || 'Unknown Project'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <div className="flex items-center space-x-2">
                        <span>#{earning.voucher_id}</span>
                        <button
                          onClick={() => handlePrintVoucher(earning)}
                          className="text-primary-600 hover:text-primary-700"
                          title="Print Voucher"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(earning.voucher_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹{earning.total_earnings.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      ₹{earning.paid_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-yellow-600">
                      ₹{earning.pending_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <PaymentHistory 
                        payments={earning.payment_history || []} 
                        voucherId={earning.voucher_id}
                        projectName={earning.project_name || 'Unknown Project'}
                      />
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

