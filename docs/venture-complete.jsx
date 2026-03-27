import { useState, useEffect, useRef } from "react";

// ============================================================
// SHARED CONSTANTS
// ============================================================

const COLORS = {
  bg: "#f6f3ee",
  fg: "#1a1a18",
  muted: "#8a857b",
  accent: "#c44e2b",
  border: "#e2ddd4",
  cream: "#faf8f4",
  marginLine: "#d4cec4",
  ventureGreen: "#00a071",
};

// ============================================================
// VENTURE CATALOGUE
// ============================================================

const PRODUCTS = [
  {
    id: "growth",
    name: "growthOS",
    accent: "#c44e2b",
    description: "Your AI-powered marketing department. Lead generation, outreach campaigns, and pipeline management — 42 specialists, one conversation.",
    icon: "growth",
    ready: true,
  },
  {
    id: "deal",
    name: "dealOS",
    accent: "#2b5ec4",
    description: "AI-driven due diligence, automated. Risk assessment, document analysis, and compliance checks — thorough, fast, and always audit-ready.",
    icon: "deal",
    ready: true,
  },
  {
    id: "credit",
    name: "creditOS",
    accent: "#c4912b",
    description: "Intelligent credit control that chases so you don't have to. Automated follow-ups, risk scoring, and real-time cashflow visibility.",
    icon: "credit",
    ready: false,
    comingSoon: true,
  },
  {
    id: "insight",
    name: "insightOS",
    accent: "#2ba8c4",
    description: "Business intelligence that surfaces what matters. AI-curated dashboards, trend detection, and strategic recommendations on demand.",
    icon: "insight",
    ready: false,
    comingSoon: true,
  },
];

