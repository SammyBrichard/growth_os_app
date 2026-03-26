# GrowthOS Pre-Signup UI — Design Specification

> **Scope:** This document describes the pre-signup entry screen for GrowthOS. It covers everything from first page load to the moment the user clicks "Let's get started" and the UI transforms into the full dashboard. The reference implementation is in `docs/reference/venture-demo.jsx` — a single-file React component that should be used as the source of truth for all styling, animation, and layout decisions.

---

## 1. Design Language

### Colour Palette

| Token        | Value     | Usage                                        |
|-------------|-----------|----------------------------------------------|
| `bg`        | `#f6f3ee` | Page background — warm cream                |
| `fg`        | `#1a1a18` | Primary text, user message bubbles           |
| `muted`     | `#8a857b` | Secondary text, labels, timestamps           |
| `accent`    | `#c44e2b` | Brand accent — burnt sienna/red-orange       |
| `border`    | `#e2ddd4` | Borders, dividers, input underlines          |
| `cream`     | `#faf8f4` | Agent message bubble background, panel fills |
| `marginLine`| `#d4cec4` | Vertical margin line (entry mode only)       |

No gradients. No shadows on the entry screen. The palette is deliberately warm and muted.

### Typography

Two font families only:

- **Source Serif 4** (variable, optical size 8–60) — body text, headings, chat messages, input field. Weights: 300 (headline), 400 (body), 500–700 (emphasis).
- **DM Mono** — labels, timestamps, agent names, tags, buttons, status messages. Weights: 400, 500.

Load via Google Fonts. No system font fallbacks visible to users — ensure fonts load before first paint (use `preconnect` and `font-display: swap`).

### Spacing & Layout

- Entry screen is centred, max-width `680px`
- Padding-left `80px` on all content (to accommodate the margin line)
- Padding-right `24px`
- Intro section: `paddingTop: 48px`, `paddingBottom: 28px`
- Chat messages: `6px` vertical gap between messages
- Message bubbles: `14px 18px` padding, `border-radius: 3px`
- Input line: pinned to bottom, underline style (`border-bottom: 1.5px solid`)

---

## 2. Entry Screen Layout

The entry screen has three vertical sections, all within the centred 680px container:

### 2.1 Top Bar
- `padding: 18px 32px`
- No bottom border
- Left: back button ("← VOS" with OS in Venture green `#00a071`, Outfit font, weight 700, letter-spacing 0.06em) + growthOS logo (`fontSize: 16, fontWeight: 700, letterSpacing: -0.04em` — "growth" in `fg`, "OS" in `accent`)
- Right: "Sign in" text link in `muted`, Source Serif 4

### 2.2 Intro Header (always visible, scrolls with chat)

**Headline:**
```
Introducing your AI marketing department.
42 employees, ready to work.
```
- `fontSize: 26`, `fontWeight: 300`, `letterSpacing: -0.02em`, `lineHeight: 1.4`
- "42 employees" in italic + accent colour
- ", ready to work." in muted
- `marginBottom: 20px`
- Animates in: `fade-up 0.6s ease 0.2s both`

**Team description prose:**
- `fontSize: 14`, `lineHeight: 2.2`, `color: muted`, `fontWeight: 400`
- Team members appear as inline badge-pills within the text flow
- Each badge: `display: inline-flex`, `padding: 3px 10px 3px 6px`, `borderRadius: 4`, `verticalAlign: middle`
- Watson's badge: accent-tinted background (`accent + 06` opacity), accent border (`accent + 18`), initial "W" in accent, name in accent, "CMO" label in muted DM Mono
- Other badges: cream background, border colour border, initial in muted, name in fg
- Prose reads: "Led by [Watson CMO badge] — with specialists including [Lead Gen Expert badge], [Campaign Manager badge], and [Administrator badge] — a full department that *works as your marketing team, or alongside your existing one*."
- Animates in: `fade-up 0.5s ease 0.5s both`

