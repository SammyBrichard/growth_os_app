import React from 'react'
import { Target } from '../types/index'

interface BelfortTargetsProps {
  belfortItps: { id: string; name: string | null }[]
  belfortSelectedItpId: string | null
  belfortTargets: Target[]
  belfortSubTab: string
  selectedTarget: Target | null
  onSelectItp: (id: string) => void
  onSelectSubTab: (tab: string) => void
  onSelectTarget: (target: Target | null) => void
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
          {filtered.map(target => (
            <tr
              key={target.id}
              className={`targets-row${selectedTarget?.id === target.id ? ' selected' : ''}`}
              onClick={() => onSelectTarget(target)}
            >
              <td>{target.title ?? '\u2014'}</td>
              <td><a href={target.link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>{target.link}</a></td>
              <td className="targets-score">{target.score}</td>
              <td><span className={`contacts-count${(target.contacts?.length ?? 0) === 0 ? ' zero' : ''}`}>{target.contacts?.length ?? 0}</span></td>
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