function ProductIcon({ type, hovered, accent }) {
  const color = hovered ? "#fff" : accent;
  const style = {
    transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
    transform: hovered ? (
      type === "growth" ? "rotate(15deg) scale(1.1)" :
      type === "deal" ? "scale(1.15)" :
      type === "credit" ? "translateY(-3px) scale(1.1)" :
      "rotate(-10deg) scale(1.1)"
    ) : "none",
  };

  if (type === "growth") {
    return (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={style}>
        <path d="M6 28L14 18L20 22L30 8" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 8H30V14" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="14" cy="18" r="2" fill={color} opacity={hovered ? 1 : 0.4} style={{ transition: "opacity 0.3s ease" }} />
        <circle cx="20" cy="22" r="2" fill={color} opacity={hovered ? 1 : 0.4} style={{ transition: "opacity 0.3s ease" }} />
      </svg>
    );
  }
  if (type === "deal") {
    return (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={style}>
        <rect x="6" y="8" width="24" height="20" rx="2" stroke={color} strokeWidth="2.5" />
        <path d="M6 14H30" stroke={color} strokeWidth="2.5" />
        <path d="M12 20H20" stroke={color} strokeWidth="2" strokeLinecap="round" opacity={hovered ? 1 : 0.5} style={{ transition: "opacity 0.3s ease" }} />
        <path d="M12 24H17" stroke={color} strokeWidth="2" strokeLinecap="round" opacity={hovered ? 1 : 0.5} style={{ transition: "opacity 0.3s ease" }} />
        <circle cx="25" cy="22" r="3" stroke={color} strokeWidth="2" />
        <path d="M27 24L29 26" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "credit") {
    return (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={style}>
        <path d="M18 6V10" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M18 26V30" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M13 12C13 9.8 15.2 8 18 8C20.8 8 23 9.8 23 12C23 14.2 20.8 16 18 16" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M23 24C23 26.2 20.8 28 18 28C15.2 28 13 26.2 13 24C13 21.8 15.2 20 18 20" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={style}>
      <circle cx="18" cy="16" r="8" stroke={color} strokeWidth="2.5" />
      <path d="M14 27H22" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M15 30H21" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M18 8V5" stroke={color} strokeWidth="2" strokeLinecap="round" opacity={hovered ? 1 : 0.4} style={{ transition: "opacity 0.3s ease" }} />
      <path d="M24 10L26 8" stroke={color} strokeWidth="2" strokeLinecap="round" opacity={hovered ? 1 : 0.4} style={{ transition: "opacity 0.3s ease" }} />
      <path d="M12 10L10 8" stroke={color} strokeWidth="2" strokeLinecap="round" opacity={hovered ? 1 : 0.4} style={{ transition: "opacity 0.3s ease" }} />
    </svg>
  );
}

function ProductCard({ product, onLaunch }) {
  const [hovered, setHovered] = useState(false);
  const { fg, muted, border, cream } = COLORS;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => product.ready && onLaunch && onLaunch(product.id)}
      style={{
        position: "relative",
        padding: "36px 32px",
        borderRadius: 6,
        border: `1px solid ${hovered ? product.accent : border}`,
        background: hovered ? product.accent : cream,
        cursor: product.ready ? "pointer" : "default",
        transition: "all 0.45s cubic-bezier(0.16,1,0.3,1)",
        transform: hovered ? "scale(1.03) translateZ(0)" : "scale(1) translateZ(0)",
        willChange: "transform, background, border-color, box-shadow",
        backfaceVisibility: "hidden",
        WebkitFontSmoothing: "antialiased",
        boxShadow: hovered
          ? `0 8px 30px ${product.accent}25, 0 2px 8px ${product.accent}15`
          : "0 1px 3px rgba(0,0,0,0.04)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{
        position: "absolute", top: "-50%", left: "-50%", width: "200%", height: "200%",
        background: `radial-gradient(circle at 30% 30%, ${product.accent}15, transparent 60%)`,
        opacity: hovered ? 1 : 0, transition: "opacity 0.5s ease", pointerEvents: "none",
      }} />

      <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative", zIndex: 1 }}>
        <ProductIcon type={product.icon} hovered={hovered} accent={product.accent} />
        <div>
          <div style={{
            fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em",
            color: hovered ? "#fff" : fg, transition: "color 0.35s ease",
          }}>
            {product.name.replace("OS", "")}
            <span style={{ color: hovered ? "rgba(255,255,255,0.7)" : product.accent, transition: "color 0.35s ease" }}>OS</span>
          </div>
          {product.comingSoon && (
            <div style={{
              fontSize: 9, fontWeight: 600, textTransform: "uppercase",
              letterSpacing: "0.12em", marginTop: 3,
              color: hovered ? "rgba(255,255,255,0.6)" : muted,
              fontFamily: "'DM Mono', monospace", transition: "color 0.35s ease",
            }}>Coming Soon</div>
          )}
        </div>
      </div>

      <div style={{
        fontSize: 13, lineHeight: 1.65,
        color: hovered ? "rgba(255,255,255,0.85)" : muted,
        transition: "color 0.35s ease", position: "relative", zIndex: 1, flex: 1,
      }}>{product.description}</div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {product.ready ? (
          <div style={{
            fontSize: 13, fontWeight: 600,
            color: hovered ? "#fff" : product.accent,
            transition: "all 0.35s ease", fontFamily: "'DM Mono', monospace",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            Launch
            <span style={{
              display: "inline-block",
              transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1)",
              transform: hovered ? "translateX(4px)" : "translateX(0)",
            }}>→</span>
          </div>
        ) : (
          <div style={{
            fontSize: 12, fontWeight: 600,
            color: hovered ? "rgba(255,255,255,0.7)" : muted,
            transition: "all 0.35s ease", fontFamily: "'DM Mono', monospace",
            padding: "6px 14px", borderRadius: 4,
            border: `1px solid ${hovered ? "rgba(255,255,255,0.3)" : border}`,
            display: "inline-block",
          }}>Notify me →</div>
        )}
      </div>
    </div>
  );
}

function VentureCatalogue({ onLaunch, transitionMode, onToggleTransition }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);
  const { bg, fg, muted, border, ventureGreen } = COLORS;

  return (
    <div style={{
      width: "100%", minHeight: "100vh", background: bg,
      fontFamily: "'Source Serif 4', Georgia, serif",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "0 24px", position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `linear-gradient(${border} 1px, transparent 1px), linear-gradient(90deg, ${border} 1px, transparent 1px)`,
        backgroundSize: "48px 48px", opacity: 0.5,
      }} />

      <div style={{ maxWidth: 860, width: "100%", position: "relative", zIndex: 1, paddingTop: 80, paddingBottom: 80 }}>
        <div style={{
          textAlign: "center", marginBottom: 12,
          opacity: mounted ? 1 : 0, animation: mounted ? "fade-up 0.6s ease 0.1s both" : "none",
        }}>
          <div style={{
            fontSize: 34, fontWeight: 800, letterSpacing: "0.22em",
            textTransform: "uppercase", color: fg, fontFamily: "'Outfit', sans-serif",
          }}>
            VENTURE<span style={{ color: ventureGreen }}>OS</span>
          </div>
        </div>

        <div style={{
          textAlign: "center", marginBottom: 72,
          opacity: mounted ? 1 : 0, animation: mounted ? "fade-up 0.6s ease 0.3s both" : "none",
        }}>
          <div style={{ fontSize: 22, color: muted, fontWeight: 300, letterSpacing: "-0.01em", lineHeight: 1.5 }}>
            Your suite of AI-powered business tools.
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {PRODUCTS.map((product, i) => (
            <div key={product.id} style={{
              opacity: mounted ? 1 : 0,
              animation: mounted ? `fade-up 0.5s ease ${0.4 + i * 0.1}s both` : "none",
            }}>
              <ProductCard product={product} onLaunch={onLaunch} />
            </div>
          ))}
        </div>

        <div style={{
          textAlign: "center", marginTop: 56,
          opacity: mounted ? 1 : 0, animation: mounted ? "fade-in 0.5s ease 1s both" : "none",
        }}>
          <button
            onClick={onToggleTransition}
            style={{
              fontSize: 12, color: `${muted}88`, fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.04em", background: "none", border: "none",
              cursor: "pointer", transition: "color 0.2s ease", padding: "4px 8px",
            }}
            onMouseEnter={e => e.target.style.color = muted}
            onMouseLeave={e => e.target.style.color = `${muted}88`}
          >
            Built by Venture Labs{transitionMode === "fade" ? " ·" : " ·"} {transitionMode === "wipe" ? "◆" : "○"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// GROWTHOS APP
// ============================================================

const AGENTS = [
  { id: "watson", name: "Watson", emoji: "◆", role: "CMO", status: "active" },
  { id: "leadgen", name: "Lead Gen Expert", emoji: "◇", role: "Prospecting", status: "idle" },
  { id: "campaign", name: "Campaign Mgr", emoji: "△", role: "Outreach", status: "idle" },
  { id: "admin", name: "Administrator", emoji: "○", role: "Operations", status: "idle" },
];

const TEAM_HIGHLIGHTS = [
  { name: "Watson", role: "CMO", initial: "W", isLead: true },
  { name: "Lead Gen Expert", role: "Prospecting", initial: "L" },
  { name: "Campaign Manager", role: "Outreach", initial: "C" },
  { name: "Administrator", role: "Operations", initial: "A" },
];

const SAMPLE_LEADS = [
  { name: "James Whitfield", company: "CloudSync", role: "CEO", employees: 28, match: 94, sector: "DevOps" },
  { name: "Sarah Chen", company: "DataPipe.io", role: "Founder", employees: 15, match: 91, sector: "Data" },
  { name: "Marcus Webb", company: "Stackraft", role: "Co-founder", employees: 34, match: 88, sector: "Infrastructure" },
  { name: "Priya Sharma", company: "MetricFlow", role: "CEO", employees: 22, match: 85, sector: "Analytics" },
  { name: "Tom Bakker", company: "Onboardly", role: "Founder", employees: 11, match: 82, sector: "HR Tech" },
];

const INITIAL_MESSAGES = [
  { from: "agent", agent: "Watson", text: "Hey 👋 how are you?" },
  { from: "agent", agent: "Watson", text: "I'm Watson — Chief Marketing Officer of GrowthOS. I run a team of 42 AI employees, and we're here to fuel growth at your organisation." },
  { from: "agent", agent: "Watson", text: "Whether you need a full plug & play marketing department or just want us to work alongside your existing team to fill skill gaps and handle the time-consuming stuff — we've got you covered." },
  { from: "agent", agent: "Watson", text: "Want to get started or hear more?", options: ["Let's get started", "I want to hear more"] },
];

const HEAR_MORE_MSGS = [
  { from: "agent", agent: "Watson", text: "The team covers everything from lead generation and prospect scoring to email outreach campaigns, CRM management, and pipeline analytics.\n\nEach employee is an AI specialist — they use real tools, work with real data, and report back to me. You talk to me, I coordinate the team. Think of it as your marketing department on demand.\n\nNo hiring, no onboarding, just results.", delay: 2000 },
  { from: "agent", agent: "Watson", text: "Ready to jump in?", options: ["Let's get started"], delay: 1200 },
];

const GET_STARTED_MSGS = [
  { from: "agent", agent: "Watson", text: "Brilliant — let me show you what we can do. I'll run a quick lead generation search based on a sample profile.", delay: 1400 },
  { from: "status", agent: "Lead Gen Expert", text: "Lead Gen Expert is searching 4 data sources…", delay: 1600 },
  { from: "agent", agent: "Watson", text: "The Lead Gen Expert is compiling your prospect list now. Give them a moment.", delay: 1800 },
  { from: "status", agent: "Lead Gen Expert", text: "142 prospects identified — scoring against your ICP", delay: 2200 },
  { from: "agent", agent: "Watson", text: "We've compiled 142 qualified leads matching your criteria. I've loaded them into the sidebar for your review — each lead is scored against your ICP. Approve the ones you'd like to proceed with.", action: "review_leads", delay: 1600 },
];

function GTypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "4px 0" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "#8a857b", animation: `dot-pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
    </div>
  );
}

function GSignupInline({ onSubmit }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState("email");
  const { bg, fg, accent, border, muted, cream } = COLORS;

  if (step === "done") return (
    <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 4, background: bg, border: `1px solid ${border}`, fontSize: 12, color: muted, fontFamily: "'DM Mono', monospace", display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: "#4a8c5c" }}>✓</span> Account created
    </div>
  );
  return (
    <div style={{ marginTop: 14, padding: "16px", borderRadius: 4, background: bg, border: `1px solid ${border}` }}>
      {step === "email" ? (
        <div>
          <div style={{ fontSize: 12, color: muted, marginBottom: 10, fontFamily: "'DM Mono', monospace" }}>What's your email?</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && email.includes("@")) setStep("name"); }}
              placeholder="you@company.com" autoFocus
              style={{ flex: 1, padding: "8px 12px", borderRadius: 3, border: `1px solid ${border}`, background: cream, outline: "none", fontSize: 13, color: fg, fontFamily: "'Source Serif 4', serif" }} />
            <button onClick={() => { if (email.includes("@")) setStep("name"); }}
              style={{ padding: "8px 16px", borderRadius: 3, border: "none", background: fg, color: bg, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>Next</button>
          </div>
        </div>
      ) : (
        <div style={{ animation: "fade-up 0.3s ease" }}>
          <div style={{ fontSize: 12, color: muted, marginBottom: 10, fontFamily: "'DM Mono', monospace" }}>And your name?</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && name.trim()) { setStep("done"); onSubmit({ email, name }); } }}
              placeholder="First name" autoFocus
              style={{ flex: 1, padding: "8px 12px", borderRadius: 3, border: `1px solid ${border}`, background: cream, outline: "none", fontSize: 13, color: fg, fontFamily: "'Source Serif 4', serif" }} />
            <button onClick={() => { if (name.trim()) { setStep("done"); onSubmit({ email, name }); } }}
              style={{ padding: "8px 16px", borderRadius: 3, border: "none", background: accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>Create account</button>
          </div>
        </div>
      )}
    </div>
  );
}

function GrowthOSApp({ onBack }) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [mounted, setMounted] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [signedUp, setSignedUp] = useState(false);
  const [userName, setUserName] = useState("");
  const [usedOptionIndices, setUsedOptionIndices] = useState(new Set());
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [agentStatuses, setAgentStatuses] = useState({ watson: "active", leadgen: "idle", campaign: "idle", admin: "idle" });
  const [appMode, setAppMode] = useState("entry");
  const chatEndRef = useRef(null);
  const queueRef = useRef([]);
  const processingRef = useRef(false);
  const startTimeRef = useRef(new Date());

  const { bg, fg, muted, accent, border, cream, marginLine } = COLORS;

  useEffect(() => { setTimeout(() => setMounted(true), 150); }, []);

  useEffect(() => {
    const delays = [1000, 2400, 2800, 1800];
    let cumulative = 800;
    const timers = [];
    INITIAL_MESSAGES.forEach((msg, i) => {
      timers.push(setTimeout(() => setIsTyping(true), cumulative));
      cumulative += delays[i] || 1500;
      timers.push(setTimeout(() => { setIsTyping(false); setMessages(prev => [...prev, msg]); }, cumulative));
      cumulative += 300;
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  const processQueue = () => {
    if (processingRef.current || queueRef.current.length === 0) return;
    processingRef.current = true;
    const next = queueRef.current.shift();
    setIsTyping(true);
    if (next.from === "status" && next.agent === "Lead Gen Expert") setAgentStatuses(prev => ({ ...prev, leadgen: "working" }));
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, next]);
      processingRef.current = false;
      if (next.action === "review_leads") {
        setAgentStatuses(prev => ({ ...prev, leadgen: "idle" }));
        setTimeout(() => setShowRightSidebar(true), 500);
      }
      if (queueRef.current.length > 0) setTimeout(() => processQueue(), 300);
    }, next.delay || 1200 + Math.random() * 400);
  };

  const getTimestamp = (msgIndex) => {
    const t = new Date(startTimeRef.current.getTime() + msgIndex * 3000);
    return t.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  const handleOptionClick = (opt, msgIndex) => {
    setMessages(prev => [...prev, { from: "user", text: opt }]);
    setUsedOptionIndices(prev => new Set([...prev, msgIndex]));
    if (opt === "I want to hear more") {
      queueRef.current = [...HEAR_MORE_MSGS];
    } else {
      setAppMode("dashboard");
      queueRef.current = [...GET_STARTED_MSGS];
    }
    setTimeout(() => processQueue(), 400);
  };

  const handleSend = () => {
    if (!inputVal.trim()) return;
    setMessages(prev => [...prev, { from: "user", text: inputVal }]);
    setInputVal("");
    if (!signedUp) queueRef.current = [...GET_STARTED_MSGS];
    setTimeout(() => processQueue(), 500);
  };

  const handleSignup = ({ email, name }) => {
    setSignedUp(true);
    setUserName(name);
    setTimeout(() => {
      setMessages(prev => [...prev, { from: "agent", agent: "Watson", text: `Great to have you on board, ${name}! The whole team is at your disposal now.` }]);
    }, 600);
  };

  const currentAgents = AGENTS.map(a => ({ ...a, status: agentStatuses[a.id] || a.status }));
  const isDash = appMode === "dashboard";

  return (
    <div style={{
      width: "100%", height: "100vh", display: "flex",
      background: bg, color: fg, fontFamily: "'Source Serif 4', Georgia, serif",
      overflow: "hidden", position: "relative",
    }}>
      {/* LEFT SIDEBAR */}
      <div style={{
        width: isDash ? 220 : 0, borderRight: isDash ? `1px solid ${border}` : "none",
        overflow: "hidden", transition: "width 0.7s cubic-bezier(0.16,1,0.3,1)",
        flexShrink: 0, display: "flex", flexDirection: "column",
        padding: isDash ? "24px 16px" : "24px 0",
      }}>
        <div style={{ width: "100%", minWidth: 188, opacity: isDash ? 1 : 0, transition: "opacity 0.5s ease 0.4s", display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.04em", padding: "0 8px", marginBottom: 32, color: fg }}>
            growth<span style={{ color: accent }}>OS</span>
          </div>
          <div style={{ fontSize: 10, fontWeight: 500, color: muted, textTransform: "uppercase", letterSpacing: "0.12em", padding: "0 8px", marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>Team</div>

          {currentAgents.map(a => (
            <div key={a.id} style={{
              display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 8px",
              borderRadius: 6, cursor: "pointer",
              background: a.id === "watson" ? `${accent}08` : "transparent",
              transition: "background 0.2s ease",
            }}>
              <span style={{ fontSize: 10, marginTop: 3, color: a.status === "active" ? accent : a.status === "working" ? "#b8860b" : muted }}>{a.emoji}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: a.id === "watson" ? 500 : 400, color: a.id === "watson" ? fg : muted }}>{a.name}</div>
                {a.status === "working" && (
                  <div style={{ fontSize: 9, color: "#b8860b", marginTop: 2, fontFamily: "'DM Mono', monospace", fontStyle: "italic" }}>working</div>
                )}
              </div>
            </div>
          ))}

          <div style={{ flex: 1, minHeight: 40 }} />

          <div style={{ padding: "14px", borderRadius: 8, border: `1px solid ${border}`, background: cream, boxSizing: "border-box", width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'DM Mono', monospace" }}>Leads</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: accent, fontFamily: "'DM Mono', monospace" }}>{showRightSidebar ? "142" : "—"}</span>
            </div>
            {showRightSidebar ? (
              <>
                <div style={{ width: "100%", height: 3, background: border, borderRadius: 2, marginTop: 10 }}>
                  <div style={{ width: "67%", height: "100%", background: accent, borderRadius: 2, transition: "width 1s ease" }} />
                </div>
                <div style={{ fontSize: 10, color: muted, marginTop: 6 }}>67% match rate</div>
              </>
            ) : (
              <div style={{ fontSize: 10, color: muted, marginTop: 6 }}>No campaigns yet</div>
            )}
          </div>
        </div>
      </div>

      {/* MAIN AREA */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top bar */}
        <div style={{
          padding: isDash ? "14px 32px" : "18px 32px",
          borderBottom: isDash ? `1px solid ${border}` : "none",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "relative", zIndex: 2, transition: "all 0.5s ease",
          opacity: mounted ? 1 : 0,
        }}>
          {isDash ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: accent }}>◆</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Watson</span>
                <span style={{ fontSize: 11, color: "#4a8c5c", marginLeft: 4 }}>● Active</span>
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                {["Campaigns", "Analytics", "Settings"].map(label => (
                  <button key={label} style={{
                    background: "none", border: "none", fontSize: 11, color: muted,
                    cursor: "pointer", fontFamily: "'DM Mono', monospace", fontWeight: 500, transition: "color 0.2s ease",
                  }}
                    onMouseEnter={e => e.target.style.color = fg}
                    onMouseLeave={e => e.target.style.color = muted}
                  >{label}</button>
                ))}
                <button onClick={onBack} style={{
                  background: "none", border: `1px solid ${border}`, borderRadius: 4,
                  padding: "4px 10px", fontSize: 10, color: muted, cursor: "pointer",
                  fontFamily: "'Outfit', sans-serif", fontWeight: 700, transition: "all 0.2s ease",
                  marginLeft: 8, display: "flex", alignItems: "center", gap: 6,
                  letterSpacing: "0.08em",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.ventureGreen; e.currentTarget.style.color = fg; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = muted; }}
                >
                  <span style={{ fontSize: 11 }}>←</span>
                  <span>V</span><span style={{ color: COLORS.ventureGreen }}>OS</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={onBack} style={{
                  background: "none", border: "none", fontSize: 12, color: muted,
                  cursor: "pointer", fontFamily: "'Outfit', sans-serif", fontWeight: 700,
                  transition: "color 0.2s ease", display: "flex", alignItems: "center", gap: 6,
                  letterSpacing: "0.06em",
                }}
                  onMouseEnter={e => e.currentTarget.style.color = fg}
                  onMouseLeave={e => e.currentTarget.style.color = muted}
                >
                  <span>←</span>
                  <span>V</span><span style={{ color: COLORS.ventureGreen }}>OS</span>
                </button>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.04em", color: fg }}>
                  growth<span style={{ color: accent }}>OS</span>
                </div>
              </div>
              <button style={{
                background: "none", border: "none", fontSize: 13, color: muted,
                cursor: "pointer", fontFamily: "'Source Serif 4', serif", transition: "color 0.2s ease",
              }}
                onMouseEnter={e => e.target.style.color = fg}
                onMouseLeave={e => e.target.style.color = muted}
              >Sign in</button>
            </>
          )}
        </div>

        {/* Chat content */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          maxWidth: isDash ? "none" : 680, width: "100%",
          margin: isDash ? 0 : "0 auto", padding: isDash ? 0 : "0 24px 0 0",
          position: "relative", zIndex: 2, overflow: "hidden",
          transition: "max-width 0.7s ease, margin 0.7s ease, padding 0.7s ease",
        }}>
          {!isDash && (
            <div style={{ position: "absolute", left: 56, top: 0, bottom: 0, width: 1, background: `${marginLine}88`, zIndex: 0 }} />
          )}

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {!isDash && (
              <div style={{ paddingLeft: 80, paddingTop: 48, paddingBottom: 28, opacity: mounted ? 1 : 0, transition: "opacity 0.6s ease 0.2s" }}>
                <div style={{ fontSize: 26, fontWeight: 300, letterSpacing: "-0.02em", color: fg, lineHeight: 1.4, marginBottom: 20, animation: mounted ? "fade-up 0.6s ease 0.2s both" : "none" }}>
                  Introducing your AI marketing department.<br />
                  <span style={{ fontStyle: "italic", color: accent }}>42 employees</span>
                  <span style={{ color: muted }}>, ready to work.</span>
                </div>
                <div style={{ fontSize: 14, lineHeight: 2.2, color: muted, fontWeight: 400, animation: mounted ? "fade-up 0.5s ease 0.5s both" : "none" }}>
                  <span>Led by </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px 3px 6px", borderRadius: 4, verticalAlign: "middle", background: `${accent}06`, border: `1px solid ${accent}18`, margin: "0 2px" }}>
                    <span style={{ width: 18, height: 18, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${accent}`, fontSize: 9, fontWeight: 700, fontStyle: "italic", color: accent }}>W</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: accent }}>Watson</span>
                    <span style={{ fontSize: 10, color: muted, fontFamily: "'DM Mono', monospace" }}>CMO</span>
                  </span>
                  <span> — with specialists including</span>
                  {TEAM_HIGHLIGHTS.filter(t => !t.isLead).map((member, i, arr) => (
                    <span key={i}>
                      {i === arr.length - 1 && <span> and</span>}
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px 3px 6px", borderRadius: 4, verticalAlign: "middle", background: cream, border: `1px solid ${border}`, margin: "0 3px" }}>
                        <span style={{ width: 18, height: 18, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${border}`, fontSize: 9, fontWeight: 700, fontStyle: "italic", color: muted }}>{member.initial}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: fg }}>{member.name}</span>
                      </span>
                      {i < arr.length - 2 && <span>,</span>}
                    </span>
                  ))}
                  <span> — a full department that <span style={{ fontStyle: "italic", color: fg }}>works as your marketing team, or alongside your existing one</span>.</span>
                </div>
              </div>
            )}

            {/* Messages */}
            <div style={{
              paddingLeft: isDash ? 32 : 80, paddingRight: 32,
              paddingTop: isDash ? 24 : 4, paddingBottom: 16,
              display: "flex", flexDirection: "column", gap: 4, flex: 1,
              transition: "padding-left 0.7s ease",
            }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ animation: "fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both", padding: "6px 0", position: "relative" }}>
                  {msg.from === "status" ? (
                    <div style={{ fontSize: 12, color: muted, fontStyle: "italic", padding: "6px 0 6px 14px", borderLeft: `2px solid ${border}`, fontFamily: "'DM Mono', monospace" }}>{msg.text}</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: msg.from === "user" ? "flex-end" : "flex-start" }}>
                      {msg.from === "agent" && (i === 0 || messages[i - 1]?.from !== "agent") && (
                        <div style={{ fontSize: 10, color: accent, marginBottom: 5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'DM Mono', monospace" }}>{msg.agent}</div>
                      )}
                      <div style={{
                        maxWidth: "80%", padding: "14px 18px", borderRadius: 3,
                        background: msg.from === "user" ? fg : cream,
                        color: msg.from === "user" ? bg : fg,
                        border: msg.from === "user" ? "none" : `1px solid ${border}`,
                        fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-line",
                      }}>
                        {msg.text}
                        {msg.options && !usedOptionIndices.has(i) && (
                          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                            {msg.options.map((opt, j) => (
                              <button key={j} onClick={() => handleOptionClick(opt, i)} style={{
                                padding: "8px 18px", borderRadius: 100, textAlign: "left",
                                border: `1px solid ${border}`, background: bg, color: fg,
                                fontSize: 13, cursor: "pointer", fontFamily: "'Source Serif 4', serif",
                                transition: "all 0.2s ease", whiteSpace: "nowrap",
                              }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.background = "#fff"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.background = bg; }}
                              >{opt}</button>
                            ))}
                          </div>
                        )}
                        {msg.signup && !signedUp && <GSignupInline onSubmit={handleSignup} />}
                        {msg.signup && signedUp && (
                          <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 4, background: bg, border: `1px solid ${border}`, fontSize: 12, color: muted, fontFamily: "'DM Mono', monospace", display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ color: "#4a8c5c" }}>✓</span> Account created
                          </div>
                        )}
                        {msg.action === "review_leads" && (
                          <button onClick={() => setShowRightSidebar(true)} style={{
                            display: "block", marginTop: 12, padding: "8px 16px", borderRadius: 4,
                            border: `1px solid ${accent}`, background: "transparent", color: accent,
                            fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Mono', monospace", transition: "all 0.2s ease",
                          }}
                            onMouseEnter={e => { e.target.style.background = accent; e.target.style.color = "#fff"; }}
                            onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = accent; }}
                          >Review Leads →</button>
                        )}
                      </div>
                      <div style={{
                        fontSize: 10, color: `${muted}88`, marginTop: 4,
                        fontFamily: "'DM Mono', monospace",
                      }}>{getTimestamp(i)}</div>
                    </div>
                  )}
                </div>
              ))}
              {isTyping && <div style={{ padding: "6px 0", animation: "fade-in 0.3s ease" }}><GTypingIndicator /></div>}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Input */}
          <div style={{ padding: isDash ? "16px 32px 24px" : "16px 24px 32px 80px", flexShrink: 0, transition: "padding 0.7s ease" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              borderBottom: `1.5px solid ${inputFocused ? muted : border}`,
              paddingBottom: 10, transition: "border-color 0.3s ease",
              maxWidth: isDash ? 620 : "none", margin: isDash ? "0 auto" : 0,
            }}>
              <input value={inputVal} onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)}
                placeholder="Type a message…"
                style={{ flex: 1, background: "none", border: "none", outline: "none", color: fg, fontSize: 15, fontFamily: "'Source Serif 4', serif", padding: "6px 0" }} />
              {isDash ? (
                <button onClick={handleSend} style={{
                  padding: "6px 18px", borderRadius: 4, border: "none",
                  background: inputVal ? fg : border, color: inputVal ? bg : muted,
                  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Mono', monospace", transition: "all 0.2s ease",
                }}>Send</button>
              ) : (
                inputVal && <button onClick={handleSend} style={{ background: "none", border: "none", color: accent, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>Send</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR */}
      <div style={{
        width: showRightSidebar ? 370 : 0, borderLeft: showRightSidebar ? `1px solid ${border}` : "none",
        overflow: "hidden", transition: "width 0.45s cubic-bezier(0.16,1,0.3,1)",
        background: cream, flexShrink: 0,
      }}>
        <div style={{ width: 370, padding: "24px 20px" }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20,
            animation: showRightSidebar ? "slide-right 0.3s ease 0.15s both" : "none",
          }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em" }}>Lead Review</div>
              <div style={{ fontSize: 11, color: muted, marginTop: 2, fontFamily: "'DM Mono', monospace" }}>Showing 5 of 142</div>
            </div>
            <button onClick={() => setShowRightSidebar(false)} style={{ background: "none", border: "none", fontSize: 18, color: muted, cursor: "pointer" }}>×</button>
          </div>
          {SAMPLE_LEADS.map((lead, i) => (
            <div key={i} style={{
              padding: "14px 16px", borderRadius: 4, border: `1px solid ${border}`,
              background: "#fff", marginBottom: 8, cursor: "pointer", transition: "border-color 0.2s ease",
              animation: showRightSidebar ? `slide-right 0.35s ease ${0.2 + i * 0.06}s both` : "none",
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = border}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: fg }}>{lead.name}</div>
                  <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>{lead.role}, {lead.company}</div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: lead.match >= 90 ? accent : fg, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{lead.match}</div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 3, background: `${accent}0a`, color: accent, fontFamily: "'DM Mono', monospace", border: `1px solid ${accent}15` }}>{lead.sector}</span>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 3, background: `${fg}06`, color: muted, fontFamily: "'DM Mono', monospace" }}>{lead.employees} ppl</span>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                <button style={{ flex: 1, padding: "6px", borderRadius: 3, border: `1px solid ${accent}`, background: accent, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>Approve</button>
                <button style={{ flex: 1, padding: "6px", borderRadius: 3, border: `1px solid ${border}`, background: "transparent", color: muted, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>Pass</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TOP-LEVEL ROUTER
// ============================================================

export default function App() {
  const [currentView, setCurrentView] = useState("catalogue");
  const [nextView, setNextView] = useState(null);
  const [transitionPhase, setTransitionPhase] = useState("idle"); // idle | wipe-in | covered | wipe-out | fade-out | fade-in
  const [transitionAccent, setTransitionAccent] = useState("#c44e2b");
  const [transitionMode, setTransitionMode] = useState("wipe"); // "wipe" or "fade"

  const navigate = (view, accent) => {
    if (transitionPhase !== "idle") return;

    if (transitionMode === "fade") {
      setTransitionPhase("fade-out");
      setTimeout(() => {
        setCurrentView(view);
        setTransitionPhase("fade-in");
        setTimeout(() => setTransitionPhase("idle"), 400);
      }, 300);
      return;
    }

    setTransitionAccent(accent || "#c44e2b");
    setNextView(view);
    setTransitionPhase("wipe-in");

    setTimeout(() => {
      // Overlay fully covers screen — swap the view underneath
      setCurrentView(view);
      setTransitionPhase("covered");

      // Next frame: start the reveal
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTransitionPhase("wipe-out");
          setTimeout(() => {
            setTransitionPhase("idle");
            setNextView(null);
          }, 1000);
        });
      });
    }, 600);
  };

  return (
    <div style={{ width: "100%", height: "100vh", overflow: "hidden", background: COLORS.bg, position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,300;8..60,400;8..60,500;8..60,600;8..60,700&family=DM+Mono:wght@400;500&family=Outfit:wght@300;400;500;600;700;800&display=swap');
        @keyframes fade-up { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fade-in { from{opacity:0} to{opacity:1} }
        @keyframes slide-right { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes dot-pulse { 0%,100%{opacity:.15} 50%{opacity:.6} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2ddd4; border-radius: 3px; }
        ::placeholder { color: #b5b0a6; }
        ::selection { background: #00a07133; }
      `}</style>

      {/* Content layer */}
      <div style={{
        width: "100%", height: "100%",
        position: transitionPhase === "idle" || transitionPhase === "fade-out" || transitionPhase === "fade-in" ? "relative" : "absolute",
        inset: 0,
        zIndex: transitionPhase === "wipe-out" ? 100 : 2,
        clipPath: transitionPhase === "wipe-out"
          ? "circle(150% at 50% 50%)"
          : transitionPhase === "covered"
          ? "circle(0% at 50% 50%)"
          : transitionPhase === "wipe-in"
          ? "circle(150% at 50% 50%)"
          : "none",
        transition: transitionPhase === "wipe-out"
          ? "clip-path 0.9s cubic-bezier(0.16, 1, 0.3, 1)"
          : "none",
        opacity: transitionPhase === "fade-out" ? 0 : 1,
        ...(transitionPhase === "fade-out" || transitionPhase === "fade-in" ? { transition: "opacity 0.3s ease" } : {}),
      }}>
        {currentView === "catalogue" && (
          <VentureCatalogue
            onLaunch={(id) => {
              const product = PRODUCTS.find(p => p.id === id);
              if (product) navigate(id, product.accent);
            }}
            transitionMode={transitionMode}
            onToggleTransition={() => setTransitionMode(m => m === "wipe" ? "fade" : "wipe")}
          />
        )}
        {currentView === "growth" && (
          <GrowthOSApp onBack={() => navigate("catalogue", COLORS.ventureGreen)} />
        )}
      </div>

      {/* Colour overlay — wipes in on top, sits under new page during reveal */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        zIndex: transitionPhase === "wipe-in" ? 100 : 50,
        background: transitionAccent,
        opacity: transitionPhase === "idle" ? 0 : 1,
        clipPath: transitionPhase === "wipe-in" || transitionPhase === "covered" || transitionPhase === "wipe-out"
          ? "circle(150% at 50% 50%)"
          : "circle(0% at 50% 50%)",
        transition: transitionPhase === "wipe-in"
          ? "clip-path 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0s"
          : transitionPhase === "idle"
          ? "opacity 0s ease 0s, clip-path 0s ease 0s"
          : "none",
      }} />
    </div>
  );
}
