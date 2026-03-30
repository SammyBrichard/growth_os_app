import React, { useState } from 'react'
import type { Account, Sender, ActivityMessage } from '../types/index'
import type { PepperUserDetails } from '../hooks/usePepper'

interface PepperAdminProps {
  account: Account | null
  userDetails: PepperUserDetails | null
  activityLog: ActivityMessage[]
  senders: Sender[]
  onUpdateUserFirstname: (firstname: string) => Promise<any>
  onUpdateSender: (senderId: string, updates: Partial<Sender>) => Promise<any>
  onAddSender: () => void
}

function formatTimestamp(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

const PepperAdmin: React.FC<PepperAdminProps> = ({ account, userDetails, activityLog, senders, onUpdateUserFirstname, onUpdateSender, onAddSender }) => {
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)

  const [editingSenderId, setEditingSenderId] = useState<string | null>(null)
  const [senderDraft, setSenderDraft] = useState<Partial<Sender>>({})
  const [savingSender, setSavingSender] = useState(false)

  const activeSkillName = userDetails?.active_skill
    ? typeof userDetails.active_skill === 'object'
      ? `${userDetails.active_skill.employee}/${userDetails.active_skill.skill}`
      : String(userDetails.active_skill)
    : null

  const queuedCount = userDetails?.queued_mobilisations?.length ?? 0

  function startEditName() {
    setNameDraft(userDetails?.firstname ?? '')
    setEditingName(true)
  }

  async function saveName() {
    setSavingName(true)
    await onUpdateUserFirstname(nameDraft)
    setSavingName(false)
    setEditingName(false)
  }

  function startEditSender(sender: Sender) {
    setSenderDraft({
      email: sender.email,
      display_name: sender.display_name ?? '',
      smtp_host: sender.smtp_host ?? '',
      smtp_port: sender.smtp_port ?? 587,
      smtp_username: sender.smtp_username ?? '',
      smtp_password: '',
      imap_host: sender.imap_host ?? '',
      imap_port: sender.imap_port ?? 993,
    })
    setEditingSenderId(sender.id)
  }

  async function saveSender() {
    if (!editingSenderId) return
    setSavingSender(true)
    // Only include password if user actually entered one
    const updates: Partial<Sender> = { ...senderDraft }
    if (!updates.smtp_password) delete updates.smtp_password
    await onUpdateSender(editingSenderId, updates)
    setSavingSender(false)
    setEditingSenderId(null)
  }

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
          <div className="pepper-card-header">
            <div className="pepper-card-title">User</div>
            {!editingName && (
              <button className="pepper-edit-btn" onClick={startEditName}>Edit</button>
            )}
          </div>
          <div className="pepper-card-fields">
            <div className="pepper-field">
              <span className="pepper-label">Name</span>
              {editingName ? (
                <div className="pepper-inline-edit">
                  <input className="pepper-input" value={nameDraft} onChange={e => setNameDraft(e.target.value)} />
                  <div className="pepper-edit-actions">
                    <button className="pepper-save-btn" onClick={saveName} disabled={savingName}>{savingName ? 'Saving...' : 'Save'}</button>
                    <button className="pepper-cancel-btn" onClick={() => setEditingName(false)} disabled={savingName}>Cancel</button>
                  </div>
                </div>
              ) : (
                <span className="pepper-value">{userDetails?.firstname ?? '—'}</span>
              )}
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
      <div className="pepper-senders-header">
        <div className="pepper-section-title">Email Senders</div>
        <button className="pepper-add-btn" onClick={onAddSender}>+ Add sender</button>
      </div>
      {senders.length === 0 ? (
        <div className="pepper-empty">No senders configured.</div>
      ) : (
        <div className="pepper-senders-list">
          {senders.map(sender => {
            const isEditing = editingSenderId === sender.id
            return (
              <div key={sender.id} className={`pepper-sender-card${isEditing ? ' editing' : ''}`}>
                {isEditing ? (
                  <>
                    <div className="pepper-sender-edit-grid">
                      <div className="pepper-sender-edit-field">
                        <label className="pepper-label">Email</label>
                        <input className="pepper-input" value={senderDraft.email ?? ''} onChange={e => setSenderDraft(d => ({ ...d, email: e.target.value }))} />
                      </div>
                      <div className="pepper-sender-edit-field">
                        <label className="pepper-label">Display Name</label>
                        <input className="pepper-input" value={senderDraft.display_name ?? ''} onChange={e => setSenderDraft(d => ({ ...d, display_name: e.target.value }))} />
                      </div>
                      <div className="pepper-sender-edit-field">
                        <label className="pepper-label">SMTP Host</label>
                        <input className="pepper-input" value={senderDraft.smtp_host ?? ''} onChange={e => setSenderDraft(d => ({ ...d, smtp_host: e.target.value }))} />
                      </div>
                      <div className="pepper-sender-edit-field">
                        <label className="pepper-label">SMTP Port</label>
                        <input className="pepper-input" type="number" value={senderDraft.smtp_port ?? 587} onChange={e => setSenderDraft(d => ({ ...d, smtp_port: parseInt(e.target.value) || 587 }))} />
                      </div>
                      <div className="pepper-sender-edit-field">
                        <label className="pepper-label">SMTP Username</label>
                        <input className="pepper-input" value={senderDraft.smtp_username ?? ''} onChange={e => setSenderDraft(d => ({ ...d, smtp_username: e.target.value }))} />
                      </div>
                      <div className="pepper-sender-edit-field">
                        <label className="pepper-label">App Password</label>
                        <input className="pepper-input" type="password" placeholder="Leave blank to keep current" value={senderDraft.smtp_password ?? ''} onChange={e => setSenderDraft(d => ({ ...d, smtp_password: e.target.value }))} />
                      </div>
                      <div className="pepper-sender-edit-field">
                        <label className="pepper-label">IMAP Host</label>
                        <input className="pepper-input" value={senderDraft.imap_host ?? ''} onChange={e => setSenderDraft(d => ({ ...d, imap_host: e.target.value }))} />
                      </div>
                      <div className="pepper-sender-edit-field">
                        <label className="pepper-label">IMAP Port</label>
                        <input className="pepper-input" type="number" value={senderDraft.imap_port ?? 993} onChange={e => setSenderDraft(d => ({ ...d, imap_port: parseInt(e.target.value) || 993 }))} />
                      </div>
                    </div>
                    <div className="pepper-edit-actions">
                      <button className="pepper-save-btn" onClick={saveSender} disabled={savingSender}>{savingSender ? 'Saving...' : 'Save'}</button>
                      <button className="pepper-cancel-btn" onClick={() => setEditingSenderId(null)} disabled={savingSender}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <div className="pepper-sender-row">
                    <div className="pepper-sender-info">
                      <span className="pepper-sender-email">{sender.email}</span>
                      {sender.display_name && <span className="pepper-sender-name">{sender.display_name}</span>}
                      <span className="pepper-sender-host">{sender.smtp_host ?? '—'}</span>
                    </div>
                    <button className="pepper-edit-btn" onClick={() => startEditSender(sender)}>Edit</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
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