### 2.3 Vertical Margin Line
- Position: `absolute`, `left: 56px`, full height
- `width: 1px`, `background: marginLine + 88 (alpha)`
- Only visible in entry mode, removed in dashboard mode

---

## 3. Chat Interface

### 3.1 Message Types

**Agent messages:**
- Aligned left
- Background: `cream` (`#faf8f4`)
- Border: `1px solid border`
- Text: `fg`, `fontSize: 14`, `lineHeight: 1.7`
- `maxWidth: 80%`
- `borderRadius: 3px`
- `whiteSpace: pre-line` (preserves newlines in message text)

**User messages:**
- Aligned right
- Background: `fg` (`#1a1a18`)
- Text: `bg` (cream on dark)
- No border
- Same sizing as agent messages

**Status messages:**
- Not in a bubble — inline text
- `fontSize: 12`, `color: muted`, `fontStyle: italic`
- Left border: `2px solid border`, `paddingLeft: 14px`
- `fontFamily: DM Mono`

### 3.2 Agent Name Labels
- Appear above the first message in a consecutive run of agent messages
- Do NOT repeat for back-to-back agent messages
- Reappear after a user message or status message
- Style: `fontSize: 10`, `color: accent`, `fontWeight: 500`, `textTransform: uppercase`, `letterSpacing: 0.08em`, `fontFamily: DM Mono`, `marginBottom: 5px`

### 3.3 Timestamps
- Below every message bubble (agent and user)
- `fontSize: 10`, `color: muted + 88 (alpha)`, `marginTop: 4px`, `fontFamily: DM Mono`
- Generated with 3-second increments from page load time

### 3.4 Typing Indicator
- Three dots, `4px` diameter, `borderRadius: 50%`, `background: muted`
- Staggered pulse animation: `dot-pulse 1.2s ease-in-out` with 0.2s offset per dot
- `@keyframes dot-pulse { 0%,100%{opacity:.15} 50%{opacity:.6} }`

### 3.5 Clickable Options
- Appear inside the agent message bubble, below the text
- `marginTop: 14px`, horizontal flex wrap with `gap: 8px`
- Pill-shaped: `borderRadius: 100`, `padding: 8px 18px`
- Border: `1px solid border`, background: `bg`, text: `fg`
- Hover: border changes to `accent`, background to `#fff`
- `fontFamily: Source Serif 4`, `fontSize: 13`
- Options disappear after being clicked (tracked per-message index)

### 3.6 Input Line
- Pinned to bottom of viewport
- Entry mode: `padding: 16px 24px 32px 80px`
- Underline style: `border-bottom: 1.5px solid border` (darkens to `muted` on focus)
- `transition: border-color 0.3s ease`
- Input: `fontSize: 15`, `fontFamily: Source Serif 4`, no visible border/background
- Send button: only appears when text is entered, `color: accent`, `fontSize: 13`, `fontWeight: 600`, `fontFamily: DM Mono`, no background/border

---

## 4. Pre-Signup Message Flow

Messages are drip-fed with typing indicators between them. The initial sequence:

| # | From   | Text | Delay before typing starts |
|---|--------|------|---------------------------|
| 1 | Watson | "Hey 👋 how are you?" | 800ms initial pause |
| 2 | Watson | "I'm Watson — Chief Marketing Officer of GrowthOS..." | 1000ms |
| 3 | Watson | "Whether you need a full plug & play marketing department..." | 2400ms |
| 4 | Watson | "Want to get started or hear more?" + options | 2800ms |

Typing indicator shows for ~1200-1800ms before each agent message appears.

**"I want to hear more" path:**
- Watson explains the team in detail (single long message with newlines)
- Then offers "Let's get started" as a single option

**"Let's get started" path:**
- Triggers the dashboard transition (see section 5)

---

## 5. Dashboard Transition

When the user clicks "Let's get started", the UI transforms from the entry screen into the full dashboard. This is the key moment of the experience.

### What changes:

