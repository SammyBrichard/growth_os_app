import React from 'react'

interface LayoutProps {
  activeNav: string
  setActiveNav: (nav: string) => void
  employeeList: React.ReactNode
  children: React.ReactNode
  leadsCount?: number
}

const Layout: React.FC<LayoutProps> = ({ activeNav: _activeNav, setActiveNav: _setActiveNav, employeeList, children, leadsCount = 0 }) => {
  return (
    <div id="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">growth<span className="accent">OS</span></div>
        <div className="sidebar-section-label">Team</div>
        {employeeList}
        <div style={{ flex: 1, minHeight: 40 }} />
        <div className="leads-stat-card">
          <div className="leads-stat-label">Approved Leads</div>
          <div className="leads-stat-count">{leadsCount}</div>
        </div>
      </aside>
      {children}
    </div>
  )
}

export default Layout
