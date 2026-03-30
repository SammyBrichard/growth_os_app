import React from 'react'

interface LayoutProps {
  activeNav: string
  setActiveNav: (nav: string) => void
  employeeList: React.ReactNode
  children: React.ReactNode
  leadsCount?: number
}

const Layout: React.FC<LayoutProps> = ({ employeeList, children }) => {
  return (
    <div id="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">growth<span className="accent">OS</span></div>
        <div className="sidebar-section-label">Team</div>
        {employeeList}
      </aside>
      {children}
    </div>
  )
}

export default Layout
