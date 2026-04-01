import React, { useState, useRef, useEffect } from 'react'
import type { CompanyRecord } from '../hooks/useUserDetails'

interface CompanySwitcherProps {
  companies: CompanyRecord[]
  activeId: string | null
  onSwitch: (id: string) => void
  onAddCompany: () => void
}

const CompanySwitcher: React.FC<CompanySwitcherProps> = ({ companies, activeId, onSwitch, onAddCompany }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const active = companies.find(c => c.id === activeId)
  const activeLabel = active?.account_name || active?.website || 'New Company'

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="company-switcher" ref={ref}>
      <button className="company-switcher-btn" onClick={() => setOpen(o => !o)}>
        <span className="company-switcher-name">{activeLabel}</span>
        <span className="company-switcher-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="company-switcher-dropdown">
          {companies.map(c => (
            <button
              key={c.id}
              className={`company-switcher-item${c.id === activeId ? ' active' : ''}`}
              onClick={() => { onSwitch(c.id); setOpen(false) }}
            >
              {c.account_name || c.website || 'New Company'}
            </button>
          ))}
          <div className="company-switcher-divider" />
          <button className="company-switcher-item company-switcher-add" onClick={() => { onAddCompany(); setOpen(false) }}>
            + Add company
          </button>
        </div>
      )}
    </div>
  )
}

export default CompanySwitcher
