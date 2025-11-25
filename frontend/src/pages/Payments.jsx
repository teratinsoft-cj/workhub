import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function Payments() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [projects, setProjects] = useState([])
  const [projectsMap, setProjectsMap] = useState({})
  const [expandedInvoices, setExpandedInvoices] = useState(new Set())
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [invoicePayments, setInvoicePayments] = useState({}) // invoice_id -> payments[]
  const [statusFilter, setStatusFilter] = useState('pending') // Default to pending
  const [formData, setFormData] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  useEffect(() => {
    fetchInvoices()
    fetchProjects()
  }, [])

  const fetchInvoices = async () => {
    try {
      const response = await api.get('/payments/invoices')
      setInvoices(response.data)
      
      // Fetch payments for each invoice
      for (const invoice of response.data) {
        fetchInvoicePayments(invoice.id)
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
      toast.error('Failed to fetch invoices')
    }
  }

  const fetchInvoicePayments = async (invoiceId) => {
    try {
      const response = await api.get(`/payments/invoices/${invoiceId}/payments`)
      setInvoicePayments(prev => ({ ...prev, [invoiceId]: response.data }))
    } catch (error) {
      console.error('Error fetching payments:', error)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects')
      let userProjects = []
      if (user?.role === 'project_owner') {
        userProjects = response.data.filter(p => p.project_owner_id === user?.id)
      } else if (user?.role === 'project_lead') {
        userProjects = response.data.filter(p => p.project_lead_id === user?.id)
      } else if (user?.role === 'super_admin') {
        userProjects = response.data
      }
      setProjects(userProjects)
      const map = {}
      userProjects.forEach(p => {
        map[p.id] = p
      })
      setProjectsMap(map)
    } catch (error) {
      toast.error('Failed to fetch projects')
    }
  }

  const toggleInvoiceExpansion = (invoiceId) => {
    setExpandedInvoices(prev => {
      const newSet = new Set(prev)
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId)
      } else {
        newSet.add(invoiceId)
        // Fetch payments if not already loaded
        if (!invoicePayments[invoiceId]) {
          fetchInvoicePayments(invoiceId)
        }
      }
      return newSet
    })
  }

  const openPaymentModal = (invoice) => {
    setSelectedInvoice(invoice)
    setFormData({
      amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
    })
    setShowPaymentModal(true)
  }

  const handlePaymentSubmit = async (e) => {
    e.preventDefault()
    if (!selectedInvoice) return

    const remaining = selectedInvoice.invoice_amount - selectedInvoice.total_paid
    const paymentAmount = parseFloat(formData.amount)

    if (paymentAmount <= 0) {
      toast.error('Payment amount must be greater than 0')
      return
    }

    if (paymentAmount > remaining) {
      toast.error(`Payment amount cannot exceed remaining balance: ₹${remaining.toFixed(2)}`)
      return
    }

    try {
      await api.post('/payments/payments', {
        invoice_id: selectedInvoice.id,
        amount: paymentAmount,
        payment_date: new Date(formData.payment_date).toISOString(),
        notes: formData.notes,
      })
      toast.success('Payment recorded successfully!')
      setShowPaymentModal(false)
      setSelectedInvoice(null)
      fetchInvoices()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record payment')
    }
  }

  const handleFileUpload = async (paymentId, file) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      await api.post(`/payments/payments/${paymentId}/upload-evidence`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      toast.success('Evidence uploaded successfully!')
      // Refresh payments for the invoice
      if (selectedInvoice) {
        fetchInvoicePayments(selectedInvoice.id)
      }
      fetchInvoices()
    } catch (error) {
      toast.error('Failed to upload evidence')
    }
  }

  const printInvoice = (invoice) => {
    const printWindow = window.open('', '_blank')
    const project = projectsMap[invoice.project_id]
    const payments = invoicePayments[invoice.id] || []
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice #${invoice.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .invoice-details { margin-bottom: 30px; }
            .invoice-details table { width: 100%; border-collapse: collapse; }
            .invoice-details td { padding: 8px; border-bottom: 1px solid #ddd; }
            .invoice-details td:first-child { font-weight: bold; width: 200px; }
            .payments { margin-top: 30px; }
            .payments table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .payments th, .payments td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            .payments th { background-color: #f5f5f5; font-weight: bold; }
            .summary { margin-top: 30px; padding: 20px; background-color: #f9f9f9; border-radius: 5px; }
            .summary-row { display: flex; justify-content: space-between; margin: 10px 0; }
            .summary-row.total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Invoice #${invoice.id}</h1>
            <p><strong>Project:</strong> ${project?.name || 'N/A'}</p>
            <p><strong>Invoice Date:</strong> ${format(new Date(invoice.invoice_date), 'MMMM dd, yyyy')}</p>
          </div>
          
          <div class="invoice-details">
            <table>
              <tr>
                <td>Invoice Amount:</td>
                <td>₹${invoice.invoice_amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Total Paid:</td>
                <td>₹${invoice.total_paid.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Remaining Balance:</td>
                <td>₹${(invoice.invoice_amount - invoice.total_paid).toFixed(2)}</td>
              </tr>
              <tr>
                <td>Status:</td>
                <td><strong>${invoice.status.toUpperCase()}</strong></td>
              </tr>
              ${invoice.notes ? `<tr><td>Notes:</td><td>${invoice.notes}</td></tr>` : ''}
            </table>
          </div>
          
          ${payments.length > 0 ? `
            <div class="payments">
              <h2>Payment History</h2>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${payments.map(p => `
                    <tr>
                      <td>${format(new Date(p.payment_date), 'MMM dd, yyyy')}</td>
                      <td>₹${p.amount.toFixed(2)}</td>
                      <td>${p.notes || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
          
          <div class="summary">
            <div class="summary-row">
              <span>Invoice Amount:</span>
              <span>₹${invoice.invoice_amount.toFixed(2)}</span>
            </div>
            <div class="summary-row">
              <span>Total Paid:</span>
              <span>₹${invoice.total_paid.toFixed(2)}</span>
            </div>
            <div class="summary-row total">
              <span>Remaining Balance:</span>
              <span>₹${(invoice.invoice_amount - invoice.total_paid).toFixed(2)}</span>
            </div>
          </div>
          
          <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
            <p>Generated on ${format(new Date(), 'MMMM dd, yyyy hh:mm a')}</p>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const canMakePayment = user?.role === 'project_owner'
  const canPrint = user?.role === 'project_lead' || user?.role === 'project_owner' || user?.role === 'super_admin'

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'partial':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Filter invoices based on status
  const filteredInvoices = invoices.filter(invoice => {
    if (statusFilter === 'all') return true
    return invoice.status === statusFilter
  })

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoices & Payments</h1>
            <p className="mt-2 text-sm text-gray-600">
              {user?.role === 'project_owner' 
                ? 'View invoices and make payments against them'
                : user?.role === 'project_lead'
                ? 'View invoices you created. Project owners can make payments here.'
                : 'View all invoices and payment history'
              }
            </p>
            {user?.role === 'project_lead' && (
              <p className="mt-1 text-xs text-blue-600">
                💡 To create a new invoice, go to <strong>Task Billing</strong> menu
              </p>
            )}
          </div>
        </div>
        
        {/* Status Filter */}
        <div className="flex items-center space-x-2 mb-4">
          <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {filteredInvoices.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {invoices.length === 0 
              ? 'No invoices found' 
              : `No ${statusFilter === 'all' ? '' : statusFilter} invoices found`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map((invoice) => {
            const project = projectsMap[invoice.project_id]
            const payments = invoicePayments[invoice.id] || []
            const remaining = invoice.invoice_amount - invoice.total_paid
            const isExpanded = expandedInvoices.has(invoice.id)

            return (
              <div key={invoice.id} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-4">
                        <h3 className="text-xl font-semibold text-gray-900">
                          Invoice #{invoice.id}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(invoice.status)}`}>
                          {invoice.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Project</p>
                          <p className="font-medium">{project?.name || `Project #${invoice.project_id}`}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Invoice Amount</p>
                          <p className="font-medium">₹{invoice.invoice_amount.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Total Paid</p>
                          <p className="font-medium">₹{invoice.total_paid.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Remaining</p>
                          <p className="font-medium">₹{remaining.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="mt-4 text-sm text-gray-600">
                        <p>Invoice Date: {format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}</p>
                        {invoice.notes && (
                          <p className="mt-1">Notes: {invoice.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2 ml-4">
                      {canPrint && (
                        <button
                          onClick={() => printInvoice(invoice)}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium flex items-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          <span>Print</span>
                        </button>
                      )}
                      {canMakePayment && remaining > 0 && (
                        <button
                          onClick={() => openPaymentModal(invoice)}
                          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-medium"
                        >
                          Make Payment
                        </button>
                      )}
                      <button
                        onClick={() => toggleInvoiceExpansion(invoice.id)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium"
                      >
                        {isExpanded ? 'Hide' : 'Show'} Payments
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-6 border-t pt-6">
                      <h4 className="font-semibold mb-4">Payment History</h4>
                      {payments.length === 0 ? (
                        <p className="text-gray-500 text-sm">No payments recorded yet</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                                {canMakePayment && (
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Evidence</th>
                                )}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {payments.map((payment) => (
                                <tr key={payment.id}>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                    ₹{payment.amount.toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-500">
                                    {payment.notes || '-'}
                                  </td>
                                  {canMakePayment && (
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                      {payment.evidence_file ? (
                                        <a
                                          href={`http://localhost:8000/${payment.evidence_file}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary-600 hover:text-primary-700 inline-flex items-center"
                                        >
                                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                          </svg>
                                          View
                                        </a>
                                      ) : (
                                        <label className="cursor-pointer inline-flex items-center text-primary-600 hover:text-primary-700">
                                          <input
                                            type="file"
                                            className="hidden"
                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                            onChange={(e) => {
                                              if (e.target.files[0]) {
                                                handleFileUpload(payment.id, e.target.files[0])
                                              }
                                            }}
                                          />
                                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                          </svg>
                                          Upload
                                        </label>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium mb-4">Make Payment</h3>
            <div className="mb-4 p-3 bg-gray-50 rounded-md text-sm">
              <p><strong>Invoice Amount:</strong> ₹{selectedInvoice.invoice_amount.toFixed(2)}</p>
              <p><strong>Total Paid:</strong> ₹{selectedInvoice.total_paid.toFixed(2)}</p>
              <p><strong>Remaining:</strong> ₹{(selectedInvoice.invoice_amount - selectedInvoice.total_paid).toFixed(2)}</p>
            </div>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedInvoice.invoice_amount - selectedInvoice.total_paid}
                  required
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder={`Max: ₹${(selectedInvoice.invoice_amount - selectedInvoice.total_paid).toFixed(2)}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Payment Date *
                </label>
                <input
                  type="date"
                  required
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false)
                    setSelectedInvoice(null)
                  }}
                  className="px-4 py-2 bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