| Element | Entry Mode | Dashboard Mode | Transition |
|---------|-----------|---------------|------------|
| Left sidebar | `width: 0` | `width: 220px` | `0.7s cubic-bezier(0.16,1,0.3,1)` |
| Sidebar content opacity | `0` | `1` | `0.5s ease` with `0.4s delay` |
| Top bar | Simple (logo + sign in) | Full header (Watson status + nav) | `0.5s ease` |
| Top bar border-bottom | none | `1px solid border` | with padding transition |
| Margin line | Visible | Hidden | Conditional render |
| Intro header | Visible | Hidden | Conditional render |
| Chat padding-left | `80px` | `32px` | `0.7s ease` |
| Chat max-width | `680px` | `none` | `0.7s ease` |
| Input padding | `16px 24px 32px 80px` | `16px 32px 24px` | `0.7s ease` |
| Input max-width | `none` | `620px` centred | `0.7s ease` |
| Send button | Text only, appears on input | Always visible, pill style | Conditional render |

### Dashboard Left Sidebar Contents:
- growthOS logo (same style as top bar)
- "Team" label (DM Mono, uppercase, `fontSize: 10`, letter-spacing 0.12em)
- Agent list — each agent shows emoji, name, and "working" text underneath when active
- Watson highlighted with accent-tinted background
- Flex spacer
- Leads stat card: border, cream background, "Leads" label + count, progress bar when leads are found

### Dashboard Top Bar:
- Left: `◆` in accent + "Watson" (fontWeight 600) + "● Active" in green (`#4a8c5c`)
- Right: "Campaigns", "Analytics", "Settings" nav links (DM Mono, muted, hover to fg) + VOS back button

---

## 6. Animations Reference

```css
@keyframes fade-up { 
  from { opacity: 0; transform: translateY(14px); } 
  to { opacity: 1; transform: translateY(0); } 
}

@keyframes fade-in { 
  from { opacity: 0; } 
  to { opacity: 1; } 
}

@keyframes slide-right { 
  from { opacity: 0; transform: translateX(20px); } 
  to { opacity: 1; transform: translateX(0); } 
}

@keyframes dot-pulse { 
  0%, 100% { opacity: 0.15; } 
  50% { opacity: 0.6; } 
}
```

Primary easing: `cubic-bezier(0.16, 1, 0.3, 1)` — a spring-like overshoot curve used for sidebar, layout transitions.

---

## 7. Implementation Notes

- **The reference file** (`docs/reference/venture-demo.jsx`) uses inline styles throughout. When implementing in the existing Next.js app, convert to whatever styling approach is already in use (Tailwind, CSS modules, styled-components, etc.)
- **The entry screen and dashboard are the same component** with an `appMode` state ("entry" or "dashboard"). Do NOT implement these as separate pages/routes.
- **Message state is preserved** across the transition — the chat conversation continues seamlessly.
- **Agent statuses** are reactive — the Lead Gen Expert should show "working" in the sidebar when status messages reference them.
- **The intro header does NOT collapse or animate away** — it simply stops rendering when `appMode` switches to "dashboard". The chat messages stay in place.
- **Options are tracked per-message-index** using a Set, not a global boolean. This allows multiple rounds of options (e.g. "hear more" → second set of options).
- **Scrolling:** the intro header and chat messages share a single scroll container. The input is pinned outside the scroll area.

---

## 8. What NOT to Change

- Do not modify the existing chat/messaging infrastructure — this spec only covers the visual presentation layer
- Do not change how messages are sent to/received from the backend
- Do not modify authentication logic — just the UI for the pre-auth state
- Do not change the sidebar's lead review panel functionality — just restyle it to match

---

## 9. Files to Reference

- `docs/reference/venture-demo.jsx` — the complete working prototype (single file, ~900 lines)
- This document (`docs/DESIGN-SPEC.md`)

Start by reading both files, then audit the existing codebase to understand current component structure before making any changes.
