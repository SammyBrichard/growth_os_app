import React from 'react'

interface LayoutProps {
  employeeList: React.ReactNode
  companySwitcher?: React.ReactNode
  children: React.ReactNode
  onLogout: () => void
}

const Layout: React.FC<LayoutProps> = ({ employeeList, companySwitcher, children, onLogout }) => {
  return (
    <div id="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">growth<span className="accent">OS</span></div>
        {companySwitcher && (
          <div className="sidebar-company-switcher">{companySwitcher}</div>
        )}
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
