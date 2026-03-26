import React, { useState } from 'react'

interface ReviewEmailTemplateSidebarProps {
  campaignId: string
  subjectLine: string
  emailTemplate: string
  campaignName: string
  tone: string | null
  numEmails: number
  onApprove: (updatedSubjectLine: string, updatedTemplate: string) => void
}

const ReviewEmailTemplateSidebar: React.FC<ReviewEmailTemplateSidebarProps> = ({
  campaignId: _campaignId,
  subjectLine,
  emailTemplate,
  campaignName,
  tone,
  numEmails,
  onApprove,
}) => {
  const [editableSubject, setEditableSubject] = useState(subjectLine)
  const [editableTemplate, setEditableTemplate] = useState(emailTemplate)

  return (
    <div>
      <div className="review-template-heading">{campaignName}</div>

      <div className="review-template-field">
        <label className="review-template-label">Subject Line</label>
        <input
          className="review-template-input"
          value={editableSubject}
          onChange={e => setEditableSubject(e.target.value)}
        />
      </div>

      <div className="review-template-field">
        <label className="review-template-label">Email Template</label>
        <textarea
          className="review-template-textarea"
          value={editableTemplate}
          onChange={e => setEditableTemplate(e.target.value)}
        />
      </div>

      {tone && (
        <div className="review-template-info">Tone: {tone}</div>
      )}
      <div className="review-template-info">Emails in sequence: {numEmails}</div>

      <button
        className="review-template-approve-btn"
        onClick={() => onApprove(editableSubject, editableTemplate)}
      >
        Approve template
      </button>
    </div>
  )
}

export default ReviewEmailTemplateSidebar
