interface InviteLandingProps {
  companyName: string | null
  inviterName: string | null
  onEnter: () => void
}

export default function InviteLanding({ companyName, inviterName, onEnter }: InviteLandingProps) {
  const company = companyName ?? 'a GrowthOS workspace'

  return (
    <div className="invite-page">
      <div className="invite-card">
        <div className="invite-wordmark">GrowthOS</div>
        <h2 className="invite-title">
          {inviterName
            ? `${inviterName} has invited you to join ${company}.`
            : `You've been invited to join ${company}.`}
        </h2>
        <p className="invite-body">Your account is ready. Click below to enter your workspace.</p>
        <button className="invite-submit-btn" onClick={onEnter}>
          Enter workspace →
        </button>
      </div>
    </div>
  )
}
