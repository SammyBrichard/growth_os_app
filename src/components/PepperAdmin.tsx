import React, { useState, useEffect } from 'react'
import type { Account, Sender, ActivityMessage } from '../types/index'
import type { PepperUserDetails } from '../hooks/usePepper'

const API_URL = import.meta.env.VITE_API_URL

interface Member {
  id: string
  auth_id: string
  firstname: string | null
  role: string
  email: string | null
}

interface PepperAdminProps {
  account: Account | null
  userDetails: PepperUserDetails | null
  activityLog: ActivityMessage[]
  senders: Sender[]
  onUpdateUserFirstname: (firstname: string) => Promise<any>
  onUpdateSender: (senderId: string, updates: Partial<Sender>) => Promise<any>
  onAddSender: () => void
  onDeleteCompany: () => Promise<void>
  canDeleteCompany: boolean
  isAdmin: boolean
  userDetailsId: string | null
  pepperSummary?: string | null
}

function formatTimestamp(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

const PepperAdmin: React.FC<PepperAdminProps> = ({ account, userDetails, activityLog, senders, onUpdateUserFirstname, onUpdateSender, onAddSender, onDeleteCompany, canDeleteCompany, isAdmin, userDetailsId, pepperSummary }) => {
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)

  const [editingSenderId, setEditingSenderId] = useState<string | null>(null)
  const [senderDraft, setSenderDraft] = useState<Partial<Sender>>({})
  const [savingSender, setSavingSender] = useState(false)

  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Team section state (admin only)
  const [members, setMembers] = useState<Member[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteExpiry, setInviteExpiry] = useState<string | null>(null)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [copied, setCopied] = useState(false)
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    if (!account?.id) return
    setMembersLoading(true)
    fetch(`${API_URL}/api/user/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: account.id }),
    })
      .then(r => r.json())
      .then(({ members: m }) => { setMembers(m ?? []); setMembersLoading(false) })
      .catch(() => setMembersLoading(false))
  }, [account?.id])

  async function handleGenerateInvite() {
    if (!userDetailsId) return
    setGeneratingLink(true)
    try {
      const res = await fetch(`${API_URL}/api/user/invite/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_details_id: userDetailsId }),
      })
      if (res.ok) {
        const { link, expires_at } = await res.json()
        setInviteLink(link)
        setInviteExpiry(expires_at)
        setCopied(false)
      }
    } finally {
      setGeneratingLink(false)
    }
  }

  async function handleCopyLink() {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleUpdateRole(targetId: string, newRole: string) {
    if (!userDetailsId) return
    setUpdatingRoleId(targetId)
    try {
      const res = await fetch(`${API_URL}/api/user/members/update-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_details_id: userDetailsId, target_user_details_id: targetId, new_role: newRole }),
      })
      if (res.ok) {
        setMembers(prev => prev.map(m => m.id === targetId ? { ...m, role: newRole } : m))
      }
    } finally {
      setUpdatingRoleId(null)
    }
  }

  async function handleRemoveMember(targetId: string) {
    if (!userDetailsId) return
    setRemovingId(targetId)
    try {
      const res = await fetch(`${API_URL}/api/user/members/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_details_id: userDetailsId, target_user_details_id: targetId }),
      })
      if (res.ok) {
        setMembers(prev => prev.filter(m => m.id !== targetId))
      }
    } finally {
      setRemovingId(null)
    }
  }

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
      <div className="draper-summary">
        <div className="agent-label">PEPPER</div>
        {pepperSummary ? (
          <div className="draper-summary-bubble msg-animate">{pepperSummary}</div>
        ) : (
          <div className="typing-dots">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        )}
      </div>
      {pepperSummary && <hr className="draper-divider" />}
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

      {/* Team — visible to all, actions admin-only */}
      <div className="pepper-senders-header">
        <div className="pepper-section-title">Team</div>
        {isAdmin && (
          <button className="pepper-add-btn" onClick={handleGenerateInvite} disabled={generatingLink}>
            {generatingLink ? 'Generating...' : '+ Invite member'}
          </button>
        )}
      </div>

      {isAdmin && inviteLink && (
        <div className="pepper-invite-box">
          <span className="pepper-invite-link">{inviteLink}</span>
          <button className="pepper-copy-btn" onClick={handleCopyLink}>{copied ? 'Copied!' : 'Copy'}</button>
          {inviteExpiry && (
            <span className="pepper-invite-expiry">
              Expires {new Date(inviteExpiry).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      )}

      {membersLoading ? (
        <div className="pepper-empty">Loading team...</div>
      ) : members.length === 0 ? (
        <div className="pepper-empty">No team members yet.</div>
      ) : (
        <div className="pepper-senders-list">
          {members.map(member => (
            <div key={member.id} className="pepper-sender-card">
              <div className="pepper-sender-row">
                <div className="pepper-sender-info">
                  <span className="pepper-sender-email">{member.firstname ?? member.email ?? 'Unknown'}</span>
                  {member.email && member.firstname && (
                    <span className="pepper-sender-name">{member.email}</span>
                  )}
                  <span className={`pepper-role-badge ${member.role === 'admin' ? 'admin' : 'member'}`}>
                    {member.role}
                  </span>
                </div>
                {isAdmin && member.id !== userDetailsId && (
                  <div className="pepper-edit-actions">
                    <button
                      className="pepper-edit-btn"
                      disabled={!!updatingRoleId}
                      onClick={() => handleUpdateRole(member.id, member.role === 'admin' ? 'member' : 'admin')}
                    >
                      {updatingRoleId === member.id
                        ? '...'
                        : member.role === 'admin' ? 'Make member' : 'Make admin'}
                    </button>
                    <button
                      className="pepper-cancel-btn"
                      disabled={!!removingId}
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      {removingId === member.id ? '...' : 'Remove'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Danger Zone */}
      <div className="pepper-section-title pepper-danger-title">Danger Zone</div>
      <div className="pepper-danger-zone">
        {confirmingDelete ? (
          <div className="pepper-danger-confirm">
            <span className="pepper-danger-warning">This will permanently delete this company and all its data. This cannot be undone.</span>
            <div className="pepper-edit-actions">
              <button
                className="pepper-delete-confirm-btn"
                onClick={async () => { setDeleting(true); await onDeleteCompany(); setDeleting(false); setConfirmingDelete(false) }}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Yes, delete company'}
              </button>
              <button className="pepper-cancel-btn" onClick={() => setConfirmingDelete(false)} disabled={deleting}>Cancel</button>
            </div>
          </div>
        ) : (
          <button
            className="pepper-delete-btn"
            onClick={() => setConfirmingDelete(true)}
            disabled={!canDeleteCompany}
            title={!canDeleteCompany ? 'You cannot delete your only company' : undefined}
          >
            Delete this company
          </button>
        )}
      </div>

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
