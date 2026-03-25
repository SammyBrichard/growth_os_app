import React, { useState } from 'react'
import { Lead } from '../types/index'

interface TargetDetailSidebarProps {
  target: Lead
  onClose: () => void
  onApprove: (target: Lead) => void
  onReject: (target: Lead, reason: string | null) => void
}

const TargetDetailSidebar: React.FC<TargetDetailSidebarProps> = ({ target, onClose, onApprove, onReject }) => {
  const [rejectionReason, setRejectionReason] = useState<string>(target.rejection_reason ?? '')

  return (
    <aside className="lead-detail-sidebar">
      <div className="lead-detail-header">
        <button onClick={onClose} className="lead-detail-close">{'\u2715'}</button>
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
        {!target.approved && (
          <>
            <div className="sidebar-field">
              <textarea
                className="sidebar-field-input"
                rows={4}
                placeholder="Adding the reason you have rejected a lead will help Belfort find better ones next time."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
              />
            </div>
            <div className="lead-detail-actions">
              <button
                className="lead-action-btn reject"
                onClick={() => onReject(target, rejectionReason || null)}
              >
                Reject
              </button>
              <button
                className="lead-action-btn approve"
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
