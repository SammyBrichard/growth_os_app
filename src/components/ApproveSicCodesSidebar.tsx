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
  const [approved, setApproved] = useState<Set<string>>(new Set(sicCodes.map(s => s.code)))

  function toggleCode(code: string) {
    setApproved(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  function approveAll() {
    setApproved(new Set(sicCodes.map(s => s.code)))
  }

  function rejectAll() {
    setApproved(new Set())
  }

  function handleConfirm() {
    const approvedCodes = sicCodes.filter(s => approved.has(s.code))
    onComplete(approvedCodes)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="sic-approval-header">
        <div className="sic-approval-title">Industry Codes</div>
        <div className="sic-approval-subtitle">
          Select the industry codes that match the types of companies you want to target. Removing irrelevant codes will improve lead quality.
        </div>
      </div>

      <div className="sic-approval-actions">
        <button className="sic-bulk-btn" onClick={approveAll}>Select all</button>
        <button className="sic-bulk-btn" onClick={rejectAll}>Deselect all</button>
      </div>

      <div className="sic-approval-list">
        {sicCodes.map(sic => {
          const isApproved = approved.has(sic.code)
          return (
            <div
              key={sic.code}
              className={`sic-approval-card${isApproved ? ' approved' : ' rejected'}`}
              onClick={() => toggleCode(sic.code)}
            >
              <div className="sic-approval-checkbox">
                {isApproved ? '✓' : ''}
              </div>
              <div className="sic-approval-content">
                <span className="sic-approval-code">{sic.code}</span>
                <span className="sic-approval-description">{sic.description}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="sic-approval-footer">
        <div className="sic-approval-count">
          {approved.size} of {sicCodes.length} selected
        </div>
        <button
          className="option-pill"
          disabled={approved.size === 0}
          onClick={handleConfirm}
        >
          {approved.size > 0 ? 'Confirm selection' : 'Select at least one'}
        </button>
      </div>
    </div>
  )
}

export default ApproveSicCodesSidebar
