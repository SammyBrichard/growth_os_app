import React, { useState, useEffect, useMemo } from 'react'
import type { Campaign, CampaignContact, CampaignItp } from '../hooks/useCampaigns'

interface CampaignManagerProps {
  campaigns: Campaign[]
  selectedCampaign: Campaign | null
  onSelectCampaign: (campaign: Campaign | null) => void
  campaignContacts: CampaignContact[]
  campaignItp: CampaignItp | null
  selectedContact: CampaignContact | null
  onSelectContact: (contact: CampaignContact | null) => void
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTimestamp(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

const PIPELINE_COLUMNS = [
  { key: 'pending', label: 'Queued', colour: 'var(--muted)' },
  { key: 'sent', label: 'Sent', colour: 'var(--accent)' },
  { key: 'opened', label: 'Opened', colour: '#4a8c5c' },
  { key: 'replied', label: 'Replied', colour: '#2b7ec4' },
  { key: 'bounced', label: 'Bounced', colour: '#c44e2b' },
] as const

const CampaignManager: React.FC<CampaignManagerProps> = ({
  campaigns,
  selectedCampaign,
  onSelectCampaign,
  campaignContacts,
  campaignItp,
  selectedContact,
  onSelectContact,
}) => {
  const [activeEmailTab, setActiveEmailTab] = useState(0)
  const [parsedSequence, setParsedSequence] = useState<{ seq_number: number; delay_in_days: number; subject: string; body: string }[]>([])

  // Parse email sequence once when campaign changes
  useEffect(() => {
    if (!selectedCampaign) { setParsedSequence([]); return }
    const raw = selectedCampaign.email_sequence
    if (Array.isArray(raw) && raw.length > 0) { setParsedSequence(raw); return }
    if (typeof raw === 'string') {
      try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) { setParsedSequence(parsed); return } } catch {}
    }
    if (selectedCampaign.email_template) {
      setParsedSequence([{ seq_number: 1, delay_in_days: 0, subject: selectedCampaign.subject_line ?? '', body: selectedCampaign.email_template }])
      return
    }
    setParsedSequence([])
  }, [selectedCampaign?.id])

