import React, { useState } from 'react'

interface SicCode {
  code: string
  description: string
}

interface ApproveSicCodesSidebarProps {
  sicCodes: SicCode[]
  onComplete: (approvedCodes: SicCode[]) => void
}

const ApproveSicCodesSidebar: React.FC<ApproveSicCodesSidebarProps> = ({ sicCodes, onComplete }) => {
  const [decisions, setDecisions] = useState<Record<string, 'approved' | 'rejected'>>({})

  function approve(code: string) {
    setDecisions(prev => ({ ...prev, [code]: prev[code] === 'approved' ? undefined as any : 'approved' }))
  }

  function reject(code: string) {
    setDecisions(prev => ({ ...prev, [code]: prev[code] === 'rejected' ? undefined as any : 'rejected' }))
  }

  function approveAll() {
    const all: Record<string, 'approved'> = {}
    sicCodes.forEach(s => { all[s.code] = 'approved' })
    setDecisions(all)
  }

  function rejectAll() {
    const all: Record<string, 'rejected'> = {}
    sicCodes.forEach(s => { all[s.code] = 'rejected' })
    setDecisions(all)
  }

  const approvedCount = sicCodes.filter(s => decisions[s.code] === 'approved').length
  const allReviewed = sicCodes.every(s => decisions[s.code])

  function handleConfirm() {
    const approvedCodes = sicCodes.filter(s => decisions[s.code] === 'approved')
    onComplete(approvedCodes)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="sic-approval-header">
        <div className="sic-approval-title">Industry Codes</div>
        <div className="sic-approval-subtitle">
          Approve or reject each industry code. Only approved codes will be used to find target companies.
        </div>
      </div>

      <div className="sic-approval-actions">
        <button className="sic-bulk-btn" onClick={approveAll}>Approve all</button>
        <button className="sic-bulk-btn" onClick={rejectAll}>Reject all</button>
      </div>

      <div className="sic-approval-list">
        {sicCodes.map(sic => {
          const decision = decisions[sic.code]
          return (
            <div
              key={sic.code}
              className={`sic-approval-card${decision ? ` ${decision}` : ''}`}
            >
              <div className="sic-approval-content">
                <span className="sic-approval-code">{sic.code}</span>
                <span className="sic-approval-description">{sic.description}</span>
              </div>
              <div className="sic-approval-btns">
                <button
                  className={`sic-btn approve${decision === 'approved' ? ' active' : ''}`}
                  onClick={() => approve(sic.code)}
                >
                  Approve
                </button>
                <button
                  className={`sic-btn reject${decision === 'rejected' ? ' active' : ''}`}
                  onClick={() => reject(sic.code)}
                >
                  Reject
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="sic-approval-footer">
        <div className="sic-approval-count">
          {approvedCount} of {sicCodes.length} approved
        </div>
        <button
          className="option-pill"
          disabled={!allReviewed || approvedCount === 0}
          onClick={handleConfirm}
        >
          {!allReviewed ? 'Review all codes' : approvedCount > 0 ? 'Confirm selection' : 'Approve at least one'}
        </button>
      </div>
    </div>
  )
}

export default ApproveSicCodesSidebar
