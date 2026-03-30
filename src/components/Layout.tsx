import React from 'react'

interface LayoutProps {
  employeeList: React.ReactNode
  children: React.ReactNode
  onLogout: () => void
}

const Layout: React.FC<LayoutProps> = ({ employeeList, children, onLogout }) => {
  return (
    <div id="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">growth<span className="accent">OS</span></div>
        <div className="sidebar-section-label">Team</div>
        {employeeList}
        <div style={{ flex: 1, minHeight: 20 }} />
        <button className="sidebar-logout-btn" onClick={onLogout}>Log out</button>
      </aside>
      {children}
    </div>
  )
}

export default Layout
