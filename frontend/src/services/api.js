import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Keep trailing slash for POST/PUT/DELETE to root endpoints to avoid redirects
    // Only remove trailing slash for GET requests to avoid redirect issues
    if (config.method === 'get' && config.url && config.url.endsWith('/') && config.url !== '/') {
      config.url = config.url.slice(0, -1)
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      const token = localStorage.getItem('token')
      
      // Only redirect if we actually had a token (meaning it expired/invalid)
      // If no token, the request might have failed for another reason
      if (token) {
        localStorage.removeItem('token')
        delete api.defaults.headers.common['Authorization']
        
        // Only redirect if not already on login/register pages
        const currentPath = window.location.pathname
        if (currentPath !== '/login' && currentPath !== '/register') {
          // Small delay to allow error messages to be shown if needed
          setTimeout(() => {
            window.location.href = '/login'
          }, 100)
        }
      }
    }
    return Promise.reject(error)
  }
)

// Initialize token if available
const token = localStorage.getItem('token')
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

export default api

