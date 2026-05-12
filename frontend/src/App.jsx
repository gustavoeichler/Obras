import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import { ToastProvider } from './components/Toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { BrandingProvider } from './context/BrandingContext'
import Expenses      from './pages/Expenses'
import Budget        from './pages/Budget'
import Stages        from './pages/Stages'
import Suppliers     from './pages/Suppliers'
import Categories    from './pages/Categories'
import Analytics     from './pages/Analytics'
import Documents     from './pages/Documents'
import Login         from './pages/Login'
import Register      from './pages/Register'
import Projects      from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import AcceptInvite  from './pages/AcceptInvite'
import WorkflowDesigner from './pages/WorkflowDesigner'
import BOM            from './pages/BOM'
import DailyReports       from './pages/DailyReports'
import DailyReportEditor  from './pages/DailyReportEditor'
import PriceIntelligence  from './pages/PriceIntelligence'
import BrandingSettings   from './pages/BrandingSettings'
import OrgMembers  from './pages/OrgMembers'
import AdminOrgs   from './pages/AdminOrgs'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

const Wrap = (el) => (
  <ProtectedRoute><Layout flush>{el}</Layout></ProtectedRoute>
)

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"         element={<Login />} />
      <Route path="/register"      element={<Register />} />
      <Route path="/invite/:token" element={<AcceptInvite />} />

      {/* Project list */}
      <Route path="/projects" element={Wrap(<Projects />)} />

      {/* Project-scoped features — every route lives under /projects/:id */}
      <Route path="/projects/:id"            element={Wrap(<ProjectDetail />)} />
      <Route path="/projects/:id/expenses"   element={Wrap(<Expenses />)} />
      <Route path="/projects/:id/budget"     element={Wrap(<Budget />)} />
      <Route path="/projects/:id/stages"     element={Wrap(<Stages />)} />
      <Route path="/projects/:id/documents"  element={Wrap(<Documents />)} />
      <Route path="/projects/:id/analytics"  element={Wrap(<Analytics />)} />
      <Route path="/projects/:id/suppliers"  element={Wrap(<Suppliers />)} />
      <Route path="/projects/:id/categories" element={Wrap(<Categories />)} />
      <Route path="/projects/:id/workflow"   element={Wrap(<WorkflowDesigner />)} />
      <Route path="/projects/:id/bom"        element={Wrap(<BOM />)} />
      <Route path="/projects/:id/daily-reports"      element={Wrap(<DailyReports />)} />
      <Route path="/projects/:id/daily-reports/:rid" element={Wrap(<DailyReportEditor />)} />

      <Route path="/price-intelligence" element={Wrap(<PriceIntelligence />)} />
      <Route path="/settings/branding"  element={Wrap(<BrandingSettings />)} />
      <Route path="/org/members"  element={Wrap(<OrgMembers />)} />
      <Route path="/admin/orgs"   element={Wrap(<AdminOrgs />)} />

      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrandingProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </BrandingProvider>
    </AuthProvider>
  )
}
