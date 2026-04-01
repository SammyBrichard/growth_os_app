import React, { useState, useEffect } from 'react'
const API_URL = import.meta.env.VITE_API_URL

type PageState =
  | { type: 'loading' }
  | { type: 'invalid'; message: string }
  | { type: 'form'; accountName: string | null }
  | { type: 'submitting'; accountName: string | null }
  | { type: 'user_exists'; email: string; accountName: string | null }
  | { type: 'logging_in'; email: string; accountName: string | null }
  | { type: 'login'; accountName: string | null }
  | { type: 'login_submitting'; accountName: string | null }

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
        if (data.error === 'user_exists') {
          setState({ type: 'user_exists', email: email.trim(), accountName })
          return
        }
        setState({ type: 'form', accountName })
        setFieldError(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      window.location.href = data.login_url
    } catch {
      setState({ type: 'form', accountName })
      setFieldError('Something went wrong. Please try again.')
    }
  }

  async function handleDirectLogin(e: React.FormEvent) {
    e.preventDefault()
    if (state.type !== 'login') return
    const accountName = state.accountName
    setState({ type: 'login_submitting', accountName })
    setFieldError(null)

    try {
      const res = await fetch(`${API_URL}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setState({ type: 'login', accountName })
        setFieldError(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      window.location.href = data.login_url
    } catch {
      setState({ type: 'login', accountName })
      setFieldError('Something went wrong. Please try again.')
    }
  }

  async function handleLoginToAccept() {
    if (state.type !== 'user_exists') return
    const { email: existingEmail, accountName } = state
    setState({ type: 'logging_in', email: existingEmail, accountName })

    try {
      const res = await fetch(`${API_URL}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: existingEmail }),
      })
      const data = await res.json()

      if (!res.ok) {
        setState({ type: 'user_exists', email: existingEmail, accountName })
        setFieldError(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      window.location.href = data.login_url
    } catch {
      setState({ type: 'user_exists', email: state.type === 'user_exists' ? state.email : existingEmail, accountName })
      setFieldError('Something went wrong. Please try again.')
    }
  }

  const Logo = () => (
    <div className="auth-wordmark">growth<span className="accent">OS</span></div>
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

  if (state.type === 'login' || state.type === 'login_submitting') {
    const company = state.accountName ?? 'this workspace'
    const isSubmitting = state.type === 'login_submitting'
    return (
      <div className="auth-page">
        <div className="auth-card">
          <Logo />
          <div className="auth-divider" />
          <h2 className="auth-title">Log in to accept your invite.</h2>
          <p className="auth-body">Enter your email and we'll send you a sign-in link for {company}.</p>
          <form className="auth-form" onSubmit={handleDirectLogin}>
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
                disabled={isSubmitting}
              />
            </div>
            {fieldError && <div className="auth-error">{fieldError}</div>}
            <button className="auth-btn" type="submit" disabled={isSubmitting || !email.trim()}>
              {isSubmitting ? 'Logging in...' : 'Log in →'}
            </button>
            <button
              className="auth-btn-ghost"
              type="button"
              onClick={() => { setFieldError(null); setState({ type: 'form', accountName: state.accountName }) }}
              disabled={isSubmitting}
            >
              ← Create a new account instead
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (state.type === 'user_exists' || state.type === 'logging_in') {
    const company = state.accountName ?? 'this workspace'
    const isLoggingIn = state.type === 'logging_in'
    return (
      <div className="auth-page">
        <div className="auth-card">
          <Logo />
          <div className="auth-divider" />
          <h2 className="auth-title">You already have an account.</h2>
          <p className="auth-body">
            Log in to accept your invite to {company}. We'll send a sign-in link to{' '}
            <strong>{state.email}</strong>.
          </p>
          {fieldError && <div className="auth-error">{fieldError}</div>}
          <button className="auth-btn" onClick={handleLoginToAccept} disabled={isLoggingIn}>
            {isLoggingIn ? 'Logging in...' : 'Log in to accept →'}
          </button>
          <button
            className="auth-btn-ghost"
            onClick={() => { setFieldError(null); setState({ type: 'form', accountName: state.accountName }) }}
            disabled={isLoggingIn}
          >
            ← Use a different email
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
          <button
            className="auth-btn-ghost"
            type="button"
            onClick={() => { setFieldError(null); setEmail(''); setState({ type: 'login', accountName }) }}
            disabled={state.type === 'submitting'}
          >
            Already have an account? Log in →
          </button>
        </form>
      </div>
    </div>
  )
}
