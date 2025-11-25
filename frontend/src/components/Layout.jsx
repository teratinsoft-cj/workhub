import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (path) => location.pathname === path

  const navItems = []
  
  // For developers, show different menu
  if (user?.role === 'developer') {
    navItems.push(
      { path: '/', label: 'Dashboard', icon: '📊' },
      { path: '/my-tasks', label: 'My Tasks', icon: '✅' },
      { path: '/timesheets', label: 'Timesheets', icon: '⏰' },
      { path: '/earnings', label: 'My Earnings', icon: '💵' }
    )
  } else {
    // For other roles, show standard menu
    navItems.push(
      { path: '/', label: 'Dashboard', icon: '📊' },
      { path: '/projects', label: 'Projects', icon: '📁' }
    )
    
    // Tasks - for project owners and super admins
    if (user?.role === 'project_owner' || user?.role === 'super_admin') {
      navItems.push({ path: '/tasks', label: 'Tasks', icon: '✅' })
    }
    
    // Developers menu - not visible to project owners
    if (user?.role !== 'project_owner') {
      navItems.push({ path: '/developers', label: 'Developers', icon: '👥' })
    }
    
    // Timesheets - not visible to project owners
    if (user?.role !== 'project_owner') {
      navItems.push({ path: '/timesheets', label: 'Timesheets', icon: '⏰' })
    }
    
    // Task Billing - only for project leads and super admins
    if (user?.role === 'project_lead' || user?.role === 'super_admin') {
      navItems.push({ path: '/task-billing', label: 'Task Billing', icon: '📋' })
      navItems.push({ path: '/developer-payments', label: 'Developer Payments', icon: '💳' })
      navItems.push({ path: '/payment-vouchers', label: 'Payment Vouchers', icon: '🧾' })
    }
    
    navItems.push(
      { path: '/payments', label: 'Invoices & Payments', icon: '💰' }
    )

    // Super admin can see users and project sources
    if (user?.role === 'super_admin') {
      navItems.push({ path: '/user-approvals', label: 'Users', icon: '👤' })
      navItems.push({ path: '/project-sources', label: 'Project Sources', icon: '🏢' })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-soft border-b border-gray-100 sticky top-0 z-40 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Desktop Menu */}
            <div className="flex items-center flex-1">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                  WorkHub
                </h1>
              </div>
              {/* Desktop Navigation */}
              <div className="hidden lg:ml-10 lg:flex lg:space-x-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`inline-flex items-center px-4 py-2 mx-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive(item.path)
                        ? 'bg-primary-50 text-primary-700 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className="mr-2 text-lg">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* User Info and Actions */}
            <div className="flex items-center space-x-3">
              {/* Desktop User Info */}
              <div className="hidden md:flex items-center space-x-3 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white text-sm font-semibold">
                  {user?.full_name?.charAt(0).toUpperCase()}
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">{user?.full_name}</div>
                  <div className="text-xs text-gray-500">
                    {user?.role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                </div>
              </div>
              
              {/* Logout Button */}
              <button
                onClick={logout}
                className="btn btn-danger text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                {!mobileMenuOpen ? (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white animate-slide-up">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="mr-3 text-xl">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
              {/* Mobile User Info */}
              <div className="pt-4 pb-2 border-t border-gray-100 mt-2">
                <div className="px-4 py-2 flex items-center space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white font-semibold">
                    {user?.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{user?.full_name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {user?.role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

