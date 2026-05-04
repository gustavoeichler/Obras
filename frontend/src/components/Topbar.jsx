import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Topbar({ back, title }) {
  const { user } = useAuth()

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="topbar-left">
          {back && (
            <Link to={back.href} className="topbar-back">
              <ArrowLeft size={12} /> {back.label}
            </Link>
          )}
          {title && (
            <span className="topbar-title font-mono">{title}</span>
          )}
        </div>

        <div className="topbar-right">
          {user && (
            <span className="topbar-user font-mono">
              {user.email}
              <span className="topbar-role-pill">
                {user.role === 'professional' ? 'PRO' : 'CLI'}
              </span>
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
