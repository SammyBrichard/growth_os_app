import React, { useState, useEffect } from 'react'
import logoImg from '../assets/hero.png'

const API_URL = import.meta.env.VITE_API_URL

type PageState =
  | { type: 'loading' }
  | { type: 'invalid'; message: string }
  | { type: 'form'; accountName: string | null }
  | { type: 'submitting'; accountName: string | null }

export default function InviteSignup({ token }: { token: string }) {
  const [state, setState] = useState<PageState>({ type: 'loading' })
  const [firstname, setFirstname] = useState('')
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/api/user/invite/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          localStorage.removeItem('pending_invite_token')
          setState({ type: 'invalid', message: data.error })
        } else {
          setState({ type: 'form', accountName: data.account_name })
        }
      })
      .catch(() => {
        localStorage.removeItem('pending_invite_token')
        setState({ type: 'invalid', message: 'Something went wrong. Please try again.' })
      })
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldError(null)
    const accountName = state.type === 'form' ? state.accountName : null
    setState({ type: 'submitting', accountName })

    try {
      const res = await fetch(`${API_URL}/api/user/invite/create-auth-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, firstname: firstname.trim(), email: email.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setState({ type: 'form', accountName })
        setFieldError(
          data.error === 'user_exists'
            ? "An account with this email already exists. Open your invite link from a browser where you're already logged in to GrowthOS."
            : data.error ?? 'Something went wrong. Please try again.',
        )
        return
      }

      window.location.href = data.login_url
    } catch {
      setState({ type: 'form', accountName })
      setFieldError('Something went wrong. Please try again.')
    }
  }

  const Logo = () => (
    <div className="auth-logo">
      <img src={logoImg} alt="GrowthOS" className="auth-logo-img" />
      <span className="auth-logo-name">GrowthOS</span>
    </div>
  )

  if (state.type === 'loading') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <Logo />
          <div className="auth-divider" />
          <span className="auth-loading">Loading invite...</span>
        </div>
      </div>
    )
  }

  if (state.type === 'invalid') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <Logo />
          <div className="auth-divider" />
          <h2 className="auth-title">This invite isn't valid.</h2>
          <p className="auth-body">
            {state.message} Ask the person who invited you to generate a new link.
          </p>
          <button className="auth-btn-ghost" onClick={() => window.location.reload()}>
            ← Back to login
          </button>
        </div>
      </div>
    )
  }

  const accountName =
    state.type === 'form' || state.type === 'submitting' ? state.accountName : null

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Logo />
        <div className="auth-divider" />
        <h2 className="auth-title">
          {accountName
            ? `You've been invited to join ${accountName}.`
            : "You've been invited to join a GrowthOS workspace."}
        </h2>
        <p className="auth-body">Create your account to get started.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label">First name</label>
            <input
              className="auth-input"
              type="text"
              value={firstname}
              onChange={e => setFirstname(e.target.value)}
              placeholder="Your first name"
              autoFocus
              disabled={state.type === 'submitting'}
            />
          </div>
          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={state.type === 'submitting'}
            />
          </div>
          {fieldError && <div className="auth-error">{fieldError}</div>}
          <button
            className="auth-btn"
            type="submit"
            disabled={state.type === 'submitting' || !email.trim()}
          >
            {state.type === 'submitting' ? 'Creating account...' : 'Get access link →'}
          </button>
        </form>
      </div>
    </div>
  )
}
