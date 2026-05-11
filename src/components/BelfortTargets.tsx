import React, { useState, useEffect } from 'react'
import { Lead } from '../types/index'

interface BelfortTargetsProps {
  belfortItps: { id: string; name: string | null }[]
  belfortSelectedItpId: string | null
  belfortSubTab: string
  selectedLead: Lead | null
  loading?: boolean
  belfortSummary?: string | null
  pendingRefinementCount?: number
  refining?: boolean
  // Needs approval queue
  needsApprovalDisplay: Lead[]
  needsApprovalTotal: number
  // Approved pagination
  approvedLeads: Lead[]
  approvedPage: number
  approvedPageCount: number
  approvedTotal: number
  approvedLoading?: boolean
  onApprovedPageChange: (page: number) => void
  // Auto-approve
  autoApproveLeads: boolean
  onToggleAutoApprove: (value: boolean) => void
  onSelectItp: (id: string) => void
  onSelectSubTab: (tab: string) => void
  onSelectLead: (lead: Lead | null) => void
  onRefineItp?: (itpId: string) => Promise<string | null>
}

const BelfortTargets: React.FC<BelfortTargetsProps> = ({
  belfortItps,
  belfortSelectedItpId,
  belfortSubTab,
  selectedLead,
  loading,
  belfortSummary,
  pendingRefinementCount = 0,
  refining = false,
  needsApprovalDisplay,
  needsApprovalTotal,
  approvedLeads,
  approvedPage,
  approvedPageCount,
  approvedTotal,
  approvedLoading,
  onApprovedPageChange,
  autoApproveLeads,
  onToggleAutoApprove,
  onSelectItp,
  onSelectSubTab,
  onSelectLead,
  onRefineItp,
}) => {
  const [refineSummary, setRefineSummary] = useState<string | null>(null)
  const [contactFilter, setContactFilter] = useState<'all' | 'with' | 'without'>('all')

  useEffect(() => { setContactFilter('all') }, [belfortSubTab])

  const withContactsCount = approvedLeads.filter(l => (l.targets?.contacts?.length ?? 0) > 0).length
  const withoutContactsCount = approvedLeads.filter(l => (l.targets?.contacts?.length ?? 0) === 0).length

  const filtered = belfortSubTab === 'approved'
    ? approvedLeads.filter(l => {
        if (contactFilter === 'with') return (l.targets?.contacts?.length ?? 0) > 0
        if (contactFilter === 'without') return (l.targets?.contacts?.length ?? 0) === 0
        return true
      })
    : needsApprovalDisplay

  const handleRefine = async () => {
    if (!onRefineItp || !belfortSelectedItpId) return
    setRefineSummary(null)
    const summary = await onRefineItp(belfortSelectedItpId)
    if (summary) setRefineSummary(summary)
  }

  return (
    <div id="main-body" style={{ padding: '30px' }}>
      <div className="draper-summary">
        <div className="agent-label">BELFORT</div>
        {belfortSummary ? (
          <div className="draper-summary-bubble msg-animate">{belfortSummary}</div>
        ) : (
          <div className="typing-dots">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        )}
      </div>
      {belfortSummary && <hr className="draper-divider" />}
      <div className="belfort-tabs">
        {belfortItps.map(itp => (
          <button
            key={itp.id}
            className={`belfort-tab${belfortSelectedItpId === itp.id ? ' active' : ''}`}
            onClick={() => { onSelectItp(itp.id); onSelectLead(null) }}
          >
            {itp.name ?? 'Unnamed ITP'}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div className="belfort-subtabs">
          <button
            className={`belfort-subtab${belfortSubTab === 'needs_approval' ? ' active' : ''}`}
            onClick={() => { onSelectSubTab('needs_approval'); onSelectLead(null) }}
          >
            Need approval{needsApprovalTotal > 0 ? ` (${needsApprovalTotal})` : ''}
          </button>
          <button
            className={`belfort-subtab${belfortSubTab === 'approved' ? ' active' : ''}`}
            onClick={() => { onSelectSubTab('approved'); onSelectLead(null) }}
          >
            Approved{approvedTotal > 0 ? ` (${approvedTotal})` : ''}
          </button>
          {belfortSubTab === 'approved' && pendingRefinementCount > 0 && (
            <button
              className="belfort-subtab refine-itp-btn"
              onClick={handleRefine}
              disabled={refining}
            >
              {refining ? 'Refining…' : `Refine ITP (${pendingRefinementCount} rejection${pendingRefinementCount !== 1 ? 's' : ''})`}
            </button>
          )}
        </div>
        <label
          className={`auto-approve-toggle${autoApproveLeads ? ' on' : ''}`}
          onClick={() => onToggleAutoApprove(!autoApproveLeads)}
        >
          <div className="toggle-track">
            <div className="toggle-thumb" />
          </div>
          <span className="toggle-text">
            {autoApproveLeads ? 'Leads auto-approved' : 'Leads require approval'}
          </span>
        </label>
      </div>
      {belfortSubTab === 'approved' && (
        <div className="belfort-subtabs" style={{ marginTop: '8px' }}>
          <button
            className={`belfort-subtab${contactFilter === 'all' ? ' active' : ''}`}
            onClick={() => setContactFilter('all')}
          >
            All ({approvedLeads.length})
          </button>
          <button
            className={`belfort-subtab${contactFilter === 'with' ? ' active' : ''}`}
            onClick={() => setContactFilter('with')}
          >
            With contacts ({withContactsCount})
          </button>
          <button
            className={`belfort-subtab${contactFilter === 'without' ? ' active' : ''}`}
            onClick={() => setContactFilter('without')}
          >
            No contacts ({withoutContactsCount})
          </button>
        </div>
      )}
      {refineSummary && (
        <div className="refine-summary-banner">
          {refineSummary}
        </div>
      )}
      {belfortSubTab === 'needs_approval' && (
        <p style={{ margin: '12px 0 4px', fontSize: '13px', color: 'var(--muted)' }}>
          Please approve or reject all of the following targets that Belfort has found.
        </p>
      )}
      {belfortSubTab === 'approved' && pendingRefinementCount === 0 && (
        <p style={{ margin: '12px 0 4px', fontSize: '13px', color: 'var(--muted)' }}>
          Click a lead to view details or reject it. Rejected leads will update your ITP when you refine.
        </p>
      )}
      <table className="targets-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>URL</th>
            <th>Score</th>
            <th>Contacts</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(lead => (
            <tr
              key={lead.id}
              className={`targets-row${selectedLead?.id === lead.id ? ' selected' : ''}`}
              onClick={() => onSelectLead(lead)}
            >
              <td>{lead.targets?.title ?? '—'}</td>
              <td><a href={lead.targets?.link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>{lead.targets?.link}</a></td>
              <td className="targets-score">{lead.score}</td>
              <td><span className={`contacts-count${(lead.targets?.contacts?.length ?? 0) === 0 ? ' zero' : ''}`}>{lead.targets?.contacts?.length ?? 0}</span></td>
            </tr>
          ))}
          {(loading || approvedLoading) && (
            <tr><td colSpan={4} className="targets-empty">Loading targets...</td></tr>
          )}
          {!loading && !approvedLoading && filtered.length === 0 && (
            <tr><td colSpan={4} className="targets-empty">
              {contactFilter !== 'all'
                ? `No approved targets ${contactFilter === 'with' ? 'with contacts' : 'without contacts'}.`
                : belfortSubTab === 'approved' ? 'No approved targets yet.' : 'No targets awaiting approval.'}
            </td></tr>
          )}
        </tbody>
      </table>
      {belfortSubTab === 'approved' && approvedPageCount > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px', justifyContent: 'center' }}>
          <button
            className="load-more-btn"
            onClick={() => onApprovedPageChange(approvedPage - 1)}
            disabled={approvedPage <= 1}
            style={{ margin: 0 }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Page {approvedPage} of {approvedPageCount}
          </span>
          <button
            className="load-more-btn"
            onClick={() => onApprovedPageChange(approvedPage + 1)}
            disabled={approvedPage >= approvedPageCount}
            style={{ margin: 0 }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

export default BelfortTargets
