import React, { useState, useEffect } from 'react'
import supabase from '../services/supabase'

interface Sender {
  id: string
  email: string
  display_name: string | null
  verified: boolean
}

interface SelectSenderSidebarProps {
  accountId: string | null
  onSelect: (senderId: string) => void
}

const SelectSenderSidebar: React.FC<SelectSenderSidebarProps> = ({
  accountId,
  onSelect,
}) => {
  const [senders, setSenders] = useState<Sender[]>([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
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

  async function handleCreateSender() {
    if (!newEmail.trim() || !accountId) return
    setCreating(true)
    const { data } = await supabase
      .from('senders')
      .insert({
        account_id: accountId,
        email: newEmail.trim().toLowerCase(),
        display_name: newDisplayName.trim() || null,
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
      <div className="sender-section-heading">Existing Senders</div>
      {senders.length === 0 ? (
        <div className="sender-empty">No senders yet</div>
      ) : (
        senders.map(sender => (
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
        ))
      )}

      <hr className="sender-divider" />

      <div className="sender-section-heading">Create New Sender</div>
      <div className="sender-create-form">
        <input
          className="sender-create-input"
          type="email"
          placeholder="sender@example.com"
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
        />
        <input
          className="sender-create-input"
          type="text"
          placeholder="Display name (optional)"
          value={newDisplayName}
          onChange={e => setNewDisplayName(e.target.value)}
        />
        <button
          className="sender-create-btn"
          onClick={handleCreateSender}
          disabled={!newEmail.trim() || creating}
        >
          {creating ? 'Creating...' : 'Create'}
        </button>
      </div>
    </div>
  )
}

export default SelectSenderSidebar
