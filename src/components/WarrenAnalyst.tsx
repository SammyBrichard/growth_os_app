import React, { useState } from 'react'
import type { ITP, Account, Customer, ItpStats } from '../types/index'

interface WarrenAnalystProps {
  itps: ITP[]
  itpStats: Record<string, ItpStats>
  account: Account | null
  customers: Customer[]
  onUpdateAccount: (updates: Partial<Account>) => Promise<any>
  onUpdateItp: (itpId: string, updates: Partial<ITP>) => Promise<any>
  warrenSummary?: string | null
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const WarrenAnalyst: React.FC<WarrenAnalystProps> = ({ itps, itpStats, account, customers, onUpdateAccount, onUpdateItp, warrenSummary }) => {
  const [editingAccount, setEditingAccount] = useState(false)
  const [accountDraft, setAccountDraft] = useState<Partial<Account>>({})
  const [editingItpId, setEditingItpId] = useState<string | null>(null)
  const [itpDraft, setItpDraft] = useState<Partial<ITP>>({})
  const [saving, setSaving] = useState(false)

  function startEditAccount() {
    if (!account) return
    setAccountDraft({
      organisation_name: account.organisation_name ?? '',
      organisation_website: account.organisation_website ?? '',
      description: account.description ?? '',
      problem_solved: account.problem_solved ?? '',
    })
    setEditingAccount(true)
  }

  async function saveAccount() {
    setSaving(true)
    await onUpdateAccount(accountDraft)
    setSaving(false)
    setEditingAccount(false)
  }

  function startEditItp(itp: ITP) {
    setItpDraft({
      name: itp.name ?? '',
      itp_summary: itp.itp_summary ?? '',
      itp_demographic: itp.itp_demographic ?? '',
      itp_pain_points: itp.itp_pain_points ?? '',
      itp_buying_trigger: itp.itp_buying_trigger ?? '',
      location: itp.location ?? '',
    })
    setEditingItpId(itp.id)
  }

  async function saveItp() {
    if (!editingItpId) return
    setSaving(true)
    await onUpdateItp(editingItpId, itpDraft)
    setSaving(false)
    setEditingItpId(null)
  }

  return (
    <div id="main-body" style={{ padding: '30px' }}>
      <div className="draper-summary">
        <div className="agent-label">WARREN</div>
        {warrenSummary ? (
          <div className="draper-summary-bubble msg-animate">{warrenSummary}</div>
        ) : (
          <div className="typing-dots">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        )}
      </div>
      {warrenSummary && <hr className="draper-divider" />}
      {/* Account Profile */}
      {account && (
        <div className="warren-account-card">
          <div className="warren-card-header">
            <div className="warren-section-title">Company Profile</div>
            {!editingAccount && (
              <button className="warren-edit-btn" onClick={startEditAccount}>Edit</button>
            )}
          </div>
          {editingAccount ? (
            <>
              <div className="warren-account-grid">
                <div className="warren-account-field">
                  <label className="warren-label">Organisation</label>
                  <input className="warren-input" value={accountDraft.organisation_name ?? ''} onChange={e => setAccountDraft(d => ({ ...d, organisation_name: e.target.value }))} />
                </div>
                <div className="warren-account-field">
                  <label className="warren-label">Website</label>
                  <input className="warren-input" value={accountDraft.organisation_website ?? ''} onChange={e => setAccountDraft(d => ({ ...d, organisation_website: e.target.value }))} />
                </div>
                <div className="warren-account-field warren-account-field-wide">
                  <label className="warren-label">Description</label>
                  <textarea className="warren-textarea" rows={3} value={accountDraft.description ?? ''} onChange={e => setAccountDraft(d => ({ ...d, description: e.target.value }))} />
                </div>
                <div className="warren-account-field warren-account-field-wide">
                  <label className="warren-label">Problem Solved</label>
                  <textarea className="warren-textarea" rows={3} value={accountDraft.problem_solved ?? ''} onChange={e => setAccountDraft(d => ({ ...d, problem_solved: e.target.value }))} />
                </div>
              </div>
              <div className="warren-edit-actions">
                <button className="warren-save-btn" onClick={saveAccount} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                <button className="warren-cancel-btn" onClick={() => setEditingAccount(false)} disabled={saving}>Cancel</button>
              </div>
            </>
          ) : (
            <div className="warren-account-grid">
              <div className="warren-account-field">
                <span className="warren-label">Organisation</span>
                <span className="warren-value">{account.organisation_name ?? '—'}</span>
              </div>
              <div className="warren-account-field">
                <span className="warren-label">Website</span>
                {account.organisation_website ? (
                  <a href={account.organisation_website.startsWith('http') ? account.organisation_website : `https://${account.organisation_website}`} target="_blank" rel="noreferrer" className="warren-link">
                    {account.organisation_website}
                  </a>
                ) : <span className="warren-value">—</span>}
              </div>
              <div className="warren-account-field warren-account-field-wide">
                <span className="warren-label">Description</span>
                <span className="warren-value">{account.description ?? '—'}</span>
              </div>
              <div className="warren-account-field warren-account-field-wide">
                <span className="warren-label">Problem Solved</span>
                <span className="warren-value">{account.problem_solved ?? '—'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ITP Grid */}
      <div className="warren-section-title">Ideal Target Profiles</div>
      {itps.length === 0 ? (
        <div className="warren-empty">No target profiles defined yet. Ask Watson to help you create one.</div>
      ) : (
        <div className="warren-itp-grid">
          {itps.map(itp => {
            const stats = itpStats[itp.id]
            const isEditing = editingItpId === itp.id
            return (
              <div key={itp.id} className={`warren-itp-card${isEditing ? ' editing' : ''}`}>
                <div className="warren-itp-header">
                  {isEditing ? (
                    <input className="warren-input warren-itp-name-input" value={itpDraft.name ?? ''} onChange={e => setItpDraft(d => ({ ...d, name: e.target.value }))} placeholder="ITP name" />
                  ) : (
                    <span className="warren-itp-name">{itp.name ?? 'Unnamed ITP'}</span>
                  )}
                  <div className="warren-itp-header-right">
                    {itp.created_at && <span className="warren-itp-date">{formatDate(itp.created_at)}</span>}
                    {!isEditing && (
                      <button className="warren-edit-btn" onClick={() => startEditItp(itp)}>Edit</button>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <>
                    <div className="warren-itp-fields">
                      <div className="warren-itp-field">
                        <label className="warren-label">Summary</label>
                        <textarea className="warren-textarea" rows={4} value={itpDraft.itp_summary ?? ''} onChange={e => setItpDraft(d => ({ ...d, itp_summary: e.target.value }))} />
                      </div>
                      <div className="warren-itp-field">
                        <label className="warren-label">Demographics</label>
                        <textarea className="warren-textarea" rows={4} value={itpDraft.itp_demographic ?? ''} onChange={e => setItpDraft(d => ({ ...d, itp_demographic: e.target.value }))} />
                      </div>
                      <div className="warren-itp-field">
                        <label className="warren-label">Pain Points</label>
                        <textarea className="warren-textarea" rows={4} value={itpDraft.itp_pain_points ?? ''} onChange={e => setItpDraft(d => ({ ...d, itp_pain_points: e.target.value }))} />
                      </div>
                      <div className="warren-itp-field">
                        <label className="warren-label">Buying Triggers</label>
                        <textarea className="warren-textarea" rows={4} value={itpDraft.itp_buying_trigger ?? ''} onChange={e => setItpDraft(d => ({ ...d, itp_buying_trigger: e.target.value }))} />
                      </div>
                      <div className="warren-itp-field">
                        <label className="warren-label">Location</label>
                        <input className="warren-input" value={itpDraft.location ?? ''} onChange={e => setItpDraft(d => ({ ...d, location: e.target.value }))} />
                      </div>
                    </div>
                    <div className="warren-edit-actions">
                      <button className="warren-save-btn" onClick={saveItp} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                      <button className="warren-cancel-btn" onClick={() => setEditingItpId(null)} disabled={saving}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    {itp.itp_summary && <p className="warren-itp-summary">{itp.itp_summary}</p>}
                    <div className="warren-itp-fields">
                      {itp.itp_demographic && (
                        <div className="warren-itp-field">
                          <span className="warren-label">Demographics</span>
                          <span className="warren-field-text">{itp.itp_demographic}</span>
                        </div>
                      )}
                      {itp.itp_pain_points && (
                        <div className="warren-itp-field">
                          <span className="warren-label">Pain Points</span>
                          <span className="warren-field-text">{itp.itp_pain_points}</span>
                        </div>
                      )}
                      {itp.itp_buying_trigger && (
                        <div className="warren-itp-field">
                          <span className="warren-label">Buying Triggers</span>
                          <span className="warren-field-text">{itp.itp_buying_trigger}</span>
                        </div>
                      )}
                      {itp.location && (
                        <div className="warren-itp-field">
                          <span className="warren-label">Location</span>
                          <span className="warren-field-text">{itp.location}</span>
                        </div>
                      )}
                    </div>
                    {stats && (
                      <div className="warren-stats-bar">
                        <div className="warren-stat">
                          <span className="warren-stat-value">{stats.leadCount}</span>
                          <span className="warren-stat-label">Leads</span>
                        </div>
                        <div className="warren-stat">
                          <span className="warren-stat-value">{stats.avgScore}</span>
                          <span className="warren-stat-label">Avg Score</span>
                        </div>
                        <div className="warren-stat">
                          <span className="warren-stat-value" style={{ color: '#4a8c5c' }}>{stats.approvedCount}</span>
                          <span className="warren-stat-label">Approved</span>
                        </div>
                        <div className="warren-stat">
                          <span className="warren-stat-value" style={{ color: '#c44e2b' }}>{stats.rejectedCount}</span>
                          <span className="warren-stat-label">Rejected</span>
                        </div>
                        <div className="warren-stat">
                          <span className="warren-stat-value" style={{ color: 'var(--accent)' }}>{stats.campaignCount}</span>
                          <span className="warren-stat-label">Campaigns</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Customer Exclusion List */}
      <div className="warren-section-title">Excluded Customers</div>
      {customers.length === 0 ? (
        <div className="warren-empty">No customers added yet.</div>
      ) : (
        <table className="warren-customers-table">
          <thead>
            <tr>
              <th>Website</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id}>
                <td>{c.organisation_website ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default WarrenAnalyst
