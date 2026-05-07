import { useState, useEffect, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL

type Tab = 'overview' | 'target-finder' | 'analytics' | 'smartlead' | 'users'

interface Campaign {
  id: string
  name: string
  status: string
  account_id: string
  itp_id: string
  smartlead_campaign_id: string | null
  account: { organisation_name: string } | null
  itp: { name: string } | null
}

interface CronJob {
  id: string
  label: string
  campaign_ids: string[]
  cron_expression: string
  active: boolean
  last_run_at: string | null
  created_at: string
  campaigns: { id: string; name: string; company: string }[]
}

interface RunRecord {
  id: string
  campaign_id: string
  status: string
  estimated_cost_pence: number | null
  created_at: string
  campaigns: { name: string; account: { organisation_name: string } | null } | null
}

interface Analytics {
  aggregated: {
    totalLeads: number
    avgScore: number
    totalCampaignContacts: number
    totalCampaigns: number
    totalCompanies: number
    leadsThisWeek: number
    contactsThisWeek: number
  }
  recentRuns: RunRecord[]
  perCompany: { account_id: string; account_name: string; campaigns: any[]; leadCount: number; contactCount: number }[]
}

interface AdminUser {
  id: string
  firstname: string | null
  role: string | null
  is_super_admin: boolean
  account_id: string | null
  email: string | null
  account: { organisation_name: string } | null
}

const CRON_PRESETS = [
  { label: 'Every day at 9am', value: '0 9 * * *' },
  { label: 'Every Monday at 9am', value: '0 9 * * 1' },
  { label: 'Every weekday at 9am', value: '0 9 * * 1-5' },
  { label: 'Custom', value: 'custom' },
]

function groupByCompany(campaigns: Campaign[]) {
  const map: Record<string, { companyName: string; campaigns: Campaign[] }> = {}
  for (const c of campaigns) {
    const key = c.account_id
    if (!map[key]) map[key] = { companyName: c.account?.organisation_name ?? 'Unknown', campaigns: [] }
    map[key].campaigns.push(c)
  }
  return Object.values(map)
}

export default function SuperAdminDashboard({ userDetailsId }: { userDetailsId: string | null }) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [crons, setCrons] = useState<CronJob[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [smartlead, setSmartlead] = useState<{ sync_enabled: boolean; connected: boolean; updated_at: string | null } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Target finder state
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set())
  const [runLoading, setRunLoading] = useState(false)
  const [runResult, setRunResult] = useState<string | null>(null)

  // Cron creation state
  const [cronLabel, setCronLabel] = useState('')
  const [cronPreset, setCronPreset] = useState(CRON_PRESETS[0].value)
  const [cronCustom, setCronCustom] = useState('')
  const [cronCampaignIds, setCronCampaignIds] = useState<Set<string>>(new Set())
  const [cronLoading, setCronLoading] = useState(false)

  // Analytics drill-down
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)

  const get = useCallback(async (path: string) => {
    const res = await fetch(`${API_URL}/api/admin${path}?user_details_id=${userDetailsId}`)
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }, [userDetailsId])

  const post = useCallback(async (path: string, body: object) => {
    const res = await fetch(`${API_URL}/api/admin${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_details_id: userDetailsId, ...body }),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }, [userDetailsId])

  const patch = useCallback(async (path: string, body: object) => {
    const res = await fetch(`${API_URL}/api/admin${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_details_id: userDetailsId, ...body }),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }, [userDetailsId])

  const del = useCallback(async (path: string) => {
    const res = await fetch(`${API_URL}/api/admin${path}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_details_id: userDetailsId }),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }, [userDetailsId])

  useEffect(() => {
    if (!userDetailsId) return
    setError(null)
    setLoading(true)
    const loaders: Record<Tab, () => Promise<void>> = {
      'overview': async () => { const d = await get('/analytics'); setAnalytics(d) },
      'target-finder': async () => {
        const [c, cr] = await Promise.all([get('/campaigns'), get('/crons')])
        setCampaigns(c.campaigns); setCrons(cr.crons)
      },
      'analytics': async () => { const d = await get('/analytics'); setAnalytics(d) },
      'smartlead': async () => { const d = await get('/smartlead/status'); setSmartlead(d) },
      'users': async () => { const d = await get('/users'); setUsers(d.users) },
    }
    loaders[activeTab]().catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [activeTab, userDetailsId])

  async function handleRunNow() {
    if (selectedCampaignIds.size === 0) return
    setRunLoading(true)
    setRunResult(null)
    try {
      await post('/target-finder/run', { campaign_ids: [...selectedCampaignIds] })
      setRunResult(`Dispatched target-finder for ${selectedCampaignIds.size} campaign(s)`)
    } catch (e: any) {
      setRunResult(`Error: ${e.message}`)
    } finally {
      setRunLoading(false)
    }
  }

  async function handleCreateCron() {
    const expression = cronPreset === 'custom' ? cronCustom : cronPreset
    if (!cronLabel || cronCampaignIds.size === 0 || !expression) return
    setCronLoading(true)
    try {
      const { cron: created } = await post('/crons', {
        label: cronLabel,
        campaign_ids: [...cronCampaignIds],
        cron_expression: expression,
      })
      setCrons(prev => [created, ...prev])
      setCronLabel(''); setCronCampaignIds(new Set()); setCronCustom('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCronLoading(false)
    }
  }

  async function handleToggleCron(cronJob: CronJob) {
    try {
      const { cron: updated } = await patch(`/crons/${cronJob.id}`, { active: !cronJob.active })
      setCrons(prev => prev.map(c => c.id === cronJob.id ? { ...c, ...updated } : c))
    } catch (e: any) { setError(e.message) }
  }

  async function handleDeleteCron(id: string) {
    try {
      await del(`/crons/${id}`)
      setCrons(prev => prev.filter(c => c.id !== id))
    } catch (e: any) { setError(e.message) }
  }

  async function handleToggleSmartlead() {
    try {
      const { sync_enabled } = await post('/smartlead/toggle', {})
      setSmartlead(prev => prev ? { ...prev, sync_enabled } : null)
    } catch (e: any) { setError(e.message) }
  }

  async function handleToggleSuperAdmin(user: AdminUser) {
    try {
      await patch(`/users/${user.id}/super-admin`, { is_super_admin: !user.is_super_admin })
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_super_admin: !u.is_super_admin } : u))
    } catch (e: any) { setError(e.message) }
  }

  function toggleCampaignSelection(id: string, setter: React.Dispatch<React.SetStateAction<Set<string>>>) {
    setter(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'target-finder', label: 'Target Finder' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'smartlead', label: 'Smartlead' },
    { id: 'users', label: 'Users' },
  ]

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px 32px', fontFamily: 'var(--font-sans, Outfit, sans-serif)' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-serif, "Source Serif 4", serif)', fontSize: 26, fontWeight: 600, color: 'var(--fg, #1a1a18)', margin: 0 }}>
          Super Admin
        </h1>
        <p style={{ color: '#888', fontSize: 13, marginTop: 4 }}>System-wide controls and analytics</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid #e8e4dd' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '8px 14px',
              fontSize: 13, fontWeight: 500,
              color: activeTab === t.id ? 'var(--accent, #c44e2b)' : '#666',
              borderBottom: activeTab === t.id ? '2px solid var(--accent, #c44e2b)' : '2px solid transparent',
              marginBottom: -1, transition: 'color 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: '#fff3f0', border: '1px solid #ffd0c8', borderRadius: 6, padding: '10px 14px', marginBottom: 20, color: '#c44e2b', fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading && <div style={{ color: '#888', fontSize: 13 }}>Loading…</div>}

      {/* OVERVIEW TAB */}
      {!loading && activeTab === 'overview' && analytics && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
            {[
              { label: 'Companies', value: analytics.aggregated.totalCompanies },
              { label: 'Campaigns', value: analytics.aggregated.totalCampaigns },
              { label: 'Total Leads', value: analytics.aggregated.totalLeads },
              { label: 'Avg Lead Score', value: analytics.aggregated.avgScore },
              { label: 'Leads This Week', value: analytics.aggregated.leadsThisWeek },
              { label: 'Contacts Added This Week', value: analytics.aggregated.contactsThisWeek },
            ].map(stat => (
              <div key={stat.label} style={{ background: '#fff', border: '1px solid #e8e4dd', borderRadius: 8, padding: '16px 18px' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg, #1a1a18)' }}>{stat.value ?? '—'}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>Recent Target Finder Runs</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e8e4dd', color: '#888' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500 }}>Campaign</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500 }}>Company</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500 }}>Status</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500 }}>Cost</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500 }}>When</th>
              </tr>
            </thead>
            <tbody>
              {analytics.recentRuns.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                  <td style={{ padding: '8px' }}>{r.campaigns?.name ?? '—'}</td>
                  <td style={{ padding: '8px', color: '#666' }}>{r.campaigns?.account?.organisation_name ?? '—'}</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{
                      background: r.status === 'completed' ? '#e6f4ee' : r.status === 'failed' ? '#ffeee8' : '#f0f0f0',
                      color: r.status === 'completed' ? '#00a071' : r.status === 'failed' ? '#c44e2b' : '#666',
                      borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 500,
                    }}>{r.status}</span>
                  </td>
                  <td style={{ padding: '8px', color: '#666' }}>{r.estimated_cost_pence != null ? `${(r.estimated_cost_pence / 100).toFixed(2)}p` : '—'}</td>
                  <td style={{ padding: '8px', color: '#999', fontSize: 12 }}>{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {analytics.recentRuns.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 16, color: '#999', textAlign: 'center' }}>No runs yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TARGET FINDER TAB */}
      {!loading && activeTab === 'target-finder' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Run Now section */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>Run Now</h3>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>Select campaigns to run target-finder-100 on immediately.</p>
            <CampaignChecklist
              campaigns={campaigns}
              selected={selectedCampaignIds}
              onToggle={id => toggleCampaignSelection(id, setSelectedCampaignIds)}
            />
            {runResult && (
              <div style={{ marginTop: 12, fontSize: 13, color: runResult.startsWith('Error') ? '#c44e2b' : '#00a071' }}>{runResult}</div>
            )}
            <button
              onClick={handleRunNow}
              disabled={selectedCampaignIds.size === 0 || runLoading}
              style={{
                marginTop: 14, padding: '9px 20px', background: selectedCampaignIds.size === 0 ? '#ccc' : 'var(--accent, #c44e2b)',
                color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: selectedCampaignIds.size === 0 ? 'default' : 'pointer',
              }}
            >
              {runLoading ? 'Dispatching…' : `Run Now (${selectedCampaignIds.size} selected)`}
            </button>
          </div>

          {/* Schedule section */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>Create Schedule</h3>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>Set up a recurring target-finder run across one or more campaigns.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480 }}>
              <div>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Label</label>
                <input
                  value={cronLabel}
                  onChange={e => setCronLabel(e.target.value)}
                  placeholder="e.g. Monday morning run"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Schedule</label>
                <select
                  value={cronPreset}
                  onChange={e => setCronPreset(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}
                >
                  {CRON_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                {cronPreset === 'custom' && (
                  <input
                    value={cronCustom}
                    onChange={e => setCronCustom(e.target.value)}
                    placeholder="e.g. 0 9 * * 1"
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, marginTop: 8, boxSizing: 'border-box' }}
                  />
                )}
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 8 }}>Campaigns</label>
                <CampaignChecklist
                  campaigns={campaigns}
                  selected={cronCampaignIds}
                  onToggle={id => toggleCampaignSelection(id, setCronCampaignIds)}
                />
              </div>
              <button
                onClick={handleCreateCron}
                disabled={!cronLabel || cronCampaignIds.size === 0 || cronLoading}
                style={{
                  padding: '9px 20px', background: (!cronLabel || cronCampaignIds.size === 0) ? '#ccc' : 'var(--accent, #c44e2b)',
                  color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600,
                  cursor: (!cronLabel || cronCampaignIds.size === 0) ? 'default' : 'pointer',
                }}
              >
                {cronLoading ? 'Creating…' : 'Create Schedule'}
              </button>
            </div>
          </div>

          {/* Existing crons */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>Scheduled Runs</h3>
            {crons.length === 0
              ? <p style={{ fontSize: 13, color: '#999' }}>No schedules yet.</p>
              : crons.map(cronJob => (
                <div key={cronJob.id} style={{ background: '#fff', border: '1px solid #e8e4dd', borderRadius: 8, padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)' }}>{cronJob.label}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      <code style={{ background: '#f5f3ef', padding: '1px 6px', borderRadius: 3 }}>{cronJob.cron_expression}</code>
                      {' · '}{cronJob.campaigns.length} campaign{cronJob.campaigns.length !== 1 ? 's' : ''}
                    </div>
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                      {cronJob.campaigns.map(c => `${c.name} (${c.company})`).join(', ')}
                    </div>
                    {cronJob.last_run_at && (
                      <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>Last run: {new Date(cronJob.last_run_at).toLocaleString()}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <button
                      onClick={() => handleToggleCron(cronJob)}
                      style={{
                        padding: '5px 12px', fontSize: 12, border: '1px solid #ddd', borderRadius: 5,
                        background: cronJob.active ? '#e6f4ee' : '#f5f3ef',
                        color: cronJob.active ? '#00a071' : '#888', cursor: 'pointer', fontWeight: 500,
                      }}
                    >
                      {cronJob.active ? 'Active' : 'Paused'}
                    </button>
                    <button
                      onClick={() => handleDeleteCron(cronJob.id)}
                      style={{ padding: '5px 10px', fontSize: 12, border: '1px solid #ffd0c8', borderRadius: 5, background: '#fff3f0', color: '#c44e2b', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ANALYTICS TAB */}
      {!loading && activeTab === 'analytics' && analytics && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
            {[
              { label: 'Total Leads', value: analytics.aggregated.totalLeads },
              { label: 'Avg Lead Score', value: analytics.aggregated.avgScore },
              { label: 'Total Contacted', value: analytics.aggregated.totalCampaignContacts },
              { label: 'Companies', value: analytics.aggregated.totalCompanies },
            ].map(stat => (
              <div key={stat.label} style={{ background: '#fff', border: '1px solid #e8e4dd', borderRadius: 8, padding: '16px 18px' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg, #1a1a18)' }}>{stat.value ?? '—'}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>Per Company</h3>
          {analytics.perCompany.map(co => (
            <div key={co.account_id} style={{ background: '#fff', border: '1px solid #e8e4dd', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
              <button
                onClick={() => setExpandedCompany(expandedCompany === co.account_id ? null : co.account_id)}
                style={{
                  width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)' }}>{co.account_name ?? 'Unnamed'}</span>
                <span style={{ fontSize: 12, color: '#888' }}>
                  {co.leadCount} leads · {co.contactCount} contacts · {(co.campaigns || []).length} campaign{(co.campaigns || []).length !== 1 ? 's' : ''}
                  {' '}{expandedCompany === co.account_id ? '▲' : '▼'}
                </span>
              </button>
              {expandedCompany === co.account_id && (
                <div style={{ padding: '0 16px 14px', borderTop: '1px solid #f0ede8' }}>
                  {(co.campaigns || []).length === 0
                    ? <p style={{ fontSize: 13, color: '#999', marginTop: 10 }}>No campaigns</p>
                    : (co.campaigns || []).map((c: any) => (
                      <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f5f3ef', fontSize: 13 }}>
                        <span style={{ color: 'var(--fg)' }}>{c.name}</span>
                        <span style={{ color: '#888' }}>
                          <span style={{
                            background: c.status === 'active' ? '#e6f4ee' : '#f5f3ef',
                            color: c.status === 'active' ? '#00a071' : '#888',
                            borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 500, marginRight: 8,
                          }}>{c.status}</span>
                        </span>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* SMARTLEAD TAB */}
      {!loading && activeTab === 'smartlead' && smartlead && (
        <div style={{ maxWidth: 480 }}>
          <div style={{ background: '#fff', border: '1px solid #e8e4dd', borderRadius: 8, padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg)' }}>API Connection</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Live ping to Smartlead API</div>
              </div>
              <span style={{
                background: smartlead.connected ? '#e6f4ee' : '#ffeee8',
                color: smartlead.connected ? '#00a071' : '#c44e2b',
                borderRadius: 5, padding: '4px 12px', fontSize: 12, fontWeight: 600,
              }}>
                {smartlead.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg)' }}>Sync Enabled</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  {smartlead.sync_enabled
                    ? 'New contacts are being pushed to Smartlead'
                    : 'Sync is paused — contacts won\'t be pushed'}
                </div>
              </div>
              <button
                onClick={handleToggleSmartlead}
                style={{
                  padding: '7px 18px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: smartlead.sync_enabled ? '#c44e2b' : '#00a071', color: '#fff',
                  fontSize: 13, fontWeight: 600,
                }}
              >
                {smartlead.sync_enabled ? 'Disable Sync' : 'Enable Sync'}
              </button>
            </div>
            {smartlead.updated_at && (
              <div style={{ fontSize: 11, color: '#bbb', marginTop: 14 }}>Last changed: {new Date(smartlead.updated_at).toLocaleString()}</div>
            )}
          </div>
          <p style={{ fontSize: 12, color: '#aaa', lineHeight: 1.6 }}>
            One global Smartlead connection shared across all accounts. Disabling sync prevents new contacts from being pushed when target-finder runs.
          </p>
        </div>
      )}

      {/* USERS TAB */}
      {!loading && activeTab === 'users' && (
        <div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e8e4dd', color: '#888' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500 }}>Name</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500 }}>Email</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500 }}>Company</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500 }}>Role</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500 }}>Super Admin</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f0ede8' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 500 }}>{u.firstname ?? '—'}</td>
                  <td style={{ padding: '10px 8px', color: '#666' }}>{u.email ?? '—'}</td>
                  <td style={{ padding: '10px 8px', color: '#666' }}>{u.account?.organisation_name ?? '—'}</td>
                  <td style={{ padding: '10px 8px', color: '#888' }}>{u.role ?? '—'}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <button
                      onClick={() => handleToggleSuperAdmin(u)}
                      style={{
                        padding: '4px 12px', fontSize: 12, border: '1px solid #ddd', borderRadius: 5,
                        background: u.is_super_admin ? '#e6f4ee' : '#f5f3ef',
                        color: u.is_super_admin ? '#00a071' : '#888', cursor: 'pointer', fontWeight: 500,
                      }}
                    >
                      {u.is_super_admin ? 'Yes' : 'No'}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 16, color: '#999', textAlign: 'center' }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CampaignChecklist({
  campaigns,
  selected,
  onToggle,
}: {
  campaigns: Campaign[]
  selected: Set<string>
  onToggle: (id: string) => void
}) {
  const groups = groupByCompany(campaigns)
  if (groups.length === 0) return <p style={{ fontSize: 13, color: '#999' }}>No campaigns found.</p>

  return (
    <div style={{ border: '1px solid #e8e4dd', borderRadius: 8, overflow: 'hidden', maxHeight: 280, overflowY: 'auto' }}>
      {groups.map((group, i) => (
        <div key={i}>
          <div style={{ padding: '8px 12px', background: '#f9f7f4', fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {group.companyName}
          </div>
          {group.campaigns.map(c => (
            <label
              key={c.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
                cursor: 'pointer', borderBottom: '1px solid #f0ede8', fontSize: 13,
                background: selected.has(c.id) ? '#fdf6f4' : '#fff',
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(c.id)}
                onChange={() => onToggle(c.id)}
                style={{ accentColor: 'var(--accent, #c44e2b)', width: 14, height: 14 }}
              />
              <span style={{ color: 'var(--fg, #1a1a18)', flex: 1 }}>{c.name}</span>
              <span style={{ fontSize: 11, color: '#aaa' }}>{c.itp?.name ?? ''}</span>
              <span style={{
                fontSize: 11, fontWeight: 500, padding: '1px 7px', borderRadius: 3,
                background: c.status === 'active' ? '#e6f4ee' : '#f5f3ef',
                color: c.status === 'active' ? '#00a071' : '#888',
              }}>{c.status}</span>
            </label>
          ))}
        </div>
      ))}
    </div>
  )
}
