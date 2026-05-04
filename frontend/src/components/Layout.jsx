import Sidebar from './Sidebar'

export default function Layout({ children, flush = false }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className={`main-content${flush ? ' main-content--flush' : ''} page-enter`}>
        {children}
      </main>
    </div>
  )
}
