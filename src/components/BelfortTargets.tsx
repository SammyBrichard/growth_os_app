import React from 'react'
import { Lead } from '../types/index'

interface BelfortTargetsProps {
  belfortItps: { id: string; name: string | null }[]
  belfortSelectedItpId: string | null
  belfortTargets: Lead[]
  belfortSubTab: string
  selectedTarget: Lead | null
  onSelectItp: (id: string) => void
  onSelectSubTab: (tab: string) => void
  onSelectTarget: (lead: Lead | null) => void
}

const BelfortTargets: React.FC<BelfortTargetsProps> = ({
  belfortItps,
  belfortSelectedItpId,
  belfortTargets,
  belfortSubTab,
  selectedTarget,
  onSelectItp,
  onSelectSubTab,
  onSelectTarget,
}) => {
  const filtered = belfortTargets.filter(l =>
    belfortSubTab === 'approved' ? l.approved : (!l.approved && !l.rejected)
  )

  return (
    <div id="main-body" style={{ padding: '30px' }}>
      <div className="belfort-tabs">
        {belfortItps.map(itp => (
          <button
            key={itp.id}
            className={`belfort-tab${belfortSelectedItpId === itp.id ? ' active' : ''}`}
            onClick={() => { onSelectItp(itp.id); onSelectTarget(null) }}
          >
            {itp.name ?? 'Unnamed ITP'}
          </button>
        ))}
      </div>
      <div className="belfort-subtabs">
        <button
          className={`belfort-subtab${belfortSubTab === 'needs_approval' ? ' active' : ''}`}
          onClick={() => { onSelectSubTab('needs_approval'); onSelectTarget(null) }}
        >
          Need approval
        </button>
        <button
          className={`belfort-subtab${belfortSubTab === 'approved' ? ' active' : ''}`}
          onClick={() => { onSelectSubTab('approved'); onSelectTarget(null) }}
        >
          Approved
        </button>
      </div>
      {belfortSubTab === 'needs_approval' && (
        <p style={{ margin: '12px 0 4px', fontSize: '13px', color: '#888' }}>
          Please approve or reject all of the following leads that Belfort has found.
        </p>
      )}
      <table className="leads-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>URL</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(lead => (
            <tr
              key={lead.id}
              className={`leads-row${selectedTarget?.id === lead.id ? ' selected' : ''}`}
              onClick={() => onSelectTarget(lead)}
            >
              <td>{lead.title ?? '\u2014'}</td>
              <td><a href={lead.link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>{lead.link}</a></td>
              <td className="leads-score">{lead.score}</td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan={3} className="leads-empty">{belfortSubTab === 'approved' ? 'No approved leads yet.' : 'No leads awaiting approval.'}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default BelfortTargets
