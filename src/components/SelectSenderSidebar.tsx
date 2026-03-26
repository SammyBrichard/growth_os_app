import React, { useState, useEffect } from 'react'
import supabase from '../services/supabase'

interface Sender {
  id: string
  email: string
  display_name: string | null
  smtp_host: string | null
  verified: boolean
}

interface SelectSenderSidebarProps {
  accountId: string | null
  onSelect: (senderId: string) => void
}

// Auto-detect SMTP/IMAP settings for common providers
function detectProviderSettings(email: string) {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return null

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return { smtp_host: 'smtp.gmail.com', smtp_port: 587, imap_host: 'imap.gmail.com', imap_port: 993 }
  }
  if (domain === 'outlook.com' || domain === 'hotmail.com' || domain === 'live.com') {
    return { smtp_host: 'smtp.office365.com', smtp_port: 587, imap_host: 'outlook.office365.com', imap_port: 993 }
  }
  if (domain === 'yahoo.com' || domain === 'yahoo.co.uk') {
    return { smtp_host: 'smtp.mail.yahoo.com', smtp_port: 587, imap_host: 'imap.mail.yahoo.com', imap_port: 993 }
  }
  return null
}

const SelectSenderSidebar: React.FC<SelectSenderSidebarProps> = ({
  accountId,
  onSelect,
}) => {
  const [senders, setSenders] = useState<Sender[]>([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('587')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [imapHost, setImapHost] = useState('')
  const [imapPort, setImapPort] = useState('993')
  const [autoDetected, setAutoDetected] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!accountId) return
    ;(async () => {
      const { data } = await supabase
        .from('senders')
        .select('*')
        .eq('account_id', accountId)
      setSenders(data ?? [])
      setLoading(false)
    })()
  }, [accountId])

  // Auto-detect when email changes
  useEffect(() => {
    const detected = detectProviderSettings(newEmail)
    if (detected) {
      setSmtpHost(detected.smtp_host)
      setSmtpPort(String(detected.smtp_port))
      setImapHost(detected.imap_host)
      setImapPort(String(detected.imap_port))
      setAutoDetected(true)
    } else {
      if (autoDetected) {
        setSmtpHost('')
        setSmtpPort('587')
        setImapHost('')
        setImapPort('993')
      }
      setAutoDetected(false)
    }
  }, [newEmail])

  async function handleCreateSender() {
    if (!newEmail.trim() || !smtpHost.trim() || !smtpPassword.trim() || !accountId) return
    setCreating(true)
    const { data } = await supabase
      .from('senders')
      .insert({
        account_id: accountId,
        email: newEmail.trim().toLowerCase(),
        display_name: newDisplayName.trim() || null,
        smtp_host: smtpHost.trim(),
        smtp_port: parseInt(smtpPort) || 587,
        smtp_username: newEmail.trim().toLowerCase(),
        smtp_password: smtpPassword.trim(),
        imap_host: imapHost.trim() || null,
        imap_port: parseInt(imapPort) || 993,
        provider: 'smartlead',
        verified: false,
      })
      .select('id')
      .single()
    setCreating(false)
    if (data) onSelect(data.id)
  }

  if (loading) {
    return <div className="sender-empty">Loading senders...</div>
  }

  return (
    <div>
      {senders.length > 0 && (
        <>
          <div className="sender-section-heading">Existing Senders</div>
          {senders.map(sender => (
            <div
              key={sender.id}
              className="sender-card"
              onClick={() => onSelect(sender.id)}
            >
              <div className="sender-card-email">{sender.email}</div>
              {sender.display_name && (
                <div className="sender-card-name">{sender.display_name}</div>
              )}
            </div>
          ))}
          <hr className="sender-divider" />
        </>
      )}

      <div className="sender-section-heading">
        {senders.length > 0 ? 'Or Create New Sender' : 'Set Up Your Sender'}
      </div>
      <div className="sender-create-form">
        <input
          className="sender-create-input"
          type="email"
          placeholder="your@email.com"
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
        />
        <input
          className="sender-create-input"
          type="text"
          placeholder="Display name (e.g. John from Acme)"
          value={newDisplayName}
          onChange={e => setNewDisplayName(e.target.value)}
        />

        {autoDetected && (
          <div style={{ fontSize: '12px', color: '#4a8c5c', margin: '-4px 0 4px' }}>
            Settings auto-detected for {newEmail.split('@')[1]}
          </div>
        )}

        <input
          className="sender-create-input"
          type="text"
          placeholder="SMTP Host (e.g. smtp.gmail.com)"
          value={smtpHost}
          onChange={e => setSmtpHost(e.target.value)}
        />
        <input
          className="sender-create-input"
          type="text"
          placeholder="SMTP Port (default: 587)"
          value={smtpPort}
          onChange={e => setSmtpPort(e.target.value)}
        />
        <input
          className="sender-create-input"
          type="password"
          placeholder="App password (not your regular password)"
          value={smtpPassword}
          onChange={e => setSmtpPassword(e.target.value)}
        />
        <input
          className="sender-create-input"
          type="text"
          placeholder="IMAP Host (e.g. imap.gmail.com)"
          value={imapHost}
          onChange={e => setImapHost(e.target.value)}
        />

        <button
          className="sender-create-btn"
          onClick={handleCreateSender}
          disabled={!newEmail.trim() || !smtpHost.trim() || !smtpPassword.trim() || creating}
        >
          {creating ? 'Creating...' : 'Create Sender'}
        </button>
      </div>
    </div>
  )
}

export default SelectSenderSidebar
