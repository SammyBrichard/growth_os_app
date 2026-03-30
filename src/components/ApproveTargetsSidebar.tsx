import React, { useState, useEffect, useCallback } from 'react'
import supabase from '../services/supabase'
import type { Lead } from '../types/index'

interface ApproveTargetsSidebarProps {
  itpId: string
  userDetailsId: string | null
  onComplete: (approved: number, rejected: number, hasReasons: boolean) => void
  onClose?: () => void
}

const ApproveTargetsSidebar: React.FC<ApproveTargetsSidebarProps> = ({ itpId, userDetailsId, onComplete, onClose }) => {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [approvedCount, setApprovedCount] = useState(0)
  const [rejectedCount, setRejectedCount] = useState(0)
  const [hasReasons, setHasReasons] = useState(false)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [bulkRejectMode, setBulkRejectMode] = useState(false)
  const [bulkRejectReason, setBulkRejectReason] = useState('')
  const totalReviewed = approvedCount + rejectedCount
  const totalLeads = leads.length + totalReviewed

  useEffect(() => {
    if (!itpId) return
    setLoading(true)
    supabase
      .from('leads')
      .select('id, score, score_reason, approved, rejected, rejection_reason, targets(id, domain, title, link, contacts(id, first_name, last_name, email, role))')
      .eq('itp_id', itpId)
      .gte('score', 70)
      .or('approved.is.null,approved.eq.false')
      .or('rejected.is.null,rejected.eq.false')
      .order('score', { ascending: false })
      .then(({ data }) => {
        setLeads((data ?? []) as Lead[])
        setLoading(false)
      })
  }, [itpId])

  const handleApprove = useCallback(async (lead: Lead) => {
    await supabase.from('leads').update({ approved: true }).eq('id', lead.id)
    setLeads(prev => prev.filter(t => t.id !== lead.id))
    setApprovedCount(prev => prev + 1)
  }, [])

  const handleRejectConfirm = useCallback(async (lead: Lead) => {
    const reason = rejectionReason.trim()
    await supabase.from('leads').update({ rejected: true, rejection_reason: reason || null }).eq('id', lead.id)
    setLeads(prev => prev.filter(t => t.id !== lead.id))
    setRejectedCount(prev => prev + 1)
    if (reason) setHasReasons(true)
    setRejectingId(null)
    setRejectionReason('')
  }, [rejectionReason])

  // Check completion after state updates
  useEffect(() => {
    if (!loading && totalLeads > 0 && leads.length === 0) {
      onComplete(approvedCount, rejectedCount, hasReasons)
    }
  }, [leads.length, loading, totalLeads, approvedCount, rejectedCount, hasReasons, onComplete])

  if (loading) {
    return <div className="approve-targets-done">Loading targets...</div>
  }

  if (leads.length === 0 && totalReviewed === 0) {
    return (
      <div className="approve-targets-done">
        <p>No targets to review right now.</p>
        {onClose && <button className="option-pill" onClick={onClose} style={{ marginTop: '12px' }}>Close</button>}
      </div>
    )
  }

  async function handleBulkApprove() {
    const ids = leads.map(l => l.id)
    await supabase.from('leads').update({ approved: true }).in('id', ids)
    const count = ids.length
    setLeads([])
    setApprovedCount(prev => prev + count)
  }

  async function handleBulkReject() {
    const ids = leads.map(l => l.id)
    const reason = bulkRejectReason.trim() || null
    await supabase.from('leads').update({ rejected: true, rejection_reason: reason }).in('id', ids)
    const count = ids.length
    setLeads([])
    setRejectedCount(prev => prev + count)
    if (reason) setHasReasons(true)
    setBulkRejectMode(false)
    setBulkRejectReason('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="approve-targets-progress">
        {totalReviewed} of {totalLeads} reviewed
      </div>

      {leads.length > 1 && !bulkRejectMode && (
        <div className="bulk-actions">
          <button className="bulk-approve-btn" onClick={handleBulkApprove}>Approve all ({leads.length})</button>
          <button className="bulk-reject-btn" onClick={() => setBulkRejectMode(true)}>Reject all ({leads.length})</button>
        </div>
      )}

      {bulkRejectMode && (
        <div className="bulk-reject-panel">
          <div className="bulk-reject-label">Select a reason for all {leads.length} targets:</div>
          <div className="approve-target-quick-reasons">
            {['Wrong industry', 'Too small', 'Too large', 'Competitor', 'Not in our region', 'Already a customer'].map(reason => (
              <button
                key={reason}
                className={`approve-target-quick-reason${bulkRejectReason === reason ? ' active' : ''}`}
                onClick={() => setBulkRejectReason(bulkRejectReason === reason ? '' : reason)}
              >{reason}</button>
            ))}
          </div>
          <textarea
            className="approve-target-reason"
            placeholder="Or type a custom reason (optional)"
            value={bulkRejectReason}
            onChange={e => setBulkRejectReason(e.target.value)}
          />
          <div className="approve-target-reason-actions">
            <button className="approve-target-reason-confirm" onClick={handleBulkReject}>Reject all</button>
            <button className="approve-target-reason-cancel" onClick={() => { setBulkRejectMode(false); setBulkRejectReason('') }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="approve-targets-list">
        {leads.map(lead => (
          <div key={lead.id} className="approve-target-card">
            <div className="approve-target-header">
              <span className="approve-target-name">{lead.targets?.title || 'Unnamed'}</span>
              <span className="approve-target-score">{lead.score}</span>
            </div>
            {lead.targets?.link && (
              <a className="approve-target-url" href={lead.targets.link} target="_blank" rel="noopener noreferrer">
                {lead.targets.link}
              </a>
            )}
            <span className="approve-target-contacts">
              {lead.targets?.contacts && lead.targets.contacts.length > 0
                ? `${lead.targets.contacts.length} contact${lead.targets.contacts.length !== 1 ? 's' : ''}`
                : 'No contacts'}
            </span>

            {rejectingId === lead.id ? (
              <>
                <div className="approve-target-quick-reasons">
                  {['Wrong industry', 'Too small', 'Too large', 'Competitor', 'Not in our region', 'Already a customer'].map(reason => (
                    <button
                      key={reason}
                      className={`approve-target-quick-reason${rejectionReason === reason ? ' active' : ''}`}
                      onClick={() => setRejectionReason(rejectionReason === reason ? '' : reason)}
                    >{reason}</button>
                  ))}
                </div>
                <textarea
                  className="approve-target-reason"
                  placeholder="Or type a custom reason (optional)"
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  autoFocus
                />
                <div className="approve-target-reason-actions">
                  <button className="approve-target-reason-confirm" onClick={() => handleRejectConfirm(lead)}>
                    Reject
                  </button>
                  <button className="approve-target-reason-cancel" onClick={() => { setRejectingId(null); setRejectionReason('') }}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <div className="approve-target-actions">
                <button className="approve-target-btn approve" onClick={() => handleApprove(lead)}>
                  Approve
                </button>
                <button className="approve-target-btn reject" onClick={() => setRejectingId(lead.id)}>
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ApproveTargetsSidebar
