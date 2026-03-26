import React from 'react'
import { Lead } from '../types/index'

interface BelfortTargetsProps {
  belfortItps: { id: string; name: string | null }[]
  belfortSelectedItpId: string | null
  belfortLeads: Lead[]
  belfortSubTab: string
  selectedLead: Lead | null
  onSelectItp: (id: string) => void
  onSelectSubTab: (tab: string) => void
  onSelectLead: (lead: Lead | null) => void
}

const BelfortTargets: React.FC<BelfortTargetsProps> = ({
  belfortItps,
  belfortSelectedItpId,
  belfortLeads,
  belfortSubTab,
  selectedLead,
  onSelectItp,
  onSelectSubTab,
  onSelectLead,
}) => {
  const filtered = belfortLeads.filter(l =>
    belfortSubTab === 'approved' ? l.approved : (!l.approved && !l.rejected)
  )

  return (
    <div id="main-body" style={{ padding: '30px' }}>
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
      </div>
      {belfortSubTab === 'needs_approval' && (
        <p style={{ margin: '12px 0 4px', fontSize: '13px', color: '#888' }}>
          Please approve or reject all of the following targets that Belfort has found.
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
          {filtered.length === 0 && (
            <tr><td colSpan={4} className="targets-empty">{belfortSubTab === 'approved' ? 'No approved targets yet.' : 'No targets awaiting approval.'}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default BelfortTargets
