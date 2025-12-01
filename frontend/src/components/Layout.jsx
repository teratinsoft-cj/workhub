import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [developerMenuOpen, setDeveloperMenuOpen] = useState(false)
  const [administrationMenuOpen, setAdministrationMenuOpen] = useState(false)
  const [financeMenuOpen, setFinanceMenuOpen] = useState(false)
  const developerMenuRef = useRef(null)
  const administrationMenuRef = useRef(null)
  const financeMenuRef = useRef(null)

  const isActive = (path) => location.pathname === path

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (developerMenuRef.current && !developerMenuRef.current.contains(event.target)) {
        setDeveloperMenuOpen(false)
      }
      if (administrationMenuRef.current && !administrationMenuRef.current.contains(event.target)) {
        setAdministrationMenuOpen(false)
      }
      if (financeMenuRef.current && !financeMenuRef.current.contains(event.target)) {
        setFinanceMenuOpen(false)
      }
    }
    if (developerMenuOpen || administrationMenuOpen || financeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [developerMenuOpen, administrationMenuOpen, financeMenuOpen])

  const navItems = []
  const primaryItems = []
  const developerMenuItems = []
  const administrationMenuItems = []
  const financeMenuItems = []
  
  // For developers, show different menu
  if (user?.role === 'developer') {
    navItems.push(
      { path: '/', label: 'Dashboard', icon: '📊' },
      { path: '/my-tasks', label: 'My Tasks', icon: '✅' },
      { path: '/timesheets', label: 'Timesheets', icon: '⏰' },
      { path: '/earnings', label: 'My Earnings', icon: '💵' }
    )
    primaryItems.push(...navItems)
  } else {
    // For other roles, show standard menu
    primaryItems.push(
      { path: '/', label: 'Dashboard', icon: '📊' },
      { path: '/projects', label: 'Projects', icon: '📁' }
    )
    
    // Tasks - for project owners and super admins
    if (user?.role === 'project_owner' || user?.role === 'super_admin') {
      primaryItems.push({ path: '/tasks', label: 'Tasks', icon: '✅' })
    }
    
    // My Tasks and My Earnings - for project leads (they also develop)
    if (user?.role === 'project_lead') {
      primaryItems.push({ path: '/my-tasks', label: 'My Tasks', icon: '✅' })
      primaryItems.push({ path: '/earnings', label: 'My Earnings', icon: '💵' })
    }
    
    // Developer menu items - grouped under Developer dropdown
    // Show Developer List for all non-project-owner roles (project_lead, super_admin)
    if (user?.role === 'project_lead' || user?.role === 'super_admin') {
      developerMenuItems.push({ path: '/developers', label: 'Developer List', icon: '👥' })
      developerMenuItems.push({ path: '/developer-payments', label: 'Payments', icon: '💳' })
      developerMenuItems.push({ path: '/payment-vouchers', label: 'Vouchers', icon: '🧾' })
    }
    
    // Timesheets - not visible to project owners
    if (user?.role !== 'project_owner') {
      primaryItems.push({ path: '/timesheets', label: 'Timesheets', icon: '⏰' })
    }
    
    // Finance menu items - Billing and Invoices
    // Billing - only for project leads and super admins (creates invoices from tasks)
    if (user?.role === 'project_lead' || user?.role === 'super_admin') {
      financeMenuItems.push({ path: '/task-billing', label: 'Billing', icon: '📋' })
    }
    
    // Invoices - visible to all non-developer roles
    financeMenuItems.push({ path: '/payments', label: 'Invoices', icon: '💰' })
    
    // Accounting - only for project leads and super admins
    if (user?.role === 'project_lead' || user?.role === 'super_admin') {
      financeMenuItems.push({ path: '/accounting', label: 'Accounting', icon: '📊' })
    }

    // Super admin can see users and project sources under Administration menu
    if (user?.role === 'super_admin') {
      administrationMenuItems.push({ path: '/user-approvals', label: 'Users', icon: '👤' })
      administrationMenuItems.push({ path: '/project-sources', label: 'Project Sources', icon: '🏢' })
    }

    navItems.push(...primaryItems, ...developerMenuItems, ...financeMenuItems, ...administrationMenuItems)
  }

  // Check if any developer menu item is active
  const isDeveloperMenuActive = developerMenuItems.length > 0 && developerMenuItems.some(item => isActive(item.path))
  
  // Check if any finance menu item is active
  const isFinanceMenuActive = financeMenuItems.length > 0 && financeMenuItems.some(item => isActive(item.path))
  
  // Check if any administration menu item is active
  const isAdministrationMenuActive = administrationMenuItems.length > 0 && administrationMenuItems.some(item => isActive(item.path))

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Desktop Menu */}
            <div className="flex items-center flex-1 min-w-0">
              <div className="flex-shrink-0">
                <Link to="/" className="flex items-center">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                  WorkHub
                </h1>
                </Link>
              </div>
              {/* Desktop Navigation */}
              <div className="hidden lg:flex lg:items-center lg:ml-6 lg:space-x-1 flex-1 min-w-0">
                <div className="flex items-center space-x-1">
                  {primaryItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                      className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                        isActive(item.path)
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <span className="mr-1.5 text-base">{item.icon}</span>
                      <span className="hidden xl:inline">{item.label}</span>
                    </Link>
                  ))}
                  
                  {/* Developer Menu Dropdown */}
                  {developerMenuItems.length > 0 && (
                    <div className="relative" ref={developerMenuRef}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setDeveloperMenuOpen(!developerMenuOpen)
                          setAdministrationMenuOpen(false)
                        }}
                        className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                          isDeveloperMenuActive
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <span className="mr-1.5 text-base">👥</span>
                        <span className="hidden xl:inline">Developer</span>
                        <svg 
                          className={`ml-1 h-4 w-4 transition-transform ${developerMenuOpen ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {developerMenuOpen && developerMenuItems.length > 0 && (
                        <div 
                          className="absolute left-0 top-full mt-1 w-56 rounded-md shadow-xl bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-[100] border border-gray-200"
                          style={{ minWidth: '14rem' }}
                        >
                          <div className="py-1">
                            {developerMenuItems.map((item) => (
                              <Link
                                key={item.path}
                                to={item.path}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeveloperMenuOpen(false)
                                  setMobileMenuOpen(false)
                                }}
                                className={`flex items-center px-4 py-2.5 text-sm transition-colors ${
                                  isActive(item.path)
                                    ? 'bg-primary-50 text-primary-700 font-medium'
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                <span className="mr-3 text-lg">{item.icon}</span>
                                <span>{item.label}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Finance Menu Dropdown */}
                  {financeMenuItems.length > 0 && (
                    <div className="relative" ref={financeMenuRef}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setFinanceMenuOpen(!financeMenuOpen)
                          setDeveloperMenuOpen(false)
                          setAdministrationMenuOpen(false)
                        }}
                        className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                          isFinanceMenuActive
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <span className="mr-1.5 text-base">💼</span>
                        <span className="hidden xl:inline">Finance</span>
                        <svg 
                          className={`ml-1 h-4 w-4 transition-transform ${financeMenuOpen ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {financeMenuOpen && financeMenuItems.length > 0 && (
                        <div 
                          className="absolute left-0 top-full mt-1 w-56 rounded-md shadow-xl bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-[100] border border-gray-200"
                          style={{ minWidth: '14rem' }}
                        >
                          <div className="py-1">
                            {financeMenuItems.map((item) => (
                              <Link
                                key={item.path}
                                to={item.path}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setFinanceMenuOpen(false)
                                  setMobileMenuOpen(false)
                                }}
                                className={`flex items-center px-4 py-2.5 text-sm transition-colors ${
                                  isActive(item.path)
                                    ? 'bg-primary-50 text-primary-700 font-medium'
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                <span className="mr-3 text-lg">{item.icon}</span>
                                <span>{item.label}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Administration Menu Dropdown */}
                  {administrationMenuItems.length > 0 && (
                    <div className="relative" ref={administrationMenuRef}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setAdministrationMenuOpen(!administrationMenuOpen)
                          setDeveloperMenuOpen(false)
                          setFinanceMenuOpen(false)
                        }}
                        className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                          isAdministrationMenuActive
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <span className="mr-1.5 text-base">⚙️</span>
                        <span className="hidden xl:inline">Admin</span>
                        <svg 
                          className={`ml-1 h-4 w-4 transition-transform ${administrationMenuOpen ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {administrationMenuOpen && administrationMenuItems.length > 0 && (
                        <div 
                          className="absolute left-0 top-full mt-1 w-56 rounded-md shadow-xl bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-[100] border border-gray-200"
                          style={{ minWidth: '14rem' }}
                        >
                          <div className="py-1">
                            {administrationMenuItems.map((item) => (
                              <Link
                                key={item.path}
                                to={item.path}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setAdministrationMenuOpen(false)
                                  setMobileMenuOpen(false)
                                }}
                                className={`flex items-center px-4 py-2.5 text-sm transition-colors ${
                      isActive(item.path)
                                    ? 'bg-primary-50 text-primary-700 font-medium'
                                    : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                                <span className="mr-3 text-lg">{item.icon}</span>
                                <span>{item.label}</span>
                  </Link>
                ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* User Info and Actions */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              {/* Desktop User Info */}
              <div className="hidden md:flex items-center space-x-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white text-sm font-semibold">
                  {user?.full_name?.charAt(0).toUpperCase()}
                </div>
                <div className="hidden lg:block text-right">
                  <div className="text-sm font-semibold text-gray-900 truncate max-w-[120px]">
                    {user?.full_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user?.role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                </div>
              </div>
              
              {/* Logout Button */}
              <button
                onClick={logout}
                className="btn btn-danger text-sm px-3 py-2"
                title="Logout"
              >
                <svg className="w-4 h-4 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden md:inline">Logout</span>
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
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
              {primaryItems.map((item) => (
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
              
              {/* Developer Menu in Mobile */}
              {developerMenuItems.length > 0 && (
                <div className="border-t border-gray-100 mt-2 pt-2">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Developer
                  </div>
                  {developerMenuItems.map((item) => (
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
                </div>
              )}
              
              {/* Finance Menu in Mobile */}
              {financeMenuItems.length > 0 && (
                <div className="border-t border-gray-100 mt-2 pt-2">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Finance
                  </div>
                  {financeMenuItems.map((item) => (
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
                </div>
              )}
              
              {/* Administration Menu in Mobile */}
              {administrationMenuItems.length > 0 && (
                <div className="border-t border-gray-100 mt-2 pt-2">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Admin
                  </div>
                  {administrationMenuItems.map((item) => (
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
                </div>
              )}
              
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

