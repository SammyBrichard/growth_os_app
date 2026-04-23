import React, { useState } from 'react'
import { Lead } from '../types/index'

interface BelfortTargetsProps {
  belfortItps: { id: string; name: string | null }[]
  belfortSelectedItpId: string | null
  belfortLeads: Lead[]
  belfortSubTab: string
  selectedLead: Lead | null
  loading?: boolean
  hasMoreLeads?: boolean
  onLoadMoreLeads?: () => void
  belfortSummary?: string | null
  pendingRefinementCount?: number
  refining?: boolean
  onSelectItp: (id: string) => void
  onSelectSubTab: (tab: string) => void
  onSelectLead: (lead: Lead | null) => void
  onRefineItp?: (itpId: string) => Promise<string | null>
}

const BelfortTargets: React.FC<BelfortTargetsProps> = ({
  belfortItps,
  belfortSelectedItpId,
  belfortLeads,
  belfortSubTab,
  selectedLead,
  loading,
  hasMoreLeads,
  onLoadMoreLeads,
  belfortSummary,
  pendingRefinementCount = 0,
  refining = false,
  onSelectItp,
  onSelectSubTab,
  onSelectLead,
  onRefineItp,
}) => {
  const [refineSummary, setRefineSummary] = useState<string | null>(null)

  const filtered = belfortLeads.filter(l =>
    belfortSubTab === 'approved' ? l.approved : (!l.approved && !l.rejected)
  )

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
      <div className="belfort-subtabs">
        <button
          className={`belfort-subtab${belfortSubTab === 'needs_approval' ? ' active' : ''}`}
          onClick={() => { onSelectSubTab('needs_approval'); onSelectLead(null) }}
        >
          Need approval
        </button>
        <button
          className={`belfort-subtab${belfortSubTab === 'approved' ? ' active' : ''}`}
          onClick={() => { onSelectSubTab('approved'); onSelectLead(null) }}
        >
          Approved
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
              <td>{lead.targets?.title ?? '\u2014'}</td>
              <td><a href={lead.targets?.link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>{lead.targets?.link}</a></td>
              <td className="targets-score">{lead.score}</td>
              <td><span className={`contacts-count${(lead.targets?.contacts?.length ?? 0) === 0 ? ' zero' : ''}`}>{lead.targets?.contacts?.length ?? 0}</span></td>
            </tr>
          ))}
          {loading && (
            <tr><td colSpan={4} className="targets-empty">Loading targets...</td></tr>
          )}
          {!loading && filtered.length === 0 && (
            <tr><td colSpan={4} className="targets-empty">{belfortSubTab === 'approved' ? 'No approved targets yet.' : 'No targets awaiting approval.'}</td></tr>
          )}
        </tbody>
      </table>
      {hasMoreLeads && (
        <button className="load-more-btn" onClick={onLoadMoreLeads}>Load more targets</button>
      )}
    </div>
  )
}

export default BelfortTargets
