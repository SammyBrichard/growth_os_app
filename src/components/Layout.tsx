import React from 'react'

interface LayoutProps {
  activeNav: string
  setActiveNav: (nav: string) => void
  employeeList: React.ReactNode
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ activeNav, setActiveNav, employeeList, children }) => {
  return (
    <div id="layout">
      <aside id="sidebar-icon-rail">
        <div
          className={activeNav === 'chat' ? 'rail-icon-btn active' : 'rail-icon-btn'}
          onClick={() => setActiveNav('chat')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5C5C5C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div
          className={activeNav === 'settings' ? 'rail-icon-btn active' : 'rail-icon-btn'}
          onClick={() => setActiveNav('settings')}
          id="rail-settings-btn"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5C5C5C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </div>
      </aside>

      <aside id="sidebar-panel">
        <h1 id="sidebar-heading">
          growthOS<span className="logo-dot">.</span><span className="logo-version">v0.1</span>
        </h1>
        {employeeList}
      </aside>

      {children}
    </div>
  )
}

export default Layout
