import React from 'react'
import type { CampaignContact } from '../hooks/useCampaigns'

interface ContactDetailSidebarProps {
  contact: CampaignContact
  onClose: () => void
}

function formatTimestamp(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

const ContactDetailSidebar: React.FC<ContactDetailSidebarProps> = ({ contact, onClose }) => {
  const name = contact.contact?.first_name || contact.contact?.last_name
    ? `${contact.contact.first_name ?? ''} ${contact.contact.last_name ?? ''}`.trim()
    : contact.contact?.email ?? '—'

  return (
    <aside className="target-detail-sidebar">
      <div className="target-detail-header">
        <button onClick={onClose} className="target-detail-close">{'\u2715'}</button>
      </div>
      <div id="right-sidebar-body">
        <div className="sidebar-field">
          <label className="sidebar-field-label">Name</label>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--fg)' }}>{name}</p>
        </div>

        {contact.contact?.email && (
          <div className="sidebar-field">
            <label className="sidebar-field-label">Email</label>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--fg)' }}>{contact.contact.email}</p>
          </div>
        )}

        {contact.contact?.role && (
          <div className="sidebar-field">
            <label className="sidebar-field-label">Role</label>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--fg)' }}>{contact.contact.role}</p>
          </div>
        )}

        {contact.contact?.targets?.title && (
          <div className="sidebar-field">
            <label className="sidebar-field-label">Company</label>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--fg)' }}>{contact.contact.targets.title}</p>
          </div>
        )}

        {contact.contact?.targets?.domain && (
          <div className="sidebar-field">
            <label className="sidebar-field-label">Website</label>
            <a href={`https://${contact.contact.targets.domain}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--accent)', wordBreak: 'break-all' }}>
              {contact.contact.targets.domain}
            </a>
          </div>
        )}

        <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />

        <div className="sidebar-field">
          <label className="sidebar-field-label">Pipeline Status</label>
          <span className={`contact-status ${contact.status}`} style={{ alignSelf: 'flex-start' }}>{contact.status}</span>
        </div>

        <div className="sidebar-field">
          <label className="sidebar-field-label">Timeline</label>
          <div className="contact-detail-timeline">
            <div className="contact-timeline-item">
              <span className="contact-timeline-dot" style={{ background: 'var(--muted)' }} />
              <span className="contact-timeline-label">Added to campaign</span>
            </div>
            {contact.sent_at && (
              <div className="contact-timeline-item">
                <span className="contact-timeline-dot" style={{ background: 'var(--accent)' }} />
                <span className="contact-timeline-label">Email sent</span>
                <span className="contact-timeline-time">{formatTimestamp(contact.sent_at)}</span>
              </div>
            )}
            {contact.opened_at && (
              <div className="contact-timeline-item">
                <span className="contact-timeline-dot" style={{ background: '#4a8c5c' }} />
                <span className="contact-timeline-label">Email opened</span>
                <span className="contact-timeline-time">{formatTimestamp(contact.opened_at)}</span>
              </div>
            )}
            {contact.replied_at && (
              <div className="contact-timeline-item">
                <span className="contact-timeline-dot" style={{ background: '#2b7ec4' }} />
                <span className="contact-timeline-label">Replied</span>
                <span className="contact-timeline-time">{formatTimestamp(contact.replied_at)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}

export default ContactDetailSidebar
