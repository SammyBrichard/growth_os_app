import React from 'react'
import type { Account, Sender, ActivityMessage } from '../types/index'
import type { PepperUserDetails } from '../hooks/usePepper'

interface PepperAdminProps {
  account: Account | null
  userDetails: PepperUserDetails | null
  activityLog: ActivityMessage[]
  senders: Sender[]
}

function formatTimestamp(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

const PepperAdmin: React.FC<PepperAdminProps> = ({ account, userDetails, activityLog, senders }) => {
  const activeSkillName = userDetails?.active_skill
    ? typeof userDetails.active_skill === 'object'
      ? `${userDetails.active_skill.employee}/${userDetails.active_skill.skill}`
      : String(userDetails.active_skill)
    : null

  const queuedCount = userDetails?.queued_mobilisations?.length ?? 0

  return (
    <div id="main-body" style={{ padding: '30px' }}>
      {/* Overview Cards */}
      <div className="pepper-overview">
        <div className="pepper-card">
          <div className="pepper-card-title">Account</div>
          <div className="pepper-card-fields">
            <div className="pepper-field">
              <span className="pepper-label">Organisation</span>
              <span className="pepper-value">{account?.organisation_name ?? '—'}</span>
            </div>
            <div className="pepper-field">
              <span className="pepper-label">Website</span>
              {account?.organisation_website ? (
                <a href={account.organisation_website.startsWith('http') ? account.organisation_website : `https://${account.organisation_website}`} target="_blank" rel="noreferrer" className="pepper-link">
                  {account.organisation_website}
                </a>
              ) : <span className="pepper-value">—</span>}
            </div>
            <div className="pepper-field">
              <span className="pepper-label">Description</span>
              <span className="pepper-value">{account?.description ?? '—'}</span>
            </div>
          </div>
        </div>

        <div className="pepper-card">
          <div className="pepper-card-title">User</div>
          <div className="pepper-card-fields">
            <div className="pepper-field">
              <span className="pepper-label">Name</span>
              <span className="pepper-value">{userDetails?.firstname ?? '—'}</span>
            </div>
            <div className="pepper-field">
              <span className="pepper-label">Email</span>
              <span className="pepper-value">{userDetails?.email ?? '—'}</span>
            </div>
            <div className="pepper-field">
              <span className="pepper-label">Status</span>
              <span className="pepper-value">
                <span className={`pepper-status-dot ${userDetails?.signup_complete ? 'complete' : 'pending'}`} />
                {userDetails?.signup_complete ? 'Onboarding complete' : 'Onboarding in progress'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="pepper-section-title">System Status</div>
      <div className="pepper-status-bar">
        <div className="pepper-status-item">
          <span className="pepper-label">Active Skill</span>
          {activeSkillName
            ? <span className="pepper-status-pill active">{activeSkillName}</span>
            : <span className="pepper-status-pill idle">None</span>
          }
        </div>
        <div className="pepper-status-item">
          <span className="pepper-label">Queued Tasks</span>
          <span className="pepper-status-pill idle">{queuedCount}</span>
        </div>
      </div>

      {/* Senders */}
      <div className="pepper-section-title">Email Senders</div>
      {senders.length === 0 ? (
        <div className="pepper-empty">No senders configured.</div>
      ) : (
        <table className="pepper-senders-table">
          <thead>
            <tr>
              <th>Display Name</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {senders.map(s => (
              <tr key={s.id}>
                <td>{s.display_name ?? '—'}</td>
                <td>{s.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Activity Log */}
      <div className="pepper-section-title">Recent Activity</div>
      {activityLog.length === 0 ? (
        <div className="pepper-empty">No activity yet.</div>
      ) : (
        <div className="pepper-activity-log">
          {activityLog.map(msg => (
            <div key={msg.id} className={`pepper-activity-item${msg.is_status ? ' status' : ''}`}>
              <span className="pepper-activity-time">{formatTimestamp(msg.created_at)}</span>
              <span className={`pepper-activity-sender ${msg.is_agent ? 'agent' : 'user'}`}>
                {msg.is_agent ? 'AGENT' : 'YOU'}
              </span>
              <span className="pepper-activity-body">
                {msg.message_body.length > 150 ? msg.message_body.slice(0, 150) + '...' : msg.message_body}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PepperAdmin