  const stats = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const cc of campaignContacts) {
      counts[cc.status] = (counts[cc.status] ?? 0) + 1
    }
    return {
      total: campaignContacts.length,
      pending: counts['pending'] ?? 0,
      sent: counts['sent'] ?? 0,
      opened: counts['opened'] ?? 0,
      replied: counts['replied'] ?? 0,
      bounced: (counts['bounced'] ?? 0) + (counts['failed'] ?? 0) + (counts['unsubscribed'] ?? 0),
    }
  }, [campaignContacts])

  const grouped = useMemo(() => {
    const groups: Record<string, CampaignContact[]> = {}
    for (const col of PIPELINE_COLUMNS) groups[col.key] = []
    for (const cc of campaignContacts) {
      const key = ['failed', 'unsubscribed'].includes(cc.status) ? 'bounced' : cc.status
      if (groups[key]) groups[key].push(cc)
      else groups['pending'].push(cc)
    }
    return groups
  }, [campaignContacts])

  // Campaign list view
  if (!selectedCampaign) {
    return (
      <div id="main-body" className="campaign-list">
        {campaigns.length === 0 ? (
          <div className="campaign-empty">No campaigns yet.</div>
        ) : (
          campaigns.map(campaign => (
            <div key={campaign.id} className="campaign-card" onClick={() => onSelectCampaign(campaign)}>
              <div className="campaign-card-info">
                <span className="campaign-card-name">{campaign.name}</span>
                <span className="campaign-card-meta">
                  {campaign.contact_count ?? 0} contact{(campaign.contact_count ?? 0) !== 1 ? 's' : ''} &middot; {formatDate(campaign.created_at)}
                </span>
              </div>
              <span className={`campaign-status ${campaign.status}`}>{campaign.status}</span>
            </div>
          ))
        )}
      </div>
    )
  }

  return (
    <div id="main-body" className="campaign-detail">
      {/* Header */}
      <div className="campaign-detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="campaign-back-btn" onClick={() => onSelectCampaign(null)}>&larr; Back</button>
          <span className="campaign-detail-name">{selectedCampaign.name}</span>
          <span className={`campaign-status ${selectedCampaign.status}`}>{selectedCampaign.status}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="campaign-stats-row">
        <div className="campaign-stat">
          <span className="campaign-stat-value">{stats.total}</span>
          <span className="campaign-stat-label">Contacts</span>
        </div>
        <div className="campaign-stat">
          <span className="campaign-stat-value" style={{ color: 'var(--accent)' }}>{stats.sent}</span>
          <span className="campaign-stat-label">Sent</span>
        </div>
        <div className="campaign-stat">
          <span className="campaign-stat-value" style={{ color: '#4a8c5c' }}>{stats.opened}</span>
          <span className="campaign-stat-label">Opened</span>
        </div>
        <div className="campaign-stat">
          <span className="campaign-stat-value" style={{ color: '#2b7ec4' }}>{stats.replied}</span>
          <span className="campaign-stat-label">Replied</span>
        </div>
        <div className="campaign-stat">
          <span className="campaign-stat-value" style={{ color: '#c44e2b' }}>{stats.bounced}</span>
          <span className="campaign-stat-label">Bounced</span>
        </div>
      </div>

      {/* Campaign meta */}
      <div className="campaign-meta-row">
        {campaignItp && (
          <div className="campaign-meta-item">
            <span className="campaign-meta-label">Target Profile</span>
            <span className="campaign-meta-value">{campaignItp.name ?? 'Unnamed ITP'}</span>
          </div>
        )}
        {selectedCampaign.tone && (
          <div className="campaign-meta-item">
            <span className="campaign-meta-label">Tone</span>
            <span className="campaign-meta-value">{selectedCampaign.tone}</span>
          </div>
        )}
        <div className="campaign-meta-item">
          <span className="campaign-meta-label">Emails in Sequence</span>
          <span className="campaign-meta-value">{selectedCampaign.num_emails}</span>
        </div>
      </div>

      {/* Email sequence viewer */}
      {parsedSequence.length > 0 && (
        <div className="campaign-sequence">
          <div className="campaign-sequence-tabs">
            {parsedSequence.map((email, i) => (
              <button
                key={i}
                className={`campaign-sequence-tab${activeEmailTab === i ? ' active' : ''}`}
                onClick={() => setActiveEmailTab(i)}
              >
                {i === 0 ? 'Initial' : `Follow-up ${i}`}
                {email.delay_in_days > 0 && <span className="campaign-sequence-delay">+{email.delay_in_days}d</span>}
              </button>
            ))}
          </div>
          <div className="campaign-sequence-content">
            <div className="campaign-sequence-subject">{parsedSequence[activeEmailTab]?.subject}</div>
            <div className="campaign-sequence-body" dangerouslySetInnerHTML={{ __html: parsedSequence[activeEmailTab]?.body ?? '' }} />
          </div>
        </div>
      )}

      {/* Pipeline Kanban */}
      <div className="campaign-pipeline">
        <div className="campaign-meta-label" style={{ marginBottom: 12 }}>Pipeline</div>
        <div className="campaign-kanban">
          {PIPELINE_COLUMNS.map(col => (
            <div key={col.key} className="kanban-column">
              <div className="kanban-column-header">
                <span className="kanban-column-title" style={{ color: col.colour }}>{col.label}</span>
                <span className="kanban-column-count">{grouped[col.key]?.length ?? 0}</span>
              </div>
              <div className="kanban-column-body">
                {(grouped[col.key] ?? []).map(cc => (
                  <div key={cc.id} className={`kanban-card${selectedContact?.id === cc.id ? ' kanban-card-selected' : ''}`} style={{ borderLeftColor: col.colour, cursor: 'pointer' }} onClick={() => onSelectContact(selectedContact?.id === cc.id ? null : cc)}>
                    <div className="kanban-card-name">
                      {cc.contact?.first_name || cc.contact?.last_name
                        ? `${cc.contact.first_name ?? ''} ${cc.contact.last_name ?? ''}`.trim()
                        : cc.contact?.email ?? cc.contact?.targets?.title ?? '—'}
                    </div>
                    {cc.contact?.targets?.title && (
                      <div className="kanban-card-company">{cc.contact.targets.title}</div>
                    )}
                    {cc.contact?.role && (
                      <div className="kanban-card-role">{cc.contact.role}</div>
                    )}
                    {cc.sent_at && col.key !== 'pending' && (
                      <div className="kanban-card-time">{formatTimestamp(col.key === 'replied' && cc.replied_at ? cc.replied_at : col.key === 'opened' && cc.opened_at ? cc.opened_at : cc.sent_at)}</div>
                    )}
                  </div>
                ))}
                {(grouped[col.key] ?? []).length === 0 && (
                  <div className="kanban-empty">No contacts</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CampaignManager
