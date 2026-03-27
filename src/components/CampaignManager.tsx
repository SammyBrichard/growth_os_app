import React from 'react'
import type { Campaign, CampaignContact } from '../hooks/useCampaigns'

interface CampaignManagerProps {
  campaigns: Campaign[]
  selectedCampaign: Campaign | null
  onSelectCampaign: (campaign: Campaign | null) => void
  campaignContacts: CampaignContact[]
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const CampaignManager: React.FC<CampaignManagerProps> = ({
  campaigns,
  selectedCampaign,
  onSelectCampaign,
  campaignContacts,
}) => {
  if (!selectedCampaign) {
    // Campaign list view
    return (
      <div id="main-body" className="campaign-list">
        {campaigns.length === 0 ? (
          <div className="campaign-empty">No campaigns yet.</div>
        ) : (
          campaigns.map(campaign => (
            <div
              key={campaign.id}
              className="campaign-card"
              onClick={() => onSelectCampaign(campaign)}
            >
              <div className="campaign-card-info">
                <span className="campaign-card-name">{campaign.name}</span>
                <span className="campaign-card-meta">
                  {campaign.contact_count ?? 0} contact{(campaign.contact_count ?? 0) !== 1 ? 's' : ''} &middot; {formatDate(campaign.created_at)}
                </span>
              </div>
              <span className={`campaign-status ${campaign.status}`}>
                {campaign.status}
              </span>
            </div>
          ))
        )}
      </div>
    )
  }

  // Campaign detail view
  return (
    <div id="main-body" className="campaign-detail">
      <div className="campaign-detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="campaign-back-btn" onClick={() => onSelectCampaign(null)}>
            &larr; Back
          </button>
          <span className="campaign-detail-name">{selectedCampaign.name}</span>
          <span className={`campaign-status ${selectedCampaign.status}`}>
            {selectedCampaign.status}
          </span>
        </div>
        <button className="campaign-start-btn" disabled>
          Start Campaign
        </button>
      </div>

      <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {selectedCampaign.subject_line && (
          <div className="campaign-detail-section">
            <div className="campaign-detail-label">Subject Line</div>
            <div className="campaign-detail-value">{selectedCampaign.subject_line}</div>
          </div>
        )}
        {selectedCampaign.tone && (
          <div className="campaign-detail-section">
            <div className="campaign-detail-label">Tone</div>
            <div className="campaign-detail-value">{selectedCampaign.tone}</div>
          </div>
        )}
        <div className="campaign-detail-section">
          <div className="campaign-detail-label">Emails in sequence</div>
          <div className="campaign-detail-value">{selectedCampaign.num_emails}</div>
        </div>
      </div>

      {selectedCampaign.email_template && (
        <div className="campaign-detail-section">
          <div className="campaign-detail-label">Email Template</div>
          <div className="campaign-template-box">{selectedCampaign.email_template}</div>
        </div>
      )}

      <div className="campaign-detail-section" style={{ marginTop: '8px' }}>
        <div className="campaign-detail-label">Contacts ({campaignContacts.length})</div>
        <table className="campaign-contacts-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {campaignContacts.map(cc => (
              <tr key={cc.id}>
                <td>
                  {cc.contact
                    ? `${cc.contact.first_name} ${cc.contact.last_name}`
                    : '\u2014'}
                </td>
                <td>{cc.contact?.email ?? '\u2014'}</td>
                <td>{cc.contact?.role ?? '\u2014'}</td>
                <td>
                  <span className={`contact-status ${cc.status}`}>
                    {cc.status}
                  </span>
                </td>
              </tr>
            ))}
            {campaignContacts.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px' }}>
                  No contacts in this campaign.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default CampaignManager
