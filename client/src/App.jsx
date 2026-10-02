import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import DashboardPage from './pages/DashboardPage'
import NotificationsPage from './pages/NotificationsPage'
import ProfilePage from './pages/ProfilePage'
import SuperAdminPage from './pages/SuperAdminPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import BlogListPage from './pages/BlogListPage'
import BlogPostPage from './pages/BlogPostPage'
import TimeConverterPage from './pages/TimeConverterPage'
import FlightQuotationsPage from './pages/FlightQuotationsPage'
import StaffDutyDashboard from './components/schedule/StaffDutyDashboard'
import { useAuth } from './data/AuthContext'
import { useAppData } from './data/AppDataContext'
import LoadingOverlay from './components/LoadingOverlay'
import SessionExpiredModal from './components/SessionExpiredModal'
import NotificationOnboardingModal from './components/NotificationOnboardingModal'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

export default function App() {
  const { overlay } = useAppData()

  return (
    <>
      <SessionExpiredModal />
      <NotificationOnboardingModal />
      {overlay.show && (
        <LoadingOverlay
          message={overlay.message || "Processing..."}
          status={overlay.status || 'loading'}
        />
      )}
      <Routes>
        {/* Auth Pages */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Super Admin & Aliases */}
        <Route path="/super-admin" element={<SuperAdminPage />} />
        <Route path="/super-admin/login" element={<SuperAdminPage />} />
        <Route path="/admin" element={<SuperAdminPage />} />
        <Route path="/admin/login" element={<SuperAdminPage />} />
        <Route path="/superadmin" element={<SuperAdminPage />} />
        <Route path="/superadmin/login" element={<SuperAdminPage />} />
        <Route
          path="/super-admin/quotations"
          element={<FlightQuotationsPage />}
        />
        <Route
          path="/flight-quotations"
          element={<FlightQuotationsPage />}
        />
        <Route
          path="/super-admin/travel-card"
          element={<SuperAdminPage initialTab="travel-card" />}
        />
        <Route
          path="/travel-card"
          element={<SuperAdminPage initialTab="travel-card" />}
        />

        {/* Main Pages */}
        <Route
          path="*"
          element={
            <Layout>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/blog" element={<BlogListPage />} />
                <Route path="/blog/:slug" element={<BlogPostPage />} />
                <Route path="/time-converter" element={<TimeConverterPage />} />

                {/* Protected Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/staff-duties"
                  element={
                    <ProtectedRoute>
                      <div className="container mx-auto px-4 py-8">
                        <StaffDutyDashboard />
                      </div>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-duties"
                  element={
                    <ProtectedRoute>
                      <div className="container mx-auto px-4 py-8">
                        <StaffDutyDashboard />
                      </div>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <ProtectedRoute>
                      <NotificationsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </>
  )
}
