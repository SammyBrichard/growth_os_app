import React from 'react'

interface SettingsPanelProps {
  userDetailsId: string | null
  onLogout: () => void
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ userDetailsId, onLogout }) => {
  return (
    <div id="main-content">
      <nav id="top-nav">
        <div id="top-nav-profile">
          <span id="top-nav-name">Settings</span>
        </div>
      </nav>
      <div id="main-body" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#5C5C5C' }}>User ID</p>
          <p style={{ margin: 0, fontSize: '13px', color: '#08060d', fontFamily: 'var(--mono)' }}>{userDetailsId}</p>
        </div>
        <button onClick={onLogout} style={{ alignSelf: 'flex-start', padding: '0.6rem 1.4rem', borderRadius: '8px', background: '#e53e3e', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>
          Log out
        </button>
      </div>
    </div>
  )
}

export default SettingsPanel
