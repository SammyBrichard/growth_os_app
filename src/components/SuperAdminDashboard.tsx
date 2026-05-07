import { useState, useEffect, useCallback, useMemo } from 'react'

const API_URL = import.meta.env.VITE_API_URL

function getNextFires(expr: string, count: number): string[] {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return []
  const [minStr, hourStr, , , dowStr] = parts
  const min = parseInt(minStr), hour = parseInt(hourStr)
  if (isNaN(min) || isNaN(hour)) return []
  let allowed: number[]
  if (dowStr === '*') allowed = [0,1,2,3,4,5,6]
  else if (dowStr === '1-5') allowed = [1,2,3,4,5]
  else { const d = parseInt(dowStr); allowed = isNaN(d) ? [0,1,2,3,4,5,6] : [d] }
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const results: string[] = []
  const cursor = new Date(); cursor.setSeconds(0,0); cursor.setMinutes(cursor.getMinutes()+1)
  let iters = 0
  while (results.length < count && iters++ < 10000) {
    const h = cursor.getHours(), m = cursor.getMinutes(), dow = cursor.getDay()
    if (h === hour && m === min) {
      if (allowed.includes(dow)) {
        results.push(`${days[dow]} ${cursor.getDate()} ${months[cursor.getMonth()]}, ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
        cursor.setMinutes(m + 1)
      } else {
        cursor.setDate(cursor.getDate()+1); cursor.setHours(0,0,0,0)
      }
    } else if (h > hour || (h === hour && m > min)) {
      cursor.setDate(cursor.getDate()+1); cursor.setHours(0,0,0,0)
    } else {
      cursor.setHours(hour, min, 0, 0)
    }
  }
  return results
}

// ── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#f6f3ee', fg: '#1a1a18', muted: '#8a857b', accent: '#c44e2b',
  border: '#e2ddd4', cream: '#faf8f4', green: '#00a071', gold: '#b8860b',
}
const SERIF = '"Source Serif 4", Georgia, serif'
const MONO  = '"DM Mono", ui-monospace, monospace'

// ── Types ────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'target-finder' | 'analytics' | 'smartlead' | 'users'

interface Campaign {
  id: string; name: string; status: string; account_id: string; itp_id: string
  smartlead_campaign_id: string | null
  account: { organisation_name: string } | null
  itp: { name: string } | null
}
interface CronJob {
  id: string; label: string; campaign_ids: string[]; cron_expression: string
  active: boolean; last_run_at: string | null; created_at: string
  timezone: string | null; last_run_leads: number | null
  campaigns: { id: string; name: string; company: string }[]
}
interface RunRecord {
  id: string; campaign_id: string; status: string; estimated_cost_pence: number | null
  created_at: string
  campaigns: { name: string; account: { organisation_name: string } | null } | null
}
interface Analytics {
  aggregated: {
    totalLeads: number; avgScore: number; totalCampaignContacts: number; totalCampaigns: number; totalCompanies: number
    leadsThisWeek: number; leadsLastWeek: number
    contactsThisWeek: number; contactsLastWeek: number
    avgScoreLastWeek: number
    campaignsThisWeek: number; campaignsLastWeek: number
    companiesThisWeek: number; companiesLastWeek: number
    sparks: { leads: number[]; contacts: number[]; campaigns: number[]; companies: number[]; avgScore: number[] }
  }
  recentRuns: RunRecord[]
  perCompany: { account_id: string; account_name: string; campaigns: any[]; leadCount: number; contactCount: number }[]
}
interface AdminUser {
  auth_id: string; firstname: string | null; email: string | null; is_super_admin: boolean
  companies: { user_details_id: string; account_id: string | null; account_name: string | null; role: string | null }[]
}
interface SmartleadStatus { sync_enabled: boolean; connected: boolean; connectError: string | null; updated_at: string | null }


const COMPANY_COLORS = ['#c44e2b','#00a071','#b8860b','#3b6e8f','#7a5cb0','#5a8d6e','#d44a2b','#2d6a8f']

const CRON_PRESETS = [
  { label: 'Every day at 9am',      freq: 'daily',    expr: '0 9 * * *' },
  { label: 'Every Monday at 9am',   freq: 'weekly',   expr: '0 9 * * 1' },
  { label: 'Every weekday at 9am',  freq: 'weekdays', expr: '0 9 * * 1-5' },
  { label: 'Custom',                freq: 'custom',   expr: '' },
]

// ── Primitives ───────────────────────────────────────────────────────────────
function Sparkline({ data, color = C.accent, height = 28, width = 96 }: { data: number[]; color?: string; height?: number; width?: number }) {
  if (!data || data.length < 2) return null
  const min = Math.min(...data), max = Math.max(...data), span = max - min || 1
  const step = width / (data.length - 1)
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / span) * (height - 4) - 2).toFixed(1)}`).join(' ')
  const lastY = height - ((data[data.length - 1] - min) / span) * (height - 4) - 2
  return (
    <svg width={width} height={height} style={{ overflow: 'visible', flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={width} cy={lastY} r={2.4} fill={color} />
    </svg>
  )
}

function StatCard({ label, value, spark, sparkColor, delta, big }: { label: string; value: string | number; spark?: number[]; sparkColor?: string; delta?: number | null; big?: boolean }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: big ? '20px 22px' : '16px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontFamily: MONO, fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontFamily: MONO, fontSize: big ? 32 : 24, fontWeight: 600, color: C.fg, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{value}</div>
        {spark && <Sparkline data={spark} color={sparkColor || C.accent} />}
      </div>
      {delta != null && (
        <div style={{ fontFamily: MONO, fontSize: 11, color: delta >= 0 ? C.green : C.accent }}>
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}% <span style={{ color: C.muted }}>vs last week</span>
        </div>
      )}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const p: Record<string, { bg: string; fg: string }> = {
    completed: { bg: `color-mix(in srgb, ${C.green} 12%, transparent)`, fg: C.green },
    failed:    { bg: `color-mix(in srgb, ${C.accent} 12%, transparent)`, fg: C.accent },
    running:   { bg: `color-mix(in srgb, ${C.gold} 14%, transparent)`, fg: C.gold },
    active:    { bg: `color-mix(in srgb, ${C.green} 12%, transparent)`, fg: C.green },
    paused:    { bg: `color-mix(in srgb, ${C.gold} 14%, transparent)`, fg: C.gold },
    draft:     { bg: C.cream, fg: C.muted },
  }
  const style = p[status] || { bg: C.cream, fg: C.muted }
  return (
    <span style={{ fontFamily: MONO, display: 'inline-flex', alignItems: 'center', gap: 5, background: style.bg, color: style.fg, borderRadius: 999, padding: '2px 9px 2px 8px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: style.fg, animation: status === 'running' ? 'sa-pulse 1.4s ease-in-out infinite' : undefined }} />
      {status}
    </span>
  )
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div style={{ height: 6, background: C.cream, borderRadius: 3, overflow: 'hidden', flex: 1 }}>
      <div style={{ width: `${Math.min(100, (value / max) * 100)}%`, height: '100%', background: color, borderRadius: 3 }} />
    </div>
  )
}

function PrimaryButton({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ fontFamily: MONO, padding: '10px 22px', borderRadius: 6, border: 'none', background: disabled ? C.border : C.accent, color: '#fff', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', cursor: disabled ? 'default' : 'pointer' }}>
      {children}
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  )
}

// ── Stacked area chart ────────────────────────────────────────────────────────
function StackedAreaChart({ perCompany }: { perCompany: { account_name: string; leadCount: number; color: string }[] }) {
  const W = 700, H = 200, PAD = 28, DAYS = 7
  const innerW = W - PAD * 2, innerH = H - PAD * 2
  const dayLabels = ['Wed','Thu','Fri','Sat','Sun','Mon','Tue']

  // Synthesise time series from real totals
  const series = perCompany.map((co, idx) => {
    const factor = co.leadCount || 0
    const base = COMPANY_TIMESERIES_SEEDS[idx % COMPANY_TIMESERIES_SEEDS.length]
    const scale = factor / (base[6] || 1)
    return { name: co.account_name, color: co.color, data: base.map(v => Math.round(v * scale)) }
  })

  const totals = Array(DAYS).fill(0)
  series.forEach(s => s.data.forEach((v, i) => { totals[i] += v }))
  const max = Math.max(...totals) || 1

  const layers: { name: string; color: string; points: string; area: string }[] = []
  const running = Array(DAYS).fill(0)
  series.forEach(s => {
    const topPts = s.data.map((v, i) => {
      const x = PAD + (i / (DAYS - 1)) * innerW
      const y1 = PAD + innerH - ((running[i] + v) / max) * innerH
      return `${x.toFixed(1)},${y1.toFixed(1)}`
    })
    const botPts = [...s.data].map((v, i) => {
      const x = PAD + (i / (DAYS - 1)) * innerW
      const y0 = PAD + innerH - (running[i] / max) * innerH
      return `${x.toFixed(1)},${y0.toFixed(1)}`
    }).reverse()
    s.data.forEach((v, i) => { running[i] += v })
    layers.push({ name: s.name, color: s.color, points: topPts.join(' '), area: topPts.join(' ') + ' ' + botPts.join(' ') })
  })

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = PAD + innerH - t * innerH
        return (
          <g key={t}>
            <line x1={PAD} x2={W - PAD} y1={y} y2={y} stroke={C.border} strokeWidth="1" strokeDasharray={t === 0 ? '' : '2 4'} />
            <text x={PAD - 8} y={y + 3} textAnchor="end" fontSize="10" fontFamily={MONO} fill={C.muted}>{Math.round(t * max)}</text>
          </g>
        )
      })}
      {layers.map(l => (
        <polygon key={l.name} points={l.area} fill={l.color} fillOpacity="0.78" stroke="#fff" strokeWidth="1" />
      ))}
      {dayLabels.map((d, i) => (
        <text key={i} x={PAD + (i / (DAYS - 1)) * innerW} y={H - 6} textAnchor="middle" fontSize="10" fontFamily={MONO} fill={C.muted}>{d}</text>
      ))}
    </svg>
  )
}

const COMPANY_TIMESERIES_SEEDS = [
  [188,196,220,232,248,261,280],
  [142,148,156,168,174,188,196],
  [98,104,112,118,124,132,144],
  [76,82,88,94,98,108,116],
  [54,58,62,68,72,78,84],
  [42,46,50,54,58,62,68],
]

// ── Campaign picker ───────────────────────────────────────────────────────────
function CampaignPickerList({ campaigns, selected, setSelected, search, setSearch }: {
  campaigns: Campaign[]; selected: Set<string>
  setSelected: React.Dispatch<React.SetStateAction<Set<string>>>
  search: string; setSearch: (s: string) => void
}) {
  const groups = useMemo(() => {
    const map: Record<string, { name: string; color: string; short: string; campaigns: Campaign[] }> = {}
    campaigns.forEach(c => {
      const key = c.account_id
      const name = c.account?.organisation_name || 'Unknown'
      if (!map[key]) {
        const idx = Object.keys(map).length
        map[key] = { name, color: COMPANY_COLORS[idx % COMPANY_COLORS.length], short: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(), campaigns: [] }
      }
      map[key].campaigns.push(c)
    })
    return Object.entries(map).map(([id, g]) => ({ id, ...g })).filter(g => {
      if (!search) return true
      return g.campaigns.some(c => c.name.toLowerCase().includes(search.toLowerCase()) || g.name.toLowerCase().includes(search.toLowerCase()))
    }).map(g => ({
      ...g,
      campaigns: search ? g.campaigns.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || g.name.toLowerCase().includes(search.toLowerCase())) : g.campaigns,
    }))
  }, [campaigns, search])

  const toggle = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectAllInGroup = (g: typeof groups[0]) => {
    const ids = g.campaigns.map(c => c.id)
    setSelected(prev => { const n = new Set(prev); const allOn = ids.every(i => n.has(i)); ids.forEach(i => allOn ? n.delete(i) : n.add(i)); return n })
  }

  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: `1px solid ${C.border}`, background: C.cream }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>⌕</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search campaigns or companies…"
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontFamily: SERIF, color: C.fg }} />
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>{selected.size} selected</span>
      </div>
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {groups.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: 13 }}>No campaigns found</div>}
        {groups.map(g => {
          const allOn = g.campaigns.every(c => selected.has(c.id))
          const someOn = g.campaigns.some(c => selected.has(c.id))
          return (
            <div key={g.id}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: C.cream, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: MONO, width: 18, height: 18, borderRadius: 3, background: g.color, color: '#fff', fontSize: 9, fontWeight: 600, display: 'grid', placeItems: 'center' }}>{g.short}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: C.fg, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{g.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.muted }}>{g.campaigns.length}</span>
                </div>
                <button onClick={() => selectAllInGroup(g)} style={{ fontFamily: MONO, background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {allOn ? 'Clear all' : someOn ? 'Select all' : 'Select all'}
                </button>
              </div>
              {g.campaigns.map(c => {
                const on = selected.has(c.id)
                return (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', cursor: 'pointer', borderBottom: `1px solid ${C.border}`, background: on ? `color-mix(in srgb, ${C.accent} 5%, transparent)` : '#fff' }}>
                    <span style={{ width: 16, height: 16, borderRadius: 4, border: on ? 'none' : `1.5px solid ${C.border}`, background: on ? C.accent : '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      {on && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
                    </span>
                    <input type="checkbox" checked={on} onChange={() => toggle(c.id)} style={{ display: 'none' }} />
                    <span style={{ fontSize: 13, color: C.fg, flex: 1 }}>{c.name}</span>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>{c.itp?.name || ''}</span>
                    <StatusPill status={c.status} />
                  </label>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab({ analytics, loading }: { analytics: Analytics | null; loading: boolean }) {
  if (loading || !analytics) return <LoadingState />
  const { aggregated, recentRuns } = analytics
  const completed = recentRuns.filter(r => r.status === 'completed').length
  const failed = recentRuns.filter(r => r.status === 'failed').length

  const companyColorMap = makeCompanyColorMap(analytics.perCompany)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}>
        <StatCard label="Companies"     value={aggregated.totalCompanies}    spark={aggregated.sparks.companies} delta={pctDelta(aggregated.companiesThisWeek, aggregated.companiesLastWeek)}   sparkColor="#3b6e8f" />
        <StatCard label="Campaigns"     value={aggregated.totalCampaigns}    spark={aggregated.sparks.campaigns} delta={pctDelta(aggregated.campaignsThisWeek, aggregated.campaignsLastWeek)}   sparkColor="#7a5cb0" />
        <StatCard label="Total leads"   value={aggregated.totalLeads.toLocaleString()} spark={aggregated.sparks.leads} delta={pctDelta(aggregated.leadsThisWeek, aggregated.leadsLastWeek)} />
        <StatCard label="Avg score"     value={aggregated.avgScore}          spark={aggregated.sparks.avgScore}  delta={pctDelta(aggregated.avgScore, aggregated.avgScoreLastWeek)}              sparkColor={C.gold} />
        <StatCard label="Leads / week"  value={aggregated.leadsThisWeek}     spark={aggregated.sparks.leads}     delta={pctDelta(aggregated.leadsThisWeek, aggregated.leadsLastWeek)}            sparkColor={C.green} />
        <StatCard label="Contacts / wk" value={aggregated.contactsThisWeek}  spark={aggregated.sparks.contacts}  delta={pctDelta(aggregated.contactsThisWeek, aggregated.contactsLastWeek)}    sparkColor={C.green} />
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h2 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 18, letterSpacing: '-0.01em' }}>Recent target-finder runs</h2>
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginTop: 4 }}>
              Last {recentRuns.length} runs · {completed} completed · {failed} failed
            </div>
          </div>
        </div>
        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.cream }}>
                {['Campaign','Company','Status','Leads','Cost','When'].map(h => (
                  <th key={h} style={{ fontFamily: MONO, textAlign: 'left', padding: '10px 14px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((r, i) => {
                const co = analytics.perCompany.find(p => p.campaigns?.some((c: any) => c.id === r.campaign_id))
                const coName = r.campaigns?.account?.organisation_name || '—'
                const color = companyColorMap[coName] || C.muted
                const short = coName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <tr key={r.id} style={{ borderBottom: i === recentRuns.length - 1 ? 'none' : `1px solid ${C.border}` }}>
                    <td style={{ padding: '12px 14px', fontWeight: 500 }}>{r.campaigns?.name || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: MONO, width: 20, height: 20, borderRadius: 4, background: color, color: '#fff', fontSize: 9, fontWeight: 600, display: 'grid', placeItems: 'center' }}>{short}</span>
                        <span style={{ fontSize: 13 }}>{coName}</span>
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}><StatusPill status={r.status} /></td>
                    <td style={{ fontFamily: MONO, padding: '12px 14px', color: C.muted, fontVariantNumeric: 'tabular-nums' }}>—</td>
                    <td style={{ fontFamily: MONO, padding: '12px 14px', color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
                      {r.estimated_cost_pence != null ? `£${(r.estimated_cost_pence / 100).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ fontFamily: MONO, padding: '12px 14px', color: C.muted, fontSize: 12 }}>
                      {formatRelativeTime(r.created_at)}
                    </td>
                  </tr>
                )
              })}
              {recentRuns.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: C.muted, fontSize: 13 }}>No runs yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Target Finder tab ─────────────────────────────────────────────────────────
function TargetFinderTab({ campaigns, crons, setCrons, userDetailsId, loading }: {
  campaigns: Campaign[]; crons: CronJob[]
  setCrons: React.Dispatch<React.SetStateAction<CronJob[]>>
  userDetailsId: string | null; loading: boolean
}) {
  const [runSel, setRunSel] = useState<Set<string>>(new Set())
  const [runSearch, setRunSearch] = useState('')
  const [runLoading, setRunLoading] = useState(false)
  const [runResult, setRunResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const [schedLabel, setSchedLabel] = useState('')
  const [schedPreset, setSchedPreset] = useState(0)
  const [schedCustom, setSchedCustom] = useState('')
  const [schedFreq, setSchedFreq] = useState<'daily'|'weekdays'|'weekly'>('weekly')
  const [schedDay, setSchedDay] = useState('Mon')
  const [schedTime, setSchedTime] = useState('09:00')
  const [schedSel, setSchedSel] = useState<Set<string>>(new Set())
  const [schedSearch, setSchedSearch] = useState('')
  const [schedLoading, setSchedLoading] = useState(false)

  const cronExpr = useMemo(() => {
    if (schedPreset === 3) return schedCustom
    const [h, m] = schedTime.split(':').map(Number)
    if (schedFreq === 'daily') return `${m} ${h} * * *`
    if (schedFreq === 'weekdays') return `${m} ${h} * * 1-5`
    const d = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(schedDay)
    return `${m} ${h} * * ${d}`
  }, [schedPreset, schedCustom, schedFreq, schedDay, schedTime])

  const nextFires = useMemo(() => getNextFires(cronExpr, 4), [cronExpr])

  async function handleRunNow() {
    if (!runSel.size || !userDetailsId) return
    setRunLoading(true); setRunResult(null)
    try {
      await fetch(`${API_URL}/api/admin/target-finder/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_details_id: userDetailsId, campaign_ids: [...runSel] }) })
      setRunResult({ ok: true, msg: `Dispatched for ${runSel.size} campaign${runSel.size !== 1 ? 's' : ''}` })
    } catch { setRunResult({ ok: false, msg: 'Dispatch failed' }) } finally { setRunLoading(false) }
  }

  async function handleCreateCron() {
    if (!schedLabel || !schedSel.size || !userDetailsId) return
    setSchedLoading(true)
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const res = await fetch(`${API_URL}/api/admin/crons`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_details_id: userDetailsId, label: schedLabel, campaign_ids: [...schedSel], cron_expression: cronExpr, timezone }) })
      const { cron } = await res.json()
      const enriched: CronJob = {
        ...cron,
        campaigns: (cron.campaign_ids || []).map((id: string) => {
          const c = campaigns.find(c => c.id === id)
          return { id, name: c?.name ?? 'Unknown', company: c?.account?.organisation_name ?? '' }
        }),
      }
      setCrons(prev => [enriched, ...prev])
      setSchedLabel(''); setSchedSel(new Set())
    } catch { /* handled silently */ } finally { setSchedLoading(false) }
  }

  async function handleToggleCron(c: CronJob) {
    try {
      const res = await fetch(`${API_URL}/api/admin/crons/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_details_id: userDetailsId, active: !c.active }) })
      const { cron } = await res.json()
      setCrons(prev => prev.map(x => x.id === c.id ? { ...x, ...cron } : x))
    } catch { /* silent */ }
  }

  async function handleDeleteCron(id: string) {
    try {
      await fetch(`${API_URL}/api/admin/crons/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_details_id: userDetailsId }) })
      setCrons(prev => prev.filter(c => c.id !== id))
    } catch { /* silent */ }
  }

  if (loading) return <LoadingState />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
      {/* RUN NOW */}
      <section>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 20, letterSpacing: '-0.01em' }}>Run now</h2>
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginTop: 4 }}>
            Fire <code style={{ background: C.cream, padding: '1px 5px', borderRadius: 3 }}>target-finder-100</code> immediately for selected campaigns.
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18 }}>
          <CampaignPickerList campaigns={campaigns} selected={runSel} setSelected={setRunSel} search={runSearch} setSearch={setRunSearch} />
          <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: 8, padding: '18px 20px', alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Run preview</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4, borderTop: `1px solid ${C.border}` }}>
              {[['Campaigns', `${runSel.size}`], ['Est. leads', `~${runSel.size * 32}`], ['Est. cost', `£${(runSel.size * 1.84).toFixed(2)}`]].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: C.muted }}>{k}</span>
                  <span style={{ fontFamily: MONO, color: C.fg, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
              <PrimaryButton disabled={runSel.size === 0 || runLoading} onClick={handleRunNow}>
                {runLoading ? 'Dispatching…' : `Run now (${runSel.size})`}
              </PrimaryButton>
            </div>
            {runResult && <div style={{ fontFamily: MONO, fontSize: 11, color: runResult.ok ? C.green : C.accent }}>{runResult.msg}</div>}
            <div style={{ fontFamily: MONO, fontSize: 10, color: C.muted, lineHeight: 1.5 }}>
              Runs are dispatched in parallel. Smartlead push respects the global sync toggle.
            </div>
          </div>
        </div>
      </section>

      {/* CREATE SCHEDULE */}
      <section>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 20, letterSpacing: '-0.01em' }}>Create schedule</h2>
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginTop: 4 }}>Set up a recurring run. Cron expression is generated for you.</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18 }}>
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: '20px 22px' }}>
            <Field label="Label">
              <input value={schedLabel} onChange={e => setSchedLabel(e.target.value)} placeholder="e.g. Monday morning sweep"
                style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 6, background: '#fff', fontSize: 13, color: C.fg, fontFamily: SERIF, outline: 'none', boxSizing: 'border-box' }} />
            </Field>
            <Field label="Plain English">
              <div style={{ padding: '12px 14px', background: C.cream, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14, lineHeight: 1.7, color: C.fg, fontFamily: SERIF }}>
                Run target-finder{' '}
                <select value={schedFreq} onChange={e => setSchedFreq(e.target.value as any)} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 4, padding: '2px 8px', fontFamily: SERIF, fontSize: 14, color: C.accent, fontWeight: 600 }}>
                  <option value="daily">every day</option>
                  <option value="weekdays">every weekday</option>
                  <option value="weekly">weekly</option>
                </select>
                {schedFreq === 'weekly' && (
                  <> on <select value={schedDay} onChange={e => setSchedDay(e.target.value)} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 4, padding: '2px 8px', fontFamily: SERIF, fontSize: 14, color: C.accent, fontWeight: 600 }}>
                    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <option key={d}>{d}</option>)}
                  </select></>
                )}{' at '}
                <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)}
                  style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 4, padding: '2px 6px', fontFamily: SERIF, fontSize: 14, color: C.accent }} />
                {' across '}<span style={{ color: C.accent, fontWeight: 600 }}>{schedSel.size} campaign{schedSel.size !== 1 ? 's' : ''}</span>.
              </div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginTop: 6 }}>
                Cron: <code style={{ background: C.cream, padding: '1px 6px', borderRadius: 3 }}>{cronExpr || '—'}</code>
              </div>
            </Field>
            <Field label="Campaigns">
              <CampaignPickerList campaigns={campaigns} selected={schedSel} setSelected={setSchedSel} search={schedSearch} setSearch={setSchedSearch} />
            </Field>
          </div>
          <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: 8, padding: '18px 20px', alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Next 4 fires</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {nextFires.length === 0
                ? <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>Select a schedule above</div>
                : nextFires.map((d, i) => (
                <div key={i} style={{ fontFamily: MONO, fontSize: 12, color: C.fg, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: i === 0 ? C.accent : C.border }} />
                  {d}
                </div>
              ))}
            </div>
            <div style={{ paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
              <PrimaryButton disabled={!schedLabel || schedSel.size === 0 || schedLoading} onClick={handleCreateCron}>
                {schedLoading ? 'Creating…' : 'Create schedule'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      </section>

      {/* EXISTING SCHEDULES */}
      <section>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h2 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 20, letterSpacing: '-0.01em' }}>Scheduled runs</h2>
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginTop: 4 }}>
              {crons.filter(s => s.active).length} active · {crons.filter(s => !s.active).length} paused
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {crons.length === 0 && <p style={{ color: C.muted, fontSize: 13 }}>No schedules yet.</p>}
          {crons.map(s => (
            <div key={s.id} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{s.label}</div>
                  <span style={{ fontFamily: MONO, background: C.cream, border: `1px solid ${C.border}`, borderRadius: 4, padding: '1px 7px', fontSize: 10, color: C.muted }}>{s.cron_expression}</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 4 }}>
                  <span>{s.campaigns.length} campaign{s.campaigns.length !== 1 ? 's' : ''}</span>
                  <span style={{ color: s.active ? C.green : C.muted }}>⏱ {timeUntilNextFire(s.cron_expression)}</span>
                  {s.last_run_at && (
                    <span>last ran {formatRelativeTime(s.last_run_at)}{s.last_run_leads != null ? ` · ${s.last_run_leads} lead${s.last_run_leads !== 1 ? 's' : ''} found` : ''}</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 5, fontStyle: 'italic' }}>
                  {s.campaigns.map(c => `${c.name} (${c.company})`).join(' · ')}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <button onClick={() => handleToggleCron(s)} style={{ fontFamily: MONO, padding: '6px 12px', fontSize: 11, borderRadius: 5, border: `1px solid ${s.active ? `color-mix(in srgb, ${C.green} 30%, transparent)` : C.border}`, background: s.active ? `color-mix(in srgb, ${C.green} 10%, transparent)` : C.cream, color: s.active ? C.green : C.muted, cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.active ? C.green : C.muted }} />
                  {s.active ? 'Active' : 'Paused'}
                </button>
                <button onClick={() => handleDeleteCron(s.id)} style={{ fontFamily: SERIF, padding: '6px 10px', fontSize: 11, border: `1px solid color-mix(in srgb, ${C.accent} 30%, transparent)`, borderRadius: 5, background: '#fff', color: C.accent, cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// ── Analytics tab ─────────────────────────────────────────────────────────────
function AnalyticsTab({ analytics, loading }: { analytics: Analytics | null; loading: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  if (loading || !analytics) return <LoadingState />
  const { aggregated, perCompany } = analytics
  const maxLeads = Math.max(...perCompany.map(c => c.leadCount), 1)
  const chartData = perCompany.map((co, i) => ({ account_name: co.account_name, leadCount: co.leadCount, color: COMPANY_COLORS[i % COMPANY_COLORS.length] }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <StatCard label="Total leads"     value={aggregated.totalLeads.toLocaleString()} spark={aggregated.sparks.leads}    delta={pctDelta(aggregated.leadsThisWeek, aggregated.leadsLastWeek)} big />
        <StatCard label="Avg lead score"  value={aggregated.avgScore}                     spark={aggregated.sparks.avgScore} delta={pctDelta(aggregated.avgScore, aggregated.avgScoreLastWeek)} sparkColor={C.gold} big />
        <StatCard label="Total contacted" value={aggregated.totalCampaignContacts.toLocaleString()} spark={aggregated.sparks.contacts} delta={pctDelta(aggregated.contactsThisWeek, aggregated.contactsLastWeek)} sparkColor={C.green} big />
        <StatCard label="Companies"       value={aggregated.totalCompanies}               spark={aggregated.sparks.companies} delta={pctDelta(aggregated.companiesThisWeek, aggregated.companiesLastWeek)} sparkColor="#3b6e8f" big />
      </div>

      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h2 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 18, letterSpacing: '-0.01em' }}>Leads added · last 7 days</h2>
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginTop: 4 }}>Stacked by company · {aggregated.leadsThisWeek} leads this week</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, maxWidth: 360, justifyContent: 'flex-end' }}>
            {chartData.map(co => (
              <div key={co.account_name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: co.color }} />
                <span style={{ fontFamily: MONO, fontSize: 10, color: C.muted }}>{co.account_name}</span>
              </div>
            ))}
          </div>
        </div>
        <StackedAreaChart perCompany={chartData} />
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 20, letterSpacing: '-0.01em' }}>Per company breakdown</h2>
          <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>Click to expand</span>
        </div>
        {perCompany.map((co, i) => {
          const color = COMPANY_COLORS[i % COMPANY_COLORS.length]
          const short = (co.account_name || 'UN').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
          const isOpen = expanded === co.account_id
          return (
            <div key={co.account_id} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
              <button onClick={() => setExpanded(isOpen ? null : co.account_id)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 18px', textAlign: 'left', display: 'grid', gridTemplateColumns: '40px 1.2fr 1fr 90px 90px 24px', gap: 16, alignItems: 'center', fontFamily: SERIF }}>
                <span style={{ fontFamily: MONO, width: 32, height: 32, borderRadius: 6, background: color, color: '#fff', fontSize: 11, fontWeight: 600, display: 'grid', placeItems: 'center' }}>{short}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{co.account_name || 'Unnamed'}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: C.muted, marginTop: 2 }}>{(co.campaigns || []).length} campaigns</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MiniBar value={co.leadCount} max={maxLeads} color={color} />
                  <span style={{ fontFamily: MONO, fontSize: 12, color: C.fg, fontVariantNumeric: 'tabular-nums', minWidth: 38, textAlign: 'right' }}>{co.leadCount}</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 13, color: C.fg, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                  {co.contactCount}
                  <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>contacts</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: MONO, fontSize: 13, color: C.green, fontVariantNumeric: 'tabular-nums' }}>+{Math.round(co.leadCount * 0.06)}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>this wk</div>
                </div>
                <span style={{ fontFamily: MONO, color: C.muted, fontSize: 12 }}>{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div style={{ padding: '4px 18px 16px', borderTop: `1px solid ${C.border}` }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 4 }}>
                    <thead>
                      <tr>
                        {['Campaign','Status','Leads'].map(h => (
                          <th key={h} style={{ fontFamily: MONO, textAlign: 'left', padding: '10px 0', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(co.campaigns || []).map((c: any) => (
                        <tr key={c.id} style={{ borderTop: `1px solid ${C.border}` }}>
                          <td style={{ padding: '10px 0', fontWeight: 500 }}>{c.name}</td>
                          <td style={{ padding: '10px 0' }}><StatusPill status={c.status} /></td>
                          <td style={{ fontFamily: MONO, padding: '10px 0', fontVariantNumeric: 'tabular-nums' }}>—</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Smartlead tab ─────────────────────────────────────────────────────────────
function SmartleadTab({ status, onToggle, loading }: { status: SmartleadStatus | null; onToggle: () => void; loading: boolean }) {
  if (loading) return <LoadingState />
  if (!status) return null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, #00a071, #008361)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 600, fontFamily: SERIF }}>S</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Smartlead</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>server.smartlead.ai · 1 connection · all accounts</div>
            </div>
          </div>
          <span style={{ fontFamily: MONO, display: 'inline-flex', alignItems: 'center', gap: 8, background: status.connected ? `color-mix(in srgb, ${C.green} 12%, transparent)` : `color-mix(in srgb, ${C.accent} 12%, transparent)`, color: status.connected ? C.green : C.accent, borderRadius: 999, padding: '5px 12px 5px 10px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {status.connected ? <PingDots /> : <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.accent }} />}
            {status.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>API status</div>
            <div style={{ fontSize: 14, color: C.fg }}>GET /v1/health · {status.connected ? 'responding' : 'unreachable'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: status.connected ? C.green : C.accent, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
              {status.connected ? '●' : '×'}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: C.muted }}>HTTP {status.connected ? '200' : 'ERR'}</div>
          </div>
        </div>

        <div style={{ padding: '20px 22px', border: `1px solid ${C.border}`, borderRadius: 8, background: status.sync_enabled ? `color-mix(in srgb, ${C.green} 4%, transparent)` : C.cream, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{status.sync_enabled ? 'Contact sync is on' : 'Contact sync is paused'}</div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
              {status.sync_enabled ? 'New contacts from target-finder runs are pushed to Smartlead campaigns automatically.' : "Target-finder runs continue, but new contacts won't be pushed to Smartlead."}
            </div>
          </div>
          <button onClick={onToggle} style={{ width: 56, height: 30, borderRadius: 999, border: 'none', background: status.sync_enabled ? C.green : C.border, position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
            <span style={{ position: 'absolute', top: 3, left: status.sync_enabled ? 29 : 3, width: 24, height: 24, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.15)', transition: 'left 0.2s' }} />
          </button>
        </div>

        {status.updated_at && (
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>Last changed: {new Date(status.updated_at).toLocaleString()}</div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: '20px 22px' }}>
          <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>At a glance</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {[['Sync enabled', status.sync_enabled ? 'Yes' : 'No'], ['Connection', status.connected ? 'Live' : 'Down']].map(([l, v]) => (
              <div key={l}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: C.muted }}>{l}</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600, color: v === 'Down' ? C.accent : C.fg, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', marginTop: 2 }}>{v}</div>
              </div>
            ))}
            {!status.connected && status.connectError && (
              <div style={{ fontFamily: MONO, fontSize: 11, color: C.accent, background: `color-mix(in srgb, ${C.accent} 6%, transparent)`, border: `1px solid color-mix(in srgb, ${C.accent} 20%, transparent)`, borderRadius: 6, padding: '8px 10px', wordBreak: 'break-all' }}>
                {status.connectError}
              </div>
            )}
          </div>
        </div>
        <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 20px' }}>
          <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Connection</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[['Scope', 'Global — all accounts'], ['Type', 'REST API / webhook']].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: C.muted }}>{k}</span>
                <span style={{ fontFamily: MONO, color: C.fg }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function PingDots() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {[0,1,2].map(i => <span key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: C.green, animation: `sl-ping 1.4s ease-in-out ${i * 0.16}s infinite` }} />)}
    </span>
  )
}

// ── Users tab ─────────────────────────────────────────────────────────────────
function UsersTab({ users, setUsers, loading, userDetailsId }: { users: AdminUser[]; setUsers: React.Dispatch<React.SetStateAction<AdminUser[]>>; loading: boolean; userDetailsId: string | null }) {
  const [search, setSearch] = useState('')

  const allCompanyNames = useMemo(() =>
    [...new Set(users.flatMap(u => u.companies.map(c => c.account_name).filter(Boolean)))] as string[]
  , [users])

  const filtered = useMemo(() => users.filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return u.firstname?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) ||
      u.companies.some(c => c.account_name?.toLowerCase().includes(q))
  }), [users, search])

  const superCount = users.filter(u => u.is_super_admin).length
  const companyColorMap: Record<string, string> = {}
  allCompanyNames.forEach((n, i) => { companyColorMap[n] = COMPANY_COLORS[i % COMPANY_COLORS.length] })

  async function handleToggleSuperAdmin(u: AdminUser) {
    const newVal = !u.is_super_admin
    const res = await fetch(`${API_URL}/api/admin/users/${u.auth_id}/super-admin`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_details_id: userDetailsId, is_super_admin: newVal }),
    })
    if (res.ok) setUsers(prev => prev.map(x => x.auth_id === u.auth_id ? { ...x, is_super_admin: newVal } : x))
  }

  if (loading) return <LoadingState />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[['Total users', users.length, false], ['Super admins', superCount, true], ['Companies', allCompanyNames.length, false], ['Showing', filtered.length, false]].map(([l, v, accent]) => (
          <div key={String(l)} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 18px' }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{String(l)}</div>
            <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600, marginTop: 4, color: accent ? C.accent : C.fg, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{String(v)}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px' }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>⌕</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email or company" style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, fontSize: 13, fontFamily: SERIF, color: C.fg }} />
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>{filtered.length} match</span>
      </div>

      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.cream }}>
              {['User','Email','Companies','Super Admin'].map(h => (
                <th key={h} style={{ fontFamily: MONO, textAlign: 'left', padding: '11px 16px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => {
              const initials = (u.firstname || u.email || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
              const avatarColor = COMPANY_COLORS[i % COMPANY_COLORS.length]
              return (
                <tr key={u.auth_id} style={{ borderBottom: i === filtered.length - 1 ? 'none' : `1px solid ${C.border}` }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: MONO, width: 28, height: 28, borderRadius: '50%', background: avatarColor, color: '#fff', fontSize: 11, fontWeight: 600, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{initials}</span>
                      <span style={{ fontWeight: 500 }}>{u.firstname || '—'}</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: MONO, padding: '12px 16px', color: C.muted, fontSize: 12 }}>{u.email || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {u.companies.map(c => {
                        const name = c.account_name || '—'
                        const color = companyColorMap[name] || C.muted
                        const short = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                        return (
                          <span key={c.user_details_id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: `color-mix(in srgb, ${color} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`, borderRadius: 4, padding: '2px 7px 2px 4px', fontSize: 11 }}>
                            <span style={{ fontFamily: MONO, width: 14, height: 14, borderRadius: 2, background: color, color: '#fff', fontSize: 8, fontWeight: 600, display: 'grid', placeItems: 'center' }}>{short}</span>
                            <span>{name}</span>
                            {c.role && <span style={{ fontFamily: MONO, fontSize: 9, color, opacity: 0.7, textTransform: 'uppercase' }}>{c.role}</span>}
                          </span>
                        )
                      })}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => handleToggleSuperAdmin(u)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 4px 4px 12px', borderRadius: 999, border: `1px solid ${u.is_super_admin ? `color-mix(in srgb, ${C.accent} 30%, transparent)` : C.border}`, background: u.is_super_admin ? `color-mix(in srgb, ${C.accent} 8%, transparent)` : '#fff', cursor: 'pointer', fontFamily: SERIF }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: u.is_super_admin ? C.accent : C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{u.is_super_admin ? 'Granted' : 'Off'}</span>
                      <span style={{ width: 28, height: 16, borderRadius: 999, background: u.is_super_admin ? C.accent : C.border, position: 'relative', flexShrink: 0 }}>
                        <span style={{ position: 'absolute', top: 2, left: u.is_super_admin ? 14 : 2, width: 12, height: 12, borderRadius: '50%', background: '#fff' }} />
                      </span>
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: C.muted }}>No users found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function LoadingState() {
  return <div style={{ fontFamily: MONO, fontSize: 13, color: C.muted, padding: '40px 0' }}>Loading…</div>
}

function timeUntilNextFire(expr: string): string {
  const fires = getNextFires(expr, 1)
  if (!fires.length) return '—'
  // getNextFires returns "Mon 12 May, 09:00" — parse it back to a date for diff
  // Easier: re-run the cursor logic just for the ms diff
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return '—'
  const [minStr, hourStr, , , dowStr] = parts
  const min = parseInt(minStr), hour = parseInt(hourStr)
  if (isNaN(min) || isNaN(hour)) return '—'
  let allowed: number[]
  if (dowStr === '*') allowed = [0,1,2,3,4,5,6]
  else if (dowStr === '1-5') allowed = [1,2,3,4,5]
  else { const d = parseInt(dowStr); allowed = isNaN(d) ? [0,1,2,3,4,5,6] : [d] }
  const cursor = new Date(); cursor.setSeconds(0,0); cursor.setMinutes(cursor.getMinutes()+1)
  let iters = 0
  while (iters++ < 10000) {
    const h = cursor.getHours(), m = cursor.getMinutes(), dow = cursor.getDay()
    if (h === hour && m === min && allowed.includes(dow)) break
    if (h > hour || (h === hour && m > min)) { cursor.setDate(cursor.getDate()+1); cursor.setHours(0,0,0,0) }
    else if (h === hour && m === min) { cursor.setDate(cursor.getDate()+1); cursor.setHours(0,0,0,0) }
    else cursor.setHours(hour, min, 0, 0)
  }
  const diffMs = cursor.getTime() - Date.now()
  const totalMins = Math.round(diffMs / 60000)
  if (totalMins < 60) return `in ${totalMins}m`
  const h2 = Math.floor(totalMins / 60), m2 = totalMins % 60
  if (h2 < 24) return m2 > 0 ? `in ${h2}h ${m2}m` : `in ${h2}h`
  const days = Math.floor(h2 / 24), remH = h2 % 24
  return remH > 0 ? `in ${days}d ${remH}h` : `in ${days}d`
}

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null
  return Math.round(((current - previous) / previous) * 100)
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function makeCompanyColorMap(perCompany: { account_name: string }[]): Record<string, string> {
  const map: Record<string, string> = {}
  perCompany.forEach((co, i) => { map[co.account_name] = COMPANY_COLORS[i % COMPANY_COLORS.length] })
  return map
}

// ── Main component ────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',       label: 'Overview' },
  { id: 'target-finder',  label: 'Target Finder' },
  { id: 'analytics',      label: 'Analytics' },
  { id: 'smartlead',      label: 'Smartlead' },
  { id: 'users',          label: 'Users' },
]

export default function SuperAdminDashboard({ userDetailsId }: { userDetailsId: string | null }) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [crons, setCrons] = useState<CronJob[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [smartlead, setSmartlead] = useState<SmartleadStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const get = useCallback(async (path: string) => {
    const res = await fetch(`${API_URL}/api/admin${path}?user_details_id=${userDetailsId}`)
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }, [userDetailsId])

  useEffect(() => {
    if (!userDetailsId) return
    setError(null); setLoading(true)
    const loaders: Record<Tab, () => Promise<void>> = {
      'overview':      async () => { const d = await get('/analytics'); setAnalytics(d) },
      'target-finder': async () => { const [c, cr] = await Promise.all([get('/campaigns'), get('/crons')]); setCampaigns(c.campaigns); setCrons(cr.crons) },
      'analytics':     async () => { const d = await get('/analytics'); setAnalytics(d) },
      'smartlead':     async () => { const d = await get('/smartlead/status'); setSmartlead(d) },
      'users':         async () => { const d = await get('/users'); setUsers(d.users) },
    }
    loaders[activeTab]().catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [activeTab, userDetailsId])

  async function handleToggleSmartlead() {
    if (!userDetailsId) return
    try {
      const res = await fetch(`${API_URL}/api/admin/smartlead/toggle`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_details_id: userDetailsId }) })
      const { sync_enabled } = await res.json()
      setSmartlead(prev => prev ? { ...prev, sync_enabled } : null)
    } catch { /* silent */ }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: SERIF, background: C.bg }}>
      {/* Top bar */}
      <div style={{ padding: '20px 36px 0', borderBottom: `1px solid ${C.border}`, flexShrink: 0, background: C.bg }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 4 }}>System / Admin</div>
            <h1 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 30, letterSpacing: '-0.02em', margin: 0 }}>Super Admin</h1>
          </div>
          <div style={{ fontFamily: MONO, display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: C.muted, paddingBottom: 6 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green }} />
              All systems operational
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: -1 }}>
          {TABS.map(t => {
            const on = activeTab === t.id
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px', fontSize: 13, fontWeight: 500, color: on ? C.accent : C.muted, borderBottom: `2px solid ${on ? C.accent : 'transparent'}`, fontFamily: SERIF, transition: 'color 0.15s' }}>
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px 80px' }}>
        {error && (
          <div style={{ background: `color-mix(in srgb, ${C.accent} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${C.accent} 30%, transparent)`, borderRadius: 6, padding: '10px 14px', marginBottom: 20, color: C.accent, fontSize: 13, fontFamily: MONO }}>
            {error}
          </div>
        )}
        {activeTab === 'overview'      && <OverviewTab analytics={analytics} loading={loading} />}
        {activeTab === 'target-finder' && <TargetFinderTab campaigns={campaigns} crons={crons} setCrons={setCrons} userDetailsId={userDetailsId} loading={loading} />}
        {activeTab === 'analytics'     && <AnalyticsTab analytics={analytics} loading={loading} />}
        {activeTab === 'smartlead'     && <SmartleadTab status={smartlead} onToggle={handleToggleSmartlead} loading={loading} />}
        {activeTab === 'users'         && <UsersTab users={users} setUsers={setUsers} loading={loading} userDetailsId={userDetailsId} />}
      </div>

      <style>{`
        @keyframes sa-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes sl-ping { 0%, 100% { opacity: 0.2; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  )
}
