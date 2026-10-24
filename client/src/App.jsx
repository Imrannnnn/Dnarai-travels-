import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import DashboardPage from './pages/DashboardPage'
import NotificationsPage from './pages/NotificationsPage'
import ProfilePage from './pages/ProfilePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import { useAuth } from './data/AuthContext'
import { useAppData } from './data/AppDataContext'
import LoadingOverlay from './components/LoadingOverlay'
import SessionExpiredModal from './components/SessionExpiredModal'
import NotificationOnboardingModal from './components/NotificationOnboardingModal'

// Code-split heavy routes to drastically reduce initial bundle size and speed up page loading
const SuperAdminPage = lazy(() => import('./pages/SuperAdminPage'))
const FlightQuotationsPage = lazy(() => import('./pages/FlightQuotationsPage'))
const BlogListPage = lazy(() => import('./pages/BlogListPage'))
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'))
const TimeConverterPage = lazy(() => import('./pages/TimeConverterPage'))
import StaffDutyDashboard from './components/schedule/StaffDutyDashboard'
const SpreadsheetScheduleView = lazy(() => import('./components/schedule/SpreadsheetScheduleView'))

function PageFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-8">
      <div className="w-8 h-8 border-3 border-ocean-200 border-t-ocean-600 rounded-full animate-spin"></div>
    </div>
  )
}

function StaffSchedulesRoute() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight font-display">
          Staff Operational Roster & Schedules
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {isAdmin ? 'Manage team shifts and operational scheduling' : 'View your scheduled duties and agency shift roster'}
        </p>
      </div>
      <SpreadsheetScheduleView readOnly={!isAdmin} />
    </div>
  )
}

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
      <Suspense fallback={<PageFallback />}>
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
        <Route
          path="/super-admin/schedules"
          element={<SuperAdminPage initialTab="schedules" />}
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
                  path="/staff-schedules"
                  element={
                    <ProtectedRoute>
                      <StaffSchedulesRoute />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/schedules"
                  element={
                    <ProtectedRoute>
                      <StaffSchedulesRoute />
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
      </Suspense>
    </>
  )
}
