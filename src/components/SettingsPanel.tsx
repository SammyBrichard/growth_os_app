import React from 'react'

interface SettingsPanelProps {
  userDetailsId: string | null
  onLogout: () => void
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ userDetailsId, onLogout }) => {
  return (
    <div id="main-content">
      <div className="dashboard-topbar">
        <div className="topbar-agent-status">
          <span className="topbar-agent-name">Settings</span>
        </div>
      </div>
      <div className="settings-panel">
        <div>
          <p className="settings-label">User ID</p>
          <p className="settings-value">{userDetailsId}</p>
        </div>
        <button onClick={onLogout} className="settings-logout-btn">
          Log out
        </button>
      </div>
    </div>
  )
}

export default SettingsPanel
