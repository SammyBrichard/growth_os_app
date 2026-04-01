import React, { useState } from 'react'
import supabase from '../services/supabase'

type PageState = 'idle' | 'submitting' | 'sent'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<PageState>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setState('submitting')
    setError(null)

    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: window.location.origin },
    })

    if (err) {
      setError(err.message)
      setState('idle')
      return
    }

    setState('sent')
  }

  if (state === 'sent') {
    return (
      <div className="invite-page">
        <div className="invite-card">
          <div className="invite-wordmark">GrowthOS</div>
          <h2 className="invite-title">Check your email.</h2>
          <p className="invite-body">
            We've sent a login link to <strong>{email}</strong>. Click it to sign in.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="invite-page">
      <div className="invite-card">
        <div className="invite-wordmark">GrowthOS</div>
        <h2 className="invite-title">Sign in.</h2>
        <form className="invite-form" onSubmit={handleSubmit}>
          <div className="invite-field">
            <label className="invite-label">Email</label>
            <input
              className="invite-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoFocus
              disabled={state === 'submitting'}
            />
          </div>
          {error && <div className="invite-field-error">{error}</div>}
          <button
            className="invite-submit-btn"
            type="submit"
            disabled={state === 'submitting' || !email.trim()}
          >
            {state === 'submitting' ? 'Sending...' : 'Send login link'}
          </button>
        </form>
      </div>
    </div>
  )
}
