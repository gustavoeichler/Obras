import { NavLink, useNavigate, useMatch } from 'react-router-dom'
import {
  LayoutDashboard, Receipt, Layers, Truck, Tag, PiggyBank,
  BarChart2, FolderOpen, LogOut, Building2, GitBranch, FileText,
  Compass, ChevronRight, Calculator, ClipboardList, TrendingUp,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { project, formatBRL } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useMobileNav } from '../context/MobileNavContext'

export default function Sidebar() {
  const [total, setTotal] = useState(null)
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const { isOpen } = useMobileNav()
  const projectMatch = useMatch('/projects/:id/*')
  const rootMatch    = useMatch('/projects/:id')
  const projectId = projectMatch?.params?.id || rootMatch?.params?.id
  const isPro = user?.role === 'professional'

  useEffect(() => {
    if (!projectId) { setTotal(null); return }
    project(projectId).dashboard()
      .then(d => setTotal(d.total_expenses))
      .catch(() => setTotal(null))
  }, [projectId])

  function handleLogout() {
    logout()
    nav('/login')
  }

  return (
    <aside className={`sidebar${isOpen ? ' sidebar--open' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-row">
          <Compass size={14} className="brand-compass" />
          <span className="brand-tag">v1.0 · SaaS</span>
        </div>
        <div className="brand-name">OBRAS</div>
        <div className="brand-sub">gestão · execução · obra</div>
      </div>

      <nav className="sidebar-nav">
        <NavGroup label="§01 — Projetos">
          <NavItem to="/projects" icon={Building2} label="Projetos" end />
          <NavItem to="/price-intelligence" icon={TrendingUp} label="Preços de mercado" />
        </NavGroup>

        {projectId && (
          <>
            <NavGroup label="§02 — Obra atual" accent>
              <NavItem to={`/projects/${projectId}`}           icon={LayoutDashboard} label="Visão geral" end />
              <NavItem to={`/projects/${projectId}/daily-reports`} icon={ClipboardList} label="Diário de Obra" />
              <NavItem to={`/projects/${projectId}/expenses`}  icon={Receipt}         label="Despesas" />
              <NavItem to={`/projects/${projectId}/budget`}    icon={PiggyBank}       label="Orçamento" />
              <NavItem to={`/projects/${projectId}/stages`}    icon={Layers}          label="Etapas" />
              <NavItem to={`/projects/${projectId}/documents`} icon={FileText}        label="Documentos" />
              <NavItem to={`/projects/${projectId}/workflow`}  icon={GitBranch}       label="Workflow" />
              <NavItem to={`/projects/${projectId}/bom`}       icon={Calculator}      label="Cotação" />
            </NavGroup>

            <NavGroup label="§03 — Dados da obra">
              <NavItem to={`/projects/${projectId}/analytics`}  icon={BarChart2} label="Analytics" />
              <NavItem to={`/projects/${projectId}/suppliers`}  icon={Truck}     label="Fornecedores" />
              <NavItem to={`/projects/${projectId}/categories`} icon={Tag}       label="Categorias" />
            </NavGroup>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        {projectId && total !== null && (
          <div className="sidebar-readout">
            <div className="readout-label">Total investido</div>
            <div className="readout-value">{formatBRL(total)}</div>
            <div className="readout-ticker" aria-hidden="true">
              <span /><span /><span />
            </div>
          </div>
        )}

        <div className="sidebar-user">
          <div className="user-avatar">
            {(user?.email?.[0] || '?').toUpperCase()}
          </div>
          <div className="user-meta">
            <div className="user-email" title={user?.email}>{user?.email}</div>
            <div className="user-role">{isPro ? 'PROFISSIONAL' : 'CLIENTE'}</div>
          </div>
          <button
            className="user-logout"
            onClick={handleLogout}
            title="Sair"
            aria-label="Sair"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}

function NavGroup({ label, accent = false, children }) {
  return (
    <div className={`nav-group${accent ? ' nav-group--accent' : ''}`}>
      <div className="nav-group-label">{label}</div>
      <div className="nav-group-items">{children}</div>
    </div>
  )
}

function NavItem({ to, icon: Icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
    >
      <Icon size={15} strokeWidth={1.75} />
      <span className="nav-link-label">{label}</span>
      <ChevronRight size={12} className="nav-chev" strokeWidth={2} />
    </NavLink>
  )
}
