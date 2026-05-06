import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'
import { MobileNavContext } from '../context/MobileNavContext'

export default function Layout({ children, flush = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()

  useEffect(() => { setIsOpen(false) }, [location.pathname])

  const toggle = () => setIsOpen(o => !o)
  const close = () => setIsOpen(false)

  return (
    <MobileNavContext.Provider value={{ isOpen, toggle, close }}>
      <div className="app-layout">
        <Sidebar />
        <button
          className="mobile-menu-btn"
          onClick={toggle}
          aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        {isOpen && (
          <div className="mobile-nav-backdrop" onClick={close} />
        )}
        <main className={`main-content${flush ? ' main-content--flush' : ''} page-enter`}>
          {children}
        </main>
      </div>
    </MobileNavContext.Provider>
  )
}
