import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Developers from './pages/Developers'
import Timesheets from './pages/Timesheets'
import Payments from './pages/Payments'
import Earnings from './pages/Earnings'
import UserApprovals from './pages/UserApprovals'
import ProjectSources from './pages/ProjectSources'
import CreateUser from './pages/CreateUser'
import MyTasks from './pages/MyTasks'
import TaskBilling from './pages/TaskBilling'
import Tasks from './pages/Tasks'
import DeveloperPayments from './pages/DeveloperPayments'
import PaymentVouchers from './pages/PaymentVouchers'
import Accounting from './pages/Accounting'
import Layout from './components/Layout'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }
  
  return user ? children : <Navigate to="/login" />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <PrivateRoute>
            <Layout>
              <Projects />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/projects/:id"
        element={
          <PrivateRoute>
            <Layout>
              <ProjectDetail />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <PrivateRoute>
            <Layout>
              <Tasks />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/developers"
        element={
          <PrivateRoute>
            <Layout>
              <Developers />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/timesheets"
        element={
          <PrivateRoute>
            <Layout>
              <Timesheets />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/payments"
        element={
          <PrivateRoute>
            <Layout>
              <Payments />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/earnings"
        element={
          <PrivateRoute>
            <Layout>
              <Earnings />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/my-tasks"
        element={
          <PrivateRoute>
            <Layout>
              <MyTasks />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/task-billing"
        element={
          <PrivateRoute>
            <Layout>
              <TaskBilling />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/developer-payments"
        element={
          <PrivateRoute>
            <Layout>
              <DeveloperPayments />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/payment-vouchers"
        element={
          <PrivateRoute>
            <Layout>
              <PaymentVouchers />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/accounting"
        element={
          <PrivateRoute>
            <Layout>
              <Accounting />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/user-approvals"
        element={
          <PrivateRoute>
            <Layout>
              <UserApprovals />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/project-sources"
        element={
          <PrivateRoute>
            <Layout>
              <ProjectSources />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/create-user"
        element={
          <PrivateRoute>
            <Layout>
              <CreateUser />
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <Toaster position="top-right" />
      </Router>
    </AuthProvider>
  )
}

export default App

