interface InviteLandingProps {
  companyName: string | null
  inviterName: string | null
  onEnter: () => void
}

export default function InviteLanding({ companyName, inviterName, onEnter }: InviteLandingProps) {
  const company = companyName ?? 'a GrowthOS workspace'

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-wordmark">growth<span className="accent">OS</span></div>
        <div className="auth-divider" />
        <h2 className="auth-title">
          {inviterName
            ? `${inviterName} has invited you to join ${company}.`
            : `You've been invited to join ${company}.`}
        </h2>
        <p className="auth-body">Your account is ready. Click below to enter your workspace.</p>
        <button className="auth-btn" onClick={onEnter}>
          Enter workspace →
        </button>
      </div>
    </div>
  )
}
