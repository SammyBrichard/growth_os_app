import React, { useState, useEffect, useCallback } from 'react'
import supabase from '../services/supabase'
import type { Target } from '../types/index'

interface ApproveTargetsSidebarProps {
  itpId: string
  userDetailsId: string | null
  onComplete: (approved: number, rejected: number, hasReasons: boolean) => void
}

const ApproveTargetsSidebar: React.FC<ApproveTargetsSidebarProps> = ({ itpId, userDetailsId, onComplete }) => {
  const [targets, setTargets] = useState<Target[]>([])
  const [loading, setLoading] = useState(true)
  const [approvedCount, setApprovedCount] = useState(0)
  const [rejectedCount, setRejectedCount] = useState(0)
  const [hasReasons, setHasReasons] = useState(false)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const totalReviewed = approvedCount + rejectedCount
  const totalTargets = targets.length + totalReviewed

  useEffect(() => {
    if (!itpId) return
    setLoading(true)
    supabase
      .from('targets')
      .select('id, title, link, score, score_reason, approved, rejected, contacts(id, first_name, last_name, email, role)')
      .eq('itp', itpId)
      .gte('score', 70)
      .eq('approved', false)
      .eq('rejected', false)
      .order('score', { ascending: false })
      .then(({ data }) => {
        setTargets((data ?? []) as Target[])
        setLoading(false)
      })
  }, [itpId])

  const handleApprove = useCallback(async (target: Target) => {
    await supabase.from('targets').update({ approved: true }).eq('id', target.id)
    setTargets(prev => prev.filter(t => t.id !== target.id))
    setApprovedCount(prev => prev + 1)
  }, [])

  const handleRejectConfirm = useCallback(async (target: Target) => {
    const reason = rejectionReason.trim()
    await supabase.from('targets').update({ rejected: true, rejection_reason: reason || null }).eq('id', target.id)
    setTargets(prev => prev.filter(t => t.id !== target.id))
    setRejectedCount(prev => prev + 1)
    if (reason) setHasReasons(true)
    setRejectingId(null)
    setRejectionReason('')
  }, [rejectionReason])

  // Check completion after state updates
  useEffect(() => {
    if (!loading && totalTargets > 0 && targets.length === 0) {
      onComplete(approvedCount, rejectedCount, hasReasons)
    }
  }, [targets.length, loading, totalTargets, approvedCount, rejectedCount, hasReasons, onComplete])

  if (loading) {
    return <div className="approve-targets-done">Loading targets...</div>
  }

  if (targets.length === 0 && totalReviewed === 0) {
    return <div className="approve-targets-done">No targets to review.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="approve-targets-progress">
        {totalReviewed} of {totalTargets} reviewed
      </div>
      <div className="approve-targets-list">
        {targets.map(target => (
          <div key={target.id} className="approve-target-card">
            <div className="approve-target-header">
              <span className="approve-target-name">{target.title || 'Unnamed'}</span>
              <span className="approve-target-score">{target.score}</span>
            </div>
            {target.link && (
              <a className="approve-target-url" href={target.link} target="_blank" rel="noopener noreferrer">
                {target.link}
              </a>
            )}
            <span className="approve-target-contacts">
              {target.contacts && target.contacts.length > 0
                ? `${target.contacts.length} contact${target.contacts.length !== 1 ? 's' : ''}`
                : 'No contacts'}
            </span>

            {rejectingId === target.id ? (
              <>
                <textarea
                  className="approve-target-reason"
                  placeholder="Why is this target not a good fit? (optional)"
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  autoFocus
                />
                <div className="approve-target-reason-actions">
                  <button className="approve-target-reason-confirm" onClick={() => handleRejectConfirm(target)}>
                    Reject
                  </button>
                  <button className="approve-target-reason-cancel" onClick={() => { setRejectingId(null); setRejectionReason('') }}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <div className="approve-target-actions">
                <button className="approve-target-btn approve" onClick={() => handleApprove(target)}>
                  Approve
                </button>
                <button className="approve-target-btn reject" onClick={() => setRejectingId(target.id)}>
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
