import React, { useState } from 'react'

interface SequenceEmail {
  seq_number: number
  delay_in_days: number
  subject: string
  body: string
}

interface ReviewEmailTemplateSidebarProps {
  campaignId: string
  emailSequence: SequenceEmail[]
  campaignName: string
  tone: string | null
  numEmails: number
  onApprove: (updatedSequence: SequenceEmail[]) => void
}

const ReviewEmailTemplateSidebar: React.FC<ReviewEmailTemplateSidebarProps> = ({
  campaignId: _campaignId,
  emailSequence,
  campaignName,
  tone,
  numEmails,
  onApprove,
}) => {
  const [sequence, setSequence] = useState<SequenceEmail[]>(
    emailSequence.length > 0 ? emailSequence : [{ seq_number: 1, delay_in_days: 0, subject: '', body: '' }]
  )

  function updateEmail(index: number, field: 'subject' | 'body', value: string) {
    setSequence(prev => prev.map((email, i) => i === index ? { ...email, [field]: value } : email))
  }

  return (
    <div>
      <div className="review-template-heading">{campaignName}</div>

      {tone && (
        <div className="review-template-info">Tone: {tone}</div>
      )}
      <div className="review-template-info" style={{ marginBottom: '16px' }}>
        {numEmails} email{numEmails !== 1 ? 's' : ''} in sequence
      </div>

      {sequence.map((email, index) => (
        <div key={email.seq_number} style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: index < sequence.length - 1 ? '1px solid var(--border)' : 'none' }}>
          <div className="review-template-info" style={{ fontWeight: 600, marginBottom: '8px' }}>
            {index === 0 ? 'Initial Email' : `Follow-up ${index}`}
            {email.delay_in_days > 0 && ` (${email.delay_in_days} days after previous)`}
          </div>

          <div className="review-template-field">
            <label className="review-template-label">Subject Line</label>
            <input
              className="review-template-input"
              value={email.subject}
              onChange={e => updateEmail(index, 'subject', e.target.value)}
            />
          </div>

          <div className="review-template-field">
            <label className="review-template-label">Email Body</label>
            <textarea
              className="review-template-textarea"
              value={email.body}
              onChange={e => updateEmail(index, 'body', e.target.value)}
              rows={index === 0 ? 10 : 6}
            />
          </div>
        </div>
      ))}

      <button
        className="review-template-approve-btn"
        onClick={() => onApprove(sequence)}
      >
        Approve sequence
      </button>
    </div>
  )
}

export default ReviewEmailTemplateSidebar
