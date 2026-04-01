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

      window.location.href = data.login_url
    } catch {
      setError('Something went wrong. Please try again.')
      setState('idle')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-wordmark auth-wordmark--lg">growth<span className="accent">OS</span></div>
        <div className="auth-divider" />
        <h2 className="auth-title">Welcome back.</h2>
        <p className="auth-body">Enter your email to sign in to your workspace.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoFocus
              disabled={state === 'submitting'}
            />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button
            className="auth-btn"
            type="submit"
            disabled={state === 'submitting' || !email.trim()}
          >
            {state === 'submitting' ? 'Signing in...' : 'Sign in →'}
          </button>
        </form>
      </div>
    </div>
  )
}
