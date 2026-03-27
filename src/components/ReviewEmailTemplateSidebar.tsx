import React, { useState, useRef, useEffect } from 'react'

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

function EmailBodyEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const internalHtml = useRef(value)

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value
      internalHtml.current = value
    }
  }, [value])

  return (
    <div
      ref={ref}
      className="review-template-body"
      contentEditable
      suppressContentEditableWarning
      dangerouslySetInnerHTML={{ __html: value }}
      onInput={() => {
        if (ref.current) {
          internalHtml.current = ref.current.innerHTML
        }
      }}
      onBlur={() => {
        if (ref.current) {
          onChange(ref.current.innerHTML)
        }
      }}
    />
  )
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
    <div className="review-template-container">
      <div className="review-template-heading">{campaignName}</div>

      <div className="review-template-meta">
        {tone && <span>Tone: {tone}</span>}
        <span>{numEmails} email{numEmails !== 1 ? 's' : ''} in sequence</span>
      </div>

      {sequence.map((email, index) => (
        <div key={email.seq_number} className="review-template-email">
          <div className="review-template-email-title">
            {index === 0 ? 'Initial Email' : `Follow-up ${index}`}
            {email.delay_in_days > 0 && (
              <span className="review-template-delay">{email.delay_in_days} days after previous</span>
            )}
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
            <EmailBodyEditor
              value={email.body}
              onChange={html => updateEmail(index, 'body', html)}
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
