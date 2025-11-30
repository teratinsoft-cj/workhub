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
  const [invoiceTasks, setInvoiceTasks] = useState({}) // invoice_id -> tasks[]
  const [showDescriptionModal, setShowDescriptionModal] = useState(false)
  const [selectedTaskDescription, setSelectedTaskDescription] = useState(null)
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
      
      // Fetch payments and tasks for each invoice
      for (const invoice of response.data) {
        fetchInvoicePayments(invoice.id)
        fetchInvoiceTasks(invoice.id)
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

  const fetchInvoiceTasks = async (invoiceId) => {
    try {
      const response = await api.get(`/payments/invoices/${invoiceId}/tasks`)
      setInvoiceTasks(prev => ({ ...prev, [invoiceId]: response.data }))
    } catch (error) {
      console.error('Error fetching invoice tasks:', error)
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
        // Fetch payments and tasks if not already loaded
        if (!invoicePayments[invoiceId]) {
          fetchInvoicePayments(invoiceId)
        }
        if (!invoiceTasks[invoiceId]) {
          fetchInvoiceTasks(invoiceId)
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

  const printInvoice = async (invoice) => {
    // Fetch tasks if not already loaded
    if (!invoiceTasks[invoice.id]) {
      await fetchInvoiceTasks(invoice.id)
    }
    
    const printWindow = window.open('', '_blank')
    const project = projectsMap[invoice.project_id]
    const payments = invoicePayments[invoice.id] || []
    const tasks = invoiceTasks[invoice.id] || []
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice #${invoice.id}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Arial', 'Helvetica', sans-serif; 
              font-size: 12px;
              line-height: 1.4;
              padding: 15px;
              color: #333;
            }
            .invoice-container {
              max-width: 210mm;
              margin: 0 auto;
            }
            .header {
              border-bottom: 3px solid #2563eb;
              padding-bottom: 15px;
              margin-bottom: 15px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .header-left h1 {
              font-size: 28px;
              color: #2563eb;
              margin-bottom: 6px;
            }
            .header-left p {
              font-size: 12px;
              color: #666;
              margin: 3px 0;
            }
            .header-right {
              text-align: right;
              font-size: 12px;
            }
            .invoice-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 15px;
            }
            .info-box {
              background: #f8f9fa;
              padding: 12px;
              border-radius: 4px;
              border-left: 3px solid #2563eb;
            }
            .info-box h3 {
              font-size: 10px;
              color: #666;
              margin-bottom: 5px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .info-box p {
              font-size: 14px;
              font-weight: bold;
              color: #333;
            }
            .section-title {
              font-size: 14px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 8px;
              padding-bottom: 5px;
              border-bottom: 2px solid #e5e7eb;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
              margin-bottom: 15px;
            }
            thead {
              background-color: #2563eb;
              color: white;
            }
            thead th {
              padding: 8px 10px;
              text-align: left;
              font-weight: 600;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            tbody td {
              padding: 8px 10px;
              border-bottom: 1px solid #e5e7eb;
              vertical-align: top;
            }
            tbody tr:last-child td {
              border-bottom: none;
            }
            .task-title {
              font-weight: 600;
              color: #333;
              font-size: 12px;
            }
            tfoot {
              background-color: #f8f9fa;
              font-weight: bold;
            }
            tfoot td {
              padding: 10px;
              border-top: 2px solid #2563eb;
              font-size: 13px;
            }
            .summary-box {
              background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
              color: white;
              padding: 15px;
              border-radius: 4px;
              margin-top: 15px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
              font-size: 13px;
            }
            .summary-row.total {
              font-size: 16px;
              font-weight: bold;
              border-top: 2px solid rgba(255,255,255,0.3);
              padding-top: 8px;
              margin-top: 5px;
            }
            .footer {
              margin-top: 15px;
              text-align: center;
              font-size: 10px;
              color: #999;
              padding-top: 10px;
              border-top: 1px solid #e5e7eb;
            }
            @media print {
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              body { 
                padding: 10mm;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                color-adjust: exact;
              }
              .invoice-container { max-width: 100%; }
              thead {
                background-color: #2563eb !important;
                color: white !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                color-adjust: exact;
              }
              thead th {
                background-color: #2563eb !important;
                color: white !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                color-adjust: exact;
              }
              .summary-box {
                background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%) !important;
                color: white !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                color-adjust: exact;
              }
              .header {
                border-bottom-color: #2563eb !important;
              }
              .header-left h1 {
                color: #2563eb !important;
              }
              .section-title {
                color: #2563eb !important;
                border-bottom-color: #e5e7eb !important;
              }
              .info-box {
                background: #f8f9fa !important;
                border-left-color: #2563eb !important;
              }
              tfoot {
                background-color: #f8f9fa !important;
              }
              tfoot td {
                border-top-color: #2563eb !important;
              }
              tfoot td:last-child {
                color: #2563eb !important;
              }
              tbody td:last-child {
                color: #2563eb !important;
              }
              .summary-box * {
                color: white !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                color-adjust: exact;
              }
              @page { 
                margin: 10mm; 
                size: A4 portrait; 
              }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="header-left">
                <h1>INVOICE #${invoice.id}</h1>
                <p><strong>Project:</strong> ${project?.name || 'N/A'}</p>
                <p><strong>Date:</strong> ${format(new Date(invoice.invoice_date), 'MMMM dd, yyyy')}</p>
              </div>
              <div class="header-right">
                <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
                ${invoice.notes ? `<p style="margin-top: 4px;"><strong>Notes:</strong><br/>${invoice.notes}</p>` : ''}
              </div>
            </div>
            
            <div class="invoice-info">
              <div class="info-box">
                <h3>Invoice Amount</h3>
                <p>₹${invoice.invoice_amount.toFixed(2)}</p>
              </div>
              <div class="info-box">
                <h3>Total Paid</h3>
                <p>₹${invoice.total_paid.toFixed(2)}</p>
              </div>
            </div>
            
            ${tasks.length > 0 ? `
              <div>
                <div class="section-title">Work Summary</div>
                <table>
                  <thead>
                    <tr>
                      <th style="width: 8%;">S.No.</th>
                      <th style="width: 62%;">Work Summary</th>
                      <th style="width: 30%; text-align: right;">Billable Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${tasks.map((task, index) => {
                      const summary = task.track_summary || (task.title && task.description ? `${task.title}\n\n${task.description}` : task.title || task.description || 'No summary available')
                      return `
                      <tr>
                        <td style="text-align: center; vertical-align: top; font-weight: 600;">${index + 1}</td>
                        <td style="vertical-align: top;">
                          <div style="font-size: 12px; color: #666; line-height: 1.6; white-space: pre-wrap;">${summary}</div>
                        </td>
                        <td style="text-align: right; font-weight: 600; vertical-align: top; color: #2563eb;">
                          ${task.billable_hours !== null && task.billable_hours !== undefined ? `${task.billable_hours.toFixed(2)} hrs` : 'Not set'}
                        </td>
                      </tr>
                    `
                    }).join('')}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="2" style="text-align: right; font-weight: bold;">Total Billable Hours:</td>
                      <td style="text-align: right; font-weight: bold; color: #2563eb;">${tasks.reduce((sum, task) => sum + (task.billable_hours || 0), 0).toFixed(2)} hrs</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ` : ''}
            
            ${payments.length > 0 ? `
              <div>
                <div class="section-title">Payment History</div>
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
                        <td style="text-align: right; font-weight: 600;">₹${p.amount.toFixed(2)}</td>
                        <td>${p.notes || '-'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}
            
            <div class="summary-box">
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
            
            <div class="footer">
              <p>Generated on ${format(new Date(), 'MMMM dd, yyyy hh:mm a')}</p>
            </div>
          </div>
          <script>
            // Close window after printing or when print dialog is closed
            window.addEventListener('afterprint', function() {
              window.close()
            })
            
            // Fallback: Close window when it regains focus (user closed print dialog)
            let printDialogClosed = false
            window.addEventListener('focus', function() {
              if (!printDialogClosed) {
                printDialogClosed = true
                setTimeout(function() {
                  window.close()
                }, 100)
              }
            })
            
            // Trigger print when page loads
            window.onload = function() {
              window.print()
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const canMakePayment = user?.role === 'project_owner'
  const canPrint = user?.role === 'project_lead' || user?.role === 'project_owner' || user?.role === 'super_admin'

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Invoices</h1>
        <p className="text-gray-600 text-lg">
          {user?.role === 'project_owner' 
            ? 'View invoices and make payments against them'
            : user?.role === 'project_lead'
            ? 'View invoices you created. Project owners can make payments here.'
            : 'View all invoices and payment history'
          }
        </p>
        {user?.role === 'project_lead' && (
          <p className="mt-2 text-sm text-blue-600">
            💡 To create a new invoice, go to <strong>Billing</strong> menu
          </p>
        )}
      </div>
        
      {/* Status Filter */}
      <div className="flex items-center space-x-2 mb-6">
        <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="all">All</option>
        </select>
      </div>

      {filteredInvoices.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="empty-state-title">
              {invoices.length === 0 
                ? 'No invoices found' 
                : `No ${statusFilter === 'all' ? '' : statusFilter} invoices found`}
            </p>
            <p className="empty-state-description">
              {invoices.length === 0 
                ? 'Invoices will appear here once created' 
                : 'Try selecting a different status filter'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map((invoice) => {
            const project = projectsMap[invoice.project_id]
            const payments = invoicePayments[invoice.id] || []
            const remaining = invoice.invoice_amount - invoice.total_paid
            const isExpanded = expandedInvoices.has(invoice.id)

            return (
              <div key={invoice.id} className="card overflow-hidden">
                <div className="card-body">
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
                          <p className="font-medium">
                            ₹{invoice.total_paid.toFixed(2)}
                            {invoice.total_paid > 0 && invoice.status === 'pending' && (
                              <span className="ml-2 text-xs text-blue-600 font-normal">(Partial)</span>
                            )}
                          </p>
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
                    <div className="mt-6 border-t pt-6 space-y-6">
                      {/* Work Summary Section */}
                      {invoiceTasks[invoice.id] && invoiceTasks[invoice.id].length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-4">Work Summary</h4>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase" style={{width: '8%'}}>S.No.</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{width: '62%'}}>Work Summary</th>
                                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase" style={{width: '30%'}}>Billable Hours</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {invoiceTasks[invoice.id].map((task, index) => {
                                  const summary = task.track_summary || (task.title && task.description ? `${task.title}\n\n${task.description}` : task.title || task.description || 'No summary available')
                                  return (
                                    <tr key={task.id}>
                                      <td className="px-4 py-3 text-sm font-semibold text-gray-700 text-center align-top">
                                        {index + 1}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-pre-wrap break-words leading-relaxed align-top">
                                        {summary}
                                      </td>
                                      <td className="px-4 py-3 text-sm font-semibold text-primary-600 text-right align-top">
                                        {task.billable_hours !== null && task.billable_hours !== undefined
                                          ? `${task.billable_hours.toFixed(2)} hrs`
                                          : <span className="text-gray-400">Not set</span>}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                              <tfoot className="bg-gray-50">
                                <tr>
                                  <td className="px-4 py-3 text-right font-bold text-gray-700" colSpan="2">
                                    Total Billable Hours:
                                  </td>
                                  <td className="px-4 py-3 text-right font-bold text-primary-600">
                                    {invoiceTasks[invoice.id].reduce((sum, task) => sum + (task.billable_hours || 0), 0).toFixed(2)} hrs
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Payment History Section */}
                      <div>
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

      {/* Description View Modal */}
      {showDescriptionModal && selectedTaskDescription && (
        <div className="modal-overlay" onClick={() => setShowDescriptionModal(false)}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Task Description</h3>
                <button
                  onClick={() => setShowDescriptionModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="card-body">
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Task:</h4>
                <p className="text-lg font-bold text-gray-900">{selectedTaskDescription.title}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Description:</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap break-words leading-relaxed">
                  {selectedTaskDescription.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
