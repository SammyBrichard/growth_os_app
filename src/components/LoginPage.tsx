import React, { useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL

type PageState = 'idle' | 'submitting'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<PageState>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setState('submitting')
    setError(null)

    try {
      const res = await fetch(`${API_URL}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
        setState('idle')
        return
      }

      // Redirect straight to the magic link — user is logged in immediately
      window.location.href = data.login_url
    } catch {
      setError('Something went wrong. Please try again.')
      setState('idle')
    }
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
            {state === 'submitting' ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
