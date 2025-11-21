import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function Payments() {
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [projects, setProjects] = useState([])
  const [projectsMap, setProjectsMap] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState('')
  const [formData, setFormData] = useState({
    project_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
    date_range_start: '',
    date_range_end: '',
  })

  useEffect(() => {
    fetchPayments()
    fetchProjects()
  }, [])

  const fetchPayments = async () => {
    try {
      // Fetch all payments for user's projects
      const projectsRes = await api.get('/projects')
      const allPayments = []
      for (const project of projectsRes.data) {
        try {
          const paymentsRes = await api.get(`/payments/project/${project.id}`)
          allPayments.push(...paymentsRes.data)
        } catch (error) {
          // Project might not have payments
        }
      }
      setPayments(allPayments)
    } catch (error) {
      toast.error('Failed to fetch payments')
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects')
      setProjects(response.data)
      const map = {}
      response.data.forEach(p => {
        map[p.id] = p.name
      })
      setProjectsMap(map)
    } catch (error) {
      toast.error('Failed to fetch projects')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        project_id: parseInt(formData.project_id),
        amount: parseFloat(formData.amount),
        payment_date: new Date(formData.payment_date).toISOString(),
        date_range_start: formData.date_range_start
          ? new Date(formData.date_range_start).toISOString()
          : null,
        date_range_end: formData.date_range_end
          ? new Date(formData.date_range_end).toISOString()
          : null,
      }
      await api.post('/payments', payload)
      toast.success('Payment created successfully!')
      setShowModal(false)
      setFormData({
        project_id: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
        date_range_start: '',
        date_range_end: '',
      })
      fetchPayments()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create payment')
    }
  }

  const handleFileUpload = async (paymentId, file) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      await api.post(`/payments/${paymentId}/upload-evidence`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      toast.success('Evidence uploaded successfully!')
      fetchPayments()
    } catch (error) {
      toast.error('Failed to upload evidence')
    }
  }

  const canManage = user?.role === 'project_manager' || user?.role === 'project_lead'

  if (!canManage) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">You don't have access to this page</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage payments and track evidence
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium"
        >
          + New Payment
        </button>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No payments found</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Evidence
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {projectsMap[payment.project_id] || `Project #${payment.project_id}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${payment.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        payment.status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : payment.status === 'partial'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {payment.evidence_file ? (
                      <a
                        href={`http://localhost:8000/${payment.evidence_file}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700"
                      >
                        View
                      </a>
                    ) : (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files[0]) {
                              handleFileUpload(payment.id, e.target.files[0])
                            }
                          }}
                        />
                        <span className="text-primary-600 hover:text-primary-700">
                          Upload
                        </span>
                      </label>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium mb-4">Create Payment</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Project
                </label>
                <select
                  required
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  value={formData.project_id}
                  onChange={(e) => {
                    setFormData({ ...formData, project_id: e.target.value })
                    setSelectedProject(e.target.value)
                  }}
                >
                  <option value="">Select project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Payment Date
                </label>
                <input
                  type="date"
                  required
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  value={formData.payment_date}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_date: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date Range Start (Optional)
                </label>
                <input
                  type="date"
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  value={formData.date_range_start}
                  onChange={(e) =>
                    setFormData({ ...formData, date_range_start: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date Range End (Optional)
                </label>
                <input
                  type="date"
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                  value={formData.date_range_end}
                  onChange={(e) =>
                    setFormData({ ...formData, date_range_end: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

