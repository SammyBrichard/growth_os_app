import React, { useState } from 'react'
import { Target } from '../types/index'

interface TargetDetailSidebarProps {
  target: Target
  onClose: () => void
  onApprove: (target: Target) => void
  onReject: (target: Target, reason: string | null) => void
}

const TargetDetailSidebar: React.FC<TargetDetailSidebarProps> = ({ target, onClose, onApprove, onReject }) => {
  const [rejectionReason, setRejectionReason] = useState<string>(target.rejection_reason ?? '')

  return (
    <aside className="target-detail-sidebar">
      <div className="target-detail-header">
        <button onClick={onClose} className="target-detail-close">{'\u2715'}</button>
      </div>
      <div id="right-sidebar-body">
        <div className="sidebar-field">
          <label className="sidebar-field-label">Name</label>
          <p style={{ margin: 0, fontSize: '13px', color: '#333' }}>{target.title ?? '\u2014'}</p>
        </div>
        <div className="sidebar-field">
          <label className="sidebar-field-label">URL</label>
          <a href={target.link} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#555', wordBreak: 'break-all' }}>{target.link}</a>
        </div>
        <div className="sidebar-field">
          <label className="sidebar-field-label">Score</label>
          <span style={{ fontSize: '24px', fontWeight: 700 }}>{target.score}</span>
        </div>
        <div className="sidebar-field">
          <label className="sidebar-field-label">Reason</label>
          <p style={{ margin: 0, fontSize: '13px', color: '#333', lineHeight: 1.6 }}>{target.score_reason ?? 'No reason provided.'}</p>
        </div>
        <div className="target-contacts">
          <div className="target-contacts-heading">Contacts</div>
          {target.contacts && target.contacts.length > 0 ? (
            target.contacts.map(contact => (
              <div key={contact.id} className="target-contact-card">
                <div className="target-contact-name">
                  {[contact.first_name, contact.last_name].filter(Boolean).join(' ') || '\u2014'}
                </div>
                {contact.role && <div className="target-contact-role">{contact.role}</div>}
                <div className="target-contact-email">{contact.email}</div>
              </div>
            ))
          ) : (
            <div className="target-no-contacts">No contacts found for this company</div>
          )}
        </div>
        {!target.approved && (
          <>
            <div className="sidebar-field">
              <textarea
                className="sidebar-field-input"
                rows={4}
                placeholder="Adding the reason you have rejected a target will help Belfort find better ones next time."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
              />
            </div>
            <div className="target-detail-actions">
              <button
                className="target-action-btn reject"
                onClick={() => onReject(target, rejectionReason || null)}
              >
                Reject
              </button>
              <button
                className="target-action-btn approve"
                onClick={() => onApprove(target)}
              >
                Approve
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  )
}

export default TargetDetailSidebar
