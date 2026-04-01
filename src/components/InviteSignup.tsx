import React, { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL

type PageState =
  | { type: 'loading' }
  | { type: 'invalid'; message: string }
  | { type: 'form'; accountName: string | null }
  | { type: 'submitting'; accountName: string | null }
  | { type: 'success'; loginUrl: string; accountName: string | null }

export default function InviteSignup({ token }: { token: string }) {
  const [state, setState] = useState<PageState>({ type: 'loading' })
  const [firstname, setFirstname] = useState('')
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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
            ? 'An account with this email already exists. Open your invite link from a browser where you\'re already logged in to GrowthOS.'
            : data.error ?? 'Something went wrong. Please try again.',
        )
        return
      }

      setState({ type: 'success', loginUrl: data.login_url, accountName })
    } catch {
      setState({ type: 'form', accountName })
      setFieldError('Something went wrong. Please try again.')
    }
  }

  async function handleCopy(url: string) {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (state.type === 'loading') {
    return (
      <div className="invite-page">
        <div className="invite-card">
          <div className="invite-wordmark">GrowthOS</div>
          <div className="invite-loading">Loading invite...</div>
        </div>
      </div>
    )
  }

  if (state.type === 'invalid') {
    return (
      <div className="invite-page">
        <div className="invite-card">
          <div className="invite-wordmark">GrowthOS</div>
          <h2 className="invite-title">This invite isn't valid.</h2>
          <p className="invite-body">{state.message}</p>
          <p className="invite-body">Ask the person who invited you to generate a new link.</p>
          <button className="invite-submit-btn" onClick={() => window.location.reload()}>
            Back to login
          </button>
        </div>
      </div>
    )
  }

  const accountName =
    state.type === 'form' || state.type === 'submitting' || state.type === 'success'
      ? state.accountName
      : null

  if (state.type === 'success') {
    return (
      <div className="invite-page">
        <div className="invite-card">
          <div className="invite-wordmark">GrowthOS</div>
          <h2 className="invite-title">You're in.</h2>
          <p className="invite-body">
            Click the link below to enter {accountName ?? 'GrowthOS'}. You can also copy it and open it in any browser on this device.
          </p>
          <a href={(state as any).loginUrl} className="invite-login-link">
            Enter GrowthOS →
          </a>
          <div className="invite-link-row">
            <span className="invite-link-text">{(state as any).loginUrl}</span>
            <button className="invite-copy-btn" onClick={() => handleCopy((state as any).loginUrl)}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="invite-page">
      <div className="invite-card">
        <div className="invite-wordmark">GrowthOS</div>
        <h2 className="invite-title">
          {accountName ? `You've been invited to join ${accountName}.` : "You've been invited to join a GrowthOS workspace."}
        </h2>
        <p className="invite-body">Create your account to get started.</p>
        <form className="invite-form" onSubmit={handleSubmit}>
          <div className="invite-field">
            <label className="invite-label">First name</label>
            <input
              className="invite-input"
              type="text"
              value={firstname}
              onChange={e => setFirstname(e.target.value)}
              placeholder="Your first name"
              autoFocus
              disabled={state.type === 'submitting'}
            />
          </div>
          <div className="invite-field">
            <label className="invite-label">Email</label>
            <input
              className="invite-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={state.type === 'submitting'}
            />
          </div>
          {fieldError && <div className="invite-field-error">{fieldError}</div>}
          <button
            className="invite-submit-btn"
            type="submit"
            disabled={state.type === 'submitting' || !email.trim()}
          >
            {state.type === 'submitting' ? 'Creating account...' : 'Get access link'}
          </button>
        </form>
      </div>
    </div>
  )
}
