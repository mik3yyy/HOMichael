"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { COUNTRIES } from "@/lib/countries"
import { INDUSTRIES } from "@/lib/industries"

// ── Types ──────────────────────────────────────────────

type MemberInfo = {
  id: string; name: string; firstName: string
  tier: string; tierLevel: string; email: string
  referralCode: string; podCohort: number | null
}

type Stats = { totalMembers: number; activeCollabs: number; helpRequests: number; countries: number }

type PodMember = {
  id: string; firstName: string; name: string
  city: string | null; industry: string | null
  avatarUrl: string | null; checkedIn: boolean; isMe: boolean
}

type Post = {
  id: string; type: string; category: string; title: string; body: string
  tags: string; createdAt: string
  author: { id: string; firstName: string; city: string | null; tier: string; tierLevel: string }
  _count: { responses: number }
}

type DirectoryMember = {
  id: string; name: string; firstName: string; tier: string; tierLevel: string
  city: string | null; country: string | null; industry: string | null
  building: string | null; canHelpWith: string | null; lookingFor: string | null
  avatarUrl: string | null; linkedinUrl: string | null
}

type CheckInState = { lastWeek: string; thisWeek: string; blocker: string }

// ── Helpers ────────────────────────────────────────────

const SECTIONS = ["home","directory","pods","collab","helpme","feedback","owner","broadcast"] as const
type Section = (typeof SECTIONS)[number]

const TITLES: Record<Section, string> = {
  home: "Home", directory: "Directory", pods: "My Pod",
  collab: "Collab Board", helpme: "Help Me",
  feedback: "Shape the Future", owner: "Message the Owner",
  broadcast: "Send Email",
}

function tierLabel(tier: string, level: string) {
  if (level === "GOAT") return "◈ GOAT"
  if (level === "MJ") return "◈ MJ Tier"
  if (level === "MIKE") return "◈ Mike Tier"
  return tier === "MICHAEL" ? "◈ Michael Tier" : "◈ Inspired Tier"
}

function timeSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return "just now"
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function parseTags(tags: string): string[] {
  try { return JSON.parse(tags) } catch { return [] }
}

// ── Component ──────────────────────────────────────────

export default function DashboardClient({
  member,
  initialStats,
  initialRecentPosts,
  podMembers: initialPodMembers,
  myCheckIn: initialCheckIn,
  referralCount: initialReferralCount,
  baseUrl,
  directoryUnlocked,
  directoryDaysLeft,
  totalMembers,
  isOwner,
}: {
  member: MemberInfo
  initialStats: Stats
  initialRecentPosts: Post[]
  podMembers: PodMember[]
  myCheckIn: CheckInState | null
  referralCount: number
  baseUrl: string
  directoryUnlocked: boolean
  directoryDaysLeft: number
  totalMembers: number
  isOwner: boolean
}) {
  const [active, setActive] = useState<Section>("home")
  const [toast, setToast] = useState<{ title: string; body: string } | null>(null)
  const [modal, setModal] = useState<string | null>(null)

  // Directory state
  const [dirMembers, setDirMembers] = useState<DirectoryMember[]>([])
  const [dirTotal, setDirTotal] = useState(0)
  const [dirCursor, setDirCursor] = useState<string | null>(null)
  const [dirLoading, setDirLoading] = useState(false)
  const [dirSearch, setDirSearch] = useState("")
  const [dirIndustry, setDirIndustry] = useState("")
  const [dirTier, setDirTier] = useState("")
  const [dirCountry, setDirCountry] = useState("")
  const [dirCountrySearch, setDirCountrySearch] = useState("")
  const [dirCountryOpen, setDirCountryOpen] = useState(false)
  const searchTimer = useRef<NodeJS.Timeout>()

  // Posts state
  const [helpPosts, setHelpPosts] = useState<Post[]>([])
  const [collabPosts, setCollabPosts] = useState<Post[]>([])
  const [postsLoading, setPostsLoading] = useState(false)

  // Check-in state
  const [checkIn, setCheckIn] = useState<CheckInState>(
    initialCheckIn || { lastWeek: "", thisWeek: "", blocker: "" }
  )
  const [checkInSaving, setCheckInSaving] = useState(false)
  const [checkInDone, setCheckInDone] = useState(!!initialCheckIn)

  // Referral state
  const [referralCount] = useState(initialReferralCount)

  // New post form
  const [postForm, setPostForm] = useState({ category: "", title: "", body: "", tags: "" })
  const [postSaving, setPostSaving] = useState(false)

  // Broadcast
  const [broadcastForm, setBroadcastForm] = useState({ subject: "", body: "", audience: "all" })
  const [broadcastSending, setBroadcastSending] = useState(false)
  const [broadcastResult, setBroadcastResult] = useState<{ sent: number; total: number } | null>(null)

  // Feedback + votes
  const [feedbackForm, setFeedbackForm] = useState({ mustHave: "", referral: "", missing: "" })
  const [feedbackSaving, setFeedbackSaving] = useState(false)
  const [feedbackDone, setFeedbackDone] = useState(false)
  type FeatureItem = { key: string; label: string; votes: number; pct: number; voted: boolean }
  const [features, setFeatures] = useState<FeatureItem[]>([
    { key: "mobile-app",       label: "Mobile app (iOS + Android)",      votes: 0, pct: 73, voted: false },
    { key: "live-events",      label: "Live events and meetups",          votes: 0, pct: 61, voted: false },
    { key: "marketplace",      label: "Marketplace for services",         votes: 0, pct: 54, voted: false },
    { key: "resource-library", label: "Resource library and templates",   votes: 0, pct: 48, voted: false },
    { key: "mentorship",       label: "Mentorship pairing",               votes: 0, pct: 41, voted: false },
  ])

  // Owner message form
  const [ownerForm, setOwnerForm] = useState({ subject: "", message: "" })
  const [ownerSaving, setOwnerSaving] = useState(false)

  // Profile modal
  const [profileMember, setProfileMember] = useState<DirectoryMember | null>(null)

  // ── Data fetchers ──────────────────────────────────

  const fetchDirectory = useCallback(async (search: string, industry: string, tier: string, country: string, cursor?: string) => {
    setDirLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (industry) params.set("industry", industry)
    if (tier) params.set("tier", tier)
    if (country) params.set("country", country)
    if (cursor) params.set("cursor", cursor)
    const res = await fetch(`/api/members?${params}`)
    const data = await res.json()
    if (cursor) {
      setDirMembers((prev) => [...prev, ...data.members])
    } else {
      setDirMembers(data.members)
    }
    setDirTotal(data.total)
    setDirCursor(data.nextCursor)
    setDirLoading(false)
  }, [])

  const fetchPosts = useCallback(async (type: "HELPME" | "COLLAB") => {
    setPostsLoading(true)
    const res = await fetch(`/api/posts?type=${type}`)
    const data = await res.json()
    if (type === "HELPME") setHelpPosts(data)
    else setCollabPosts(data)
    setPostsLoading(false)
  }, [])

  // Load data when section activates
  useEffect(() => {
    if (active === "directory" && dirMembers.length === 0) {
      fetchDirectory("", "", "", "")
    }
    if (active === "helpme" && helpPosts.length === 0) {
      fetchPosts("HELPME")
    }
    if (active === "collab" && collabPosts.length === 0) {
      fetchPosts("COLLAB")
    }
  }, [active, dirMembers.length, helpPosts.length, collabPosts.length, fetchDirectory, fetchPosts])

  // Debounce directory search
  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      if (active === "directory") fetchDirectory(dirSearch, dirIndustry, dirTier, dirCountry)
    }, 350)
  }, [dirSearch, dirIndustry, dirTier, dirCountry, active, fetchDirectory])

  // ── Actions ────────────────────────────────────────

  function showToast(title: string, body: string) {
    setToast({ title, body })
    setTimeout(() => setToast(null), 3500)
  }

  async function submitCheckIn() {
    setCheckInSaving(true)
    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(checkIn),
    })
    setCheckInSaving(false)
    if (res.ok) {
      setCheckInDone(true)
      showToast("Check-in submitted", "Your pod has been notified. Stay accountable.")
    }
  }

  async function respondToPost(postId: string, fromSection: "HELPME" | "COLLAB") {
    const res = await fetch(`/api/posts/${postId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "" }),
    })
    if (res.ok) {
      showToast("Response sent", "They have been notified you can help.")
      // Update count
      const update = (posts: Post[]) =>
        posts.map((p) => p.id === postId
          ? { ...p, _count: { responses: p._count.responses + 1 } }
          : p)
      if (fromSection === "HELPME") setHelpPosts((p) => update(p))
      else setCollabPosts((p) => update(p))
    }
  }

  async function createPost(type: "HELPME" | "COLLAB") {
    if (!postForm.category || !postForm.title || !postForm.body) return
    setPostSaving(true)
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...postForm, type }),
    })
    if (res.ok) {
      const newPost = await res.json()
      if (type === "HELPME") setHelpPosts((p) => [newPost, ...p])
      else setCollabPosts((p) => [newPost, ...p])
      setModal(null)
      setPostForm({ category: "", title: "", body: "", tags: "" })
      showToast("Posted to the house", "Every member will see your request.")
    }
    setPostSaving(false)
  }

  async function sendOwnerMessage() {
    if (!ownerForm.subject || !ownerForm.message) return
    setOwnerSaving(true)
    await fetch("/api/owner-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ownerForm),
    })
    setOwnerSaving(false)
    setOwnerForm({ subject: "", message: "" })
    showToast("Message sent", "The founder will respond within 48 hours.")
  }

  // Load votes when feedback section becomes active
  useEffect(() => {
    if (active !== "feedback") return
    fetch("/api/votes").then((r) => r.json()).then((d) => {
      if (d.features) setFeatures(d.features)
    })
  }, [active])

  async function toggleVote(key: string) {
    const res = await fetch("/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feature: key }),
    })
    const data = await res.json()
    setFeatures((prev) => prev.map((f) =>
      f.key === key
        ? { ...f, voted: data.voted, votes: data.voted ? f.votes + 1 : f.votes - 1 }
        : f
    ))
  }

  async function submitFeedback() {
    if (!feedbackForm.mustHave && !feedbackForm.referral && !feedbackForm.missing) return
    setFeedbackSaving(true)
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(feedbackForm),
    })
    setFeedbackSaving(false)
    if (res.ok) {
      setFeedbackDone(true)
      showToast("Feedback submitted", "Your voice shapes what we build. Thank you.")
    }
  }

  // ── Computed ───────────────────────────────────────

  const tLabel = tierLabel(member.tier, member.tierLevel)
  const initials = member.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()

  const referralLink = `${baseUrl}/?ref=${member.referralCode}`
  const tierThresholds = [5, 10, 25]
  const nextThreshold = tierThresholds.find((t) => referralCount < t) ?? 25

  // ── Render ─────────────────────────────────────────

  return (
    <div className="app">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">House of<br />Michaels</div>
          <div className="logo-sub">Lifetime Member</div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section-label">Platform</div>
          {(["home","directory","pods","collab","helpme"] as Section[]).map((id) => (
            <div key={id} className={`nav-item${active === id ? " active" : ""}`} onClick={() => setActive(id)}>
              <span className="nav-icon">
                {id === "home" && "◈"}{id === "directory" && "⊞"}
                {id === "pods" && "◎"}{id === "collab" && "⟡"}{id === "helpme" && "◉"}
              </span>
              {TITLES[id]}
            </div>
          ))}
          <div className="nav-section-label">Your Voice</div>
          {(["feedback","owner"] as Section[]).map((id) => (
            <div key={id} className={`nav-item${active === id ? " active" : ""}`} onClick={() => setActive(id)}>
              <span className="nav-icon">{id === "feedback" ? "✦" : "◇"}</span>
              {TITLES[id]}
            </div>
          ))}
          {isOwner && (
            <div className={`nav-item${active === "broadcast" ? " active" : ""}`} onClick={() => setActive("broadcast")}>
              <span className="nav-icon">✉</span>
              Send Email
            </div>
          )}
        </nav>
        <div className="sidebar-user">
          <div className="user-avatar">{initials}</div>
          <div>
            <div className="user-name">{member.firstName}</div>
            <div className="user-tier">{tLabel}</div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">
        <div className="topbar">
          <div className="page-title">{TITLES[active]}</div>
          <div className="topbar-right">
            <span className="badge-tier">{tLabel}</span>
            <button className="btn btn-outline" onClick={() => setActive("helpme")} style={{ padding: "6px 14px", fontSize: 10 }}>+ Help Me</button>
            <button className="btn btn-ghost" onClick={() => signOut({ callbackUrl: "/" })} style={{ padding: "6px 14px", fontSize: 10 }}>Sign out</button>
          </div>
        </div>

        <div className="content">

          {/* ═══ HOME ═══ */}
          {active === "home" && (
            <div className="section active">
              <div className="welcome-banner">
                <div className="welcome-greeting">Welcome back, <span>{member.firstName}.</span></div>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, maxWidth: 480 }}>
                  You are part of something rare. Every Michael here is building.
                </p>
                <div className="tier-progress">
                  <div style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap", letterSpacing: "0.08em" }}>
                    REFERRALS → {member.tierLevel === "MEMBER" ? "MIKE" : member.tierLevel === "MIKE" ? "MJ" : "GOAT"}
                  </div>
                  <div className="tier-steps">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className={`tier-step${i < Math.min(referralCount, 5) ? " done" : ""}`} />
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--gold)", whiteSpace: "nowrap" }}>
                    {referralCount} of {nextThreshold} referrals
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid-4" style={{ marginBottom: 28 }}>
                {[
                  { num: initialStats.totalMembers, label: "Members worldwide" },
                  { num: initialStats.activeCollabs, label: "Active collab posts" },
                  { num: initialStats.helpRequests, label: "Help Me requests" },
                  { num: initialStats.countries || "—", label: "Countries" },
                ].map((s) => (
                  <div key={s.label} className="card" style={{ textAlign: "center" }}>
                    <div className="stat-num">{s.num}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid-2">
                {/* Pod check-in */}
                <div>
                  <div className="label">{directoryUnlocked ? "Your Pod — this week" : "Pods — opening August 10"}</div>
                  {!directoryUnlocked ? (
                    <div className="card-gold" style={{ padding: 24 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 12 }}>◎ Coming in {directoryDaysLeft} days</div>
                      <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.75, marginBottom: 12 }}>
                        Five Michaels. One mission. Weekly accountability that actually works. Your pod is being assembled — the people who will hold you to your goals are already in this house.
                      </p>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>
                        People have shipped products, closed deals, and broken through plateaus because someone in their pod held them to it. Yours is coming.
                      </p>
                    </div>
                  ) : checkInDone ? (
                    <div className="card" style={{ padding: 20, textAlign: "center" }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
                      <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Check-in submitted. Your pod sees it.</p>
                    </div>
                  ) : (
                    <>
                      {[
                        { key: "lastWeek" as const, n: "01", q: "What did you accomplish last week?", ph: "Be specific." },
                        { key: "thisWeek" as const, n: "02", q: "What is your #1 goal this week?", ph: "One goal only." },
                        { key: "blocker" as const, n: "03", q: "What is blocking you?", ph: "Be honest. Help comes from here." },
                      ].map((item) => (
                        <div key={item.n} className="checkin-card">
                          <div className="checkin-q">{item.n} — {item.q}</div>
                          <textarea
                            className="form-textarea"
                            placeholder={item.ph}
                            style={{ minHeight: 70 }}
                            value={checkIn[item.key]}
                            onChange={(e) => setCheckIn((c) => ({ ...c, [item.key]: e.target.value }))}
                          />
                        </div>
                      ))}
                      <button
                        className="btn btn-gold"
                        style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
                        onClick={submitCheckIn}
                        disabled={checkInSaving || !checkIn.lastWeek || !checkIn.thisWeek}
                      >
                        {checkInSaving ? "Submitting…" : "Submit Check-in"}
                      </button>
                    </>
                  )}
                </div>

                {/* Latest posts */}
                <div>
                  <div className="label">{directoryUnlocked ? "Latest from the house" : "What's coming August 10"}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {!directoryUnlocked && (
                      <div className="card" style={{ padding: 20 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 10 }}>⟡ Collab Board · ◉ Help Me</div>
                        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.75, marginBottom: 8 }}>Post opportunities, find co-founders, ask the house for help — all of it goes live on August 10.</p>
                        <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>Every Michael here will see your post. The right one always responds.</p>
                      </div>
                    )}
                    {directoryUnlocked && initialRecentPosts.length === 0 && (
                      <div className="card" style={{ padding: 16, textAlign: "center" }}>
                        <p style={{ fontSize: 12 }}>No posts yet. Be the first.</p>
                      </div>
                    )}
                    {directoryUnlocked && initialRecentPosts.map((post) => ( // eslint-disable-line
                      <div key={post.id} className="card" style={{ padding: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                          <div className="user-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                            {post.author.firstName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{post.author.firstName}</div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{post.author.city} · {timeSince(post.createdAt)}</div>
                          </div>
                          <span className="tag" style={{ marginLeft: "auto" }}>{post.type === "HELPME" ? "Help Me" : "Collab"}</span>
                        </div>
                        <p style={{ fontSize: 12 }}>{post.title}</p>
                        <button
                          className="btn btn-ghost"
                          style={{ marginTop: 10, padding: "6px 14px", fontSize: 10 }}
                          onClick={() => setActive(post.type === "HELPME" ? "helpme" : "collab")}
                        >
                          {post.type === "HELPME" ? "Respond →" : "View Post →"}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Referral link */}
                  <div style={{ marginTop: 16 }}>
                    <div className="label">Your referral link</div>
                    <div className="card" style={{ padding: 16 }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, letterSpacing: "0.03em" }}>
                        Share this link. For every member who joins, you earn referral credit toward higher tiers.
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          className="form-input"
                          readOnly
                          value={referralLink}
                          style={{ fontSize: 11, flex: 1 }}
                          onFocus={(e) => e.target.select()}
                        />
                        <button
                          className="btn btn-outline"
                          style={{ padding: "8px 12px", fontSize: 10, whiteSpace: "nowrap" }}
                          onClick={() => { navigator.clipboard.writeText(referralLink); showToast("Copied", "Referral link copied to clipboard.") }}
                        >
                          Copy
                        </button>
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 8 }}>
                        {referralCount} referral{referralCount !== 1 ? "s" : ""} · Next tier at {nextThreshold}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ DIRECTORY ═══ */}
          {active === "directory" && !directoryUnlocked && (
            <div className="section active">
              <div className="section-heading">The Directory</div>
              <div className="section-sub">Every Michael. One house. Verified members only.</div>

              <div className="card-gold" style={{ padding: 40, textAlign: "center", marginTop: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>Opening in</div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 10, marginBottom: 24 }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 96, fontWeight: 300, color: "var(--gold)", lineHeight: 1 }}>{directoryDaysLeft}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)" }}>days</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 20 }}>10 August 2026</div>

                <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.8, maxWidth: 560, margin: "0 auto 28px" }}>
                  When this opens, you will be standing in the most concentrated room of ambitious, talented, and driven people named Michael on the planet.
                  Founders. Investors. Athletes. Musicians. Builders. Every one of them verified. Every one of them building something real.
                  Your next co-founder is in here. Your next client. Your next investor. You just can&apos;t see them yet.
                </p>

                <div style={{ maxWidth: 420, margin: "0 auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>{totalMembers.toLocaleString()}+ members</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Goal: 2,000</span>
                  </div>
                  <div style={{ height: 4, background: "var(--bg4)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, (totalMembers / 2000) * 100)}%`, background: "linear-gradient(90deg, var(--gold), var(--gold-light))", borderRadius: 2 }} />
                  </div>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10, lineHeight: 1.6 }}>
                    {(2000 - totalMembers).toLocaleString()} founding spots remaining. Once we hit 2,000 the founding rate closes forever.
                  </p>
                </div>
              </div>
            </div>
          )}

          {active === "directory" && directoryUnlocked && (
            <div className="section active">
              <div className="section-heading">The Directory</div>
              <div className="section-sub">Every Michael. One house. Verified members only.</div>

              <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
                <input
                  className="form-input"
                  style={{ flex: 1, minWidth: 200 }}
                  placeholder="Search by name, industry, city…"
                  value={dirSearch}
                  onChange={(e) => setDirSearch(e.target.value)}
                />
                <select className="form-select" style={{ width: 160 }} value={dirIndustry} onChange={(e) => setDirIndustry(e.target.value)}>
                  <option value="">All industries</option>
                  {INDUSTRIES.map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
                <select className="form-select" style={{ width: 140 }} value={dirTier} onChange={(e) => setDirTier(e.target.value)}>
                  <option value="">All tiers</option>
                  <option value="michael">Michael</option>
                  <option value="inspired">Inspired</option>
                  <option value="mike">Mike</option>
                  <option value="mj">MJ</option>
                  <option value="goat">GOAT</option>
                </select>
                {/* Country combobox — type to filter, select from list */}
                <div style={{ position: "relative", width: 180 }}>
                  <input
                    className="form-input"
                    placeholder="All countries…"
                    value={dirCountryOpen ? dirCountrySearch : dirCountry}
                    autoComplete="off"
                    onFocus={() => { setDirCountryOpen(true); setDirCountrySearch("") }}
                    onChange={(e) => { setDirCountrySearch(e.target.value); setDirCountryOpen(true) }}
                    onBlur={() => setTimeout(() => setDirCountryOpen(false), 150)}
                  />
                  {dirCountryOpen && (
                    <div style={{
                      position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200,
                      background: "var(--bg2)", border: "1px solid var(--border)",
                      borderRadius: 4, maxHeight: 260, overflowY: "auto", marginTop: 2,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    }}>
                      <div
                        onMouseDown={() => { setDirCountry(""); setDirCountryOpen(false) }}
                        style={{ padding: "9px 14px", fontSize: 12, cursor: "pointer", color: "var(--text-muted)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg3)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        All countries
                      </div>
                      {COUNTRIES.filter((c) =>
                        c.toLowerCase().includes(dirCountrySearch.toLowerCase())
                      ).map((c) => (
                        <div
                          key={c}
                          onMouseDown={() => { setDirCountry(c); setDirCountrySearch(c); setDirCountryOpen(false) }}
                          style={{
                            padding: "9px 14px", fontSize: 13, cursor: "pointer",
                            background: dirCountry === c ? "var(--bg3)" : "transparent",
                            color: dirCountry === c ? "var(--gold)" : "var(--text)",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg3)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = dirCountry === c ? "var(--bg3)" : "transparent")}
                        >
                          {c}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {dirLoading && dirMembers.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading…</p>
              ) : dirMembers.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No members found.</p>
              ) : (
                <>
                  <div className="grid-3">
                    {dirMembers.map((m) => (
                      <div key={m.id} className="member-card" onClick={() => setProfileMember(m)}>
                        <div className="member-avatar">
                          {m.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.avatarUrl} alt={m.name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                          ) : (
                            m.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="member-name">{m.name}</div>
                        <div className="member-role">
                          {m.industry}{m.city ? ` · ${m.city}` : ""}
                        </div>
                        <div className="member-tags">
                          <span className="tag tag-gold">{tierLabel(m.tier, m.tierLevel)}</span>
                          {(m.canHelpWith || "").split(",").slice(0, 2).filter(Boolean).map((t) => (
                            <span key={t} className="tag">{t.trim()}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {dirCursor && (
                    <div style={{ textAlign: "center", marginTop: 24 }}>
                      <button className="btn btn-ghost" onClick={() => fetchDirectory(dirSearch, dirIndustry, dirTier, dirCountry, dirCursor)} disabled={dirLoading}>
                        {dirLoading ? "Loading…" : `Load more · ${dirTotal - dirMembers.length} remaining`}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ═══ PODS ═══ */}
          {active === "pods" && !directoryUnlocked && (
            <div className="section active">
              <div className="section-heading">Your Pod</div>
              <div className="section-sub">Five Michaels. One mission. Your pod is being assembled.</div>
              <div className="card-gold" style={{ padding: 40, textAlign: "center", marginTop: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>Pods open in</div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 96, fontWeight: 300, color: "var(--gold)", lineHeight: 1 }}>{directoryDaysLeft}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)" }}>days</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 28 }}>10 August 2026</div>
                <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.8, maxWidth: 540, margin: "0 auto 20px" }}>
                  Think about the five most driven people you know. Now imagine five more — all builders, all moving, all accountable to each other every single week. That is a pod.
                </p>
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.8, maxWidth: 540, margin: "0 auto" }}>
                  People in this house have shipped products, closed deals, and broken through their biggest blockers because someone in their pod held them to it. No audience. No performance. Just five people who genuinely want to see each other win. Your five are already in this house. You just have not met them yet.
                </p>
              </div>
            </div>
          )}

          {active === "pods" && directoryUnlocked && (
            <div className="section active">
              <div className="section-heading">Your Pod</div>
              <div className="section-sub">
                {member.podCohort ? `Cohort ${member.podCohort} · ` : ""}Five Michaels. One mission. Weekly accountability.
              </div>

              {initialPodMembers.length === 0 ? (
                <div className="card" style={{ padding: 24 }}>
                  <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
                    You&apos;ll be assigned to a pod automatically once more members join.
                  </p>
                </div>
              ) : (
                <div className="grid-2" style={{ marginBottom: 24 }}>
                  <div className="card-gold">
                    <div className="label">Pod members</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                      {initialPodMembers.map((p) => (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div className="user-avatar" style={{ width: 36, height: 36 }}>
                            {p.avatarUrl
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={p.avatarUrl} alt={p.name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                              : p.firstName.slice(0, 2).toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: p.isMe ? "var(--gold)" : "var(--text)" }}>
                              {p.isMe ? `${p.firstName} (you)` : p.firstName}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                              {[p.city, p.industry].filter(Boolean).join(" · ")}
                            </div>
                          </div>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.checkedIn ? "var(--green)" : "var(--text-dim)" }} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div className="card">
                      <div className="label">This week&apos;s check-ins</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                        {initialPodMembers.map((p) => (
                          <div key={p.id} style={{ flex: 1, height: 32, background: p.checkedIn ? "var(--gold)" : "var(--bg4)", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: p.checkedIn ? "#080808" : "var(--text-muted)" }}>
                            {p.firstName.slice(0, 2).toUpperCase()} {p.checkedIn ? "✓" : "—"}
                          </div>
                        ))}
                      </div>
                      <button className="btn btn-gold" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} onClick={() => setActive("home")}>
                        {checkInDone ? "View check-in →" : "Submit Check-in"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ COLLAB ═══ */}
          {active === "collab" && !directoryUnlocked && (
            <div className="section active">
              <div className="section-heading">Collab Board</div>
              <div className="section-sub">Co-founders. Skills. Partners. All Michaels. All trusted.</div>
              <div className="card-gold" style={{ padding: 40, textAlign: "center", marginTop: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>Opens in</div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 96, fontWeight: 300, color: "var(--gold)", lineHeight: 1 }}>{directoryDaysLeft}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)" }}>days</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 28 }}>10 August 2026</div>
                <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.8, maxWidth: 540, margin: "0 auto 20px" }}>
                  This is where deals start. Post an opportunity — co-founder search, skills needed, investor intro, partnership inquiry. Every Michael in the house sees it.
                </p>
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.8, maxWidth: 540, margin: "0 auto" }}>
                  The collab board is not LinkedIn. There is no noise, no cold pitches, no recruiters. Only Michaels posting real opportunities for other Michaels. Trusted from day one.
                </p>
              </div>
            </div>
          )}

          {active === "collab" && directoryUnlocked && (
            <div className="section active">
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
                <div className="section-heading">Collab Board</div>
                <button className="btn btn-gold" onClick={() => setModal("collab")}>+ Post Opportunity</button>
              </div>
              <div className="section-sub">Co-founders. Skills. Partners. All Michaels. All trusted.</div>

              {postsLoading ? (
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading…</p>
              ) : collabPosts.length === 0 ? (
                <div className="card" style={{ padding: 24, textAlign: "center" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No posts yet. Post the first opportunity.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {collabPosts.map((post) => (
                    <div key={post.id} className="collab-card">
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                            {post.author.firstName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                              {post.author.firstName}{post.author.city ? ` · ${post.author.city}` : ""}
                            </div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{tierLabel(post.author.tier, post.author.tierLevel)}</div>
                          </div>
                        </div>
                        <span className="tag">{post.category.replace(/_/g, " ")}</span>
                      </div>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{post.title}</h3>
                      <p style={{ fontSize: 12, marginBottom: 14 }}>{post.body}</p>
                      {parseTags(post.tags).length > 0 && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                          {parseTags(post.tags).map((t) => <span key={t} className="tag">{t}</span>)}
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                          ↩ {post._count.responses} response{post._count.responses !== 1 ? "s" : ""} · {timeSince(post.createdAt)}
                        </span>
                        {post.author.id !== member.id && (
                          <button className="btn btn-outline" style={{ padding: "7px 16px", fontSize: 10 }} onClick={() => respondToPost(post.id, "COLLAB")}>
                            I&apos;m interested →
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ HELP ME ═══ */}
          {active === "helpme" && !directoryUnlocked && (
            <div className="section active">
              <div className="section-heading">Help Me</div>
              <div className="section-sub">Make an announcement. The house responds. That&apos;s how this works.</div>
              <div className="card-gold" style={{ padding: 40, textAlign: "center", marginTop: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>Opens in</div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 96, fontWeight: 300, color: "var(--gold)", lineHeight: 1 }}>{directoryDaysLeft}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)" }}>days</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 28 }}>10 August 2026</div>
                <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.8, maxWidth: 540, margin: "0 auto 20px" }}>
                  One post. Every Michael in the house sees it. The right one always responds.
                </p>
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.8, maxWidth: 540, margin: "0 auto" }}>
                  Need a warm intro? A skill? Funding? Advice? Post it. This is a house of builders — someone in here has exactly what you need, and they are looking for a reason to help. Give them one.
                </p>
              </div>
            </div>
          )}

          {active === "helpme" && directoryUnlocked && (
            <div className="section active">
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
                <div className="section-heading">Help Me</div>
                <button className="btn btn-gold" onClick={() => setModal("helpme")}>+ Post Request</button>
              </div>
              <div className="section-sub">Make an announcement. The house responds. That&apos;s how this works.</div>

              {postsLoading ? (
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading…</p>
              ) : helpPosts.length === 0 ? (
                <div className="card" style={{ padding: 24, textAlign: "center" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No requests yet. Be the first to ask for help.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {helpPosts.map((post) => {
                    const catClass = { NETWORK: "network", SKILL: "skill", FUNDING: "funding", COLLAB: "collab" }[post.category] || "network"
                    return (
                      <div key={post.id} className="help-card">
                        <span className={`help-type ${catClass}`}>{post.category}</span>
                        <div className="help-title">{post.title}</div>
                        <div className="help-body">{post.body}</div>
                        <div className="help-footer">
                          <span className="help-author">
                            {post.author.firstName}{post.author.city ? ` · ${post.author.city}` : ""} · {timeSince(post.createdAt)}
                          </span>
                          <span className="responses">↩ {post._count.responses} response{post._count.responses !== 1 ? "s" : ""}</span>
                        </div>
                        {post.author.id !== member.id && (
                          <button className="btn btn-ghost" style={{ marginTop: 12, padding: "6px 14px", fontSize: 10 }} onClick={() => respondToPost(post.id, "HELPME")}>
                            I can help →
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══ FEEDBACK ═══ */}
          {active === "feedback" && (
            <div className="section active">
              <div className="section-heading">Shape the Future</div>
              <div className="section-sub">This house belongs to every Michael in it. Tell us where it goes next.</div>

              <div className="grid-2">
                <div>
                  <div className="card-gold" style={{ marginBottom: 16 }}>
                    <div className="label">Where do you want this house to be in 6 months?</div>
                    <p style={{ fontSize: 12, marginBottom: 16 }}>Your answer shapes the roadmap.</p>

                    {feedbackDone ? (
                      <div style={{ textAlign: "center", padding: "20px 0" }}>
                        <div style={{ fontSize: 28, marginBottom: 10 }}>✓</div>
                        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Received. Your voice shapes what we build.</p>
                      </div>
                    ) : (
                      <>
                        {[
                          { key: "mustHave" as const, label: "What's the one thing this platform must have?", ph: "Be specific. Be bold. We're listening." },
                          { key: "referral" as const, label: "What would make you refer 3 friends immediately?", ph: "What would make this a no-brainer?" },
                          { key: "missing" as const, label: "What do you think is missing right now?", ph: "Don't hold back." },
                        ].map((f) => (
                          <div key={f.key} style={{ marginBottom: 18 }}>
                            <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>{f.label}</label>
                            <textarea
                              className="form-textarea"
                              placeholder={f.ph}
                              value={feedbackForm[f.key]}
                              onChange={(e) => setFeedbackForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                            />
                          </div>
                        ))}
                        <button
                          className="btn btn-gold"
                          style={{ width: "100%", justifyContent: "center" }}
                          onClick={submitFeedback}
                          disabled={feedbackSaving || (!feedbackForm.mustHave && !feedbackForm.referral && !feedbackForm.missing)}
                        >
                          {feedbackSaving ? "Sending…" : "Submit Feedback"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <div className="label">Community votes — next features</div>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>Click to vote. You can change your vote anytime.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {features.map((v) => (
                      <div
                        key={v.key}
                        className="card"
                        style={{ padding: 16, cursor: "pointer", border: v.voted ? "1px solid var(--gold)" : undefined, transition: "border 0.2s" }}
                        onClick={() => toggleVote(v.key)}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {v.voted && <span style={{ fontSize: 10, color: "var(--gold)" }}>◈</span>}
                            <div style={{ fontSize: 13, fontWeight: 700, color: v.voted ? "var(--gold)" : "var(--text)" }}>{v.label}</div>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--gold)", whiteSpace: "nowrap" }}>{v.votes} vote{v.votes !== 1 ? "s" : ""}</div>
                        </div>
                        <div className="streak-bar">
                          <div className="streak-fill" style={{ width: `${Math.max(v.pct, 3)}%`, background: v.voted ? "var(--gold)" : undefined }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ OWNER ═══ */}
          {active === "owner" && (
            <div className="section active">
              <div className="section-heading">Message the Owner</div>
              <div className="section-sub">Direct line. No filters. Say what you need to say.</div>

              <div className="grid-2">
                <div>
                  <div className="card-gold" style={{ marginBottom: 16, padding: 20 }}>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 300, color: "var(--text)", lineHeight: 1.6, marginBottom: 12 }}>
                      &ldquo;I can accept failure, everyone fails at something. But I can&apos;t accept not trying.&rdquo;
                    </p>
                    <div style={{ fontSize: 11, color: "var(--gold)", letterSpacing: "0.1em" }}>— Michael Jordan</div>
                  </div>

                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>Subject</label>
                    <input className="form-input" placeholder="What's this about?" value={ownerForm.subject} onChange={(e) => setOwnerForm((f) => ({ ...f, subject: e.target.value }))} />
                  </div>
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>Your message</label>
                    <textarea className="form-textarea" style={{ minHeight: 140 }} placeholder="Say what you need to say. This goes directly to the founder." value={ownerForm.message} onChange={(e) => setOwnerForm((f) => ({ ...f, message: e.target.value }))} />
                  </div>
                  <button className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }} onClick={sendOwnerMessage} disabled={ownerSaving || !ownerForm.subject || !ownerForm.message}>
                    {ownerSaving ? "Sending…" : "Send Message"}
                  </button>
                </div>

                <div>
                  <div className="label">About this line</div>
                  <div className="card" style={{ padding: 16 }}>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>
                      This message goes directly to the founder&apos;s inbox. Use it for ideas, problems, partnership inquiries, or anything you think the house needs. Expect a reply within 48 hours.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ BROADCAST ═══ */}
          {active === "broadcast" && isOwner && (
            <div className="section active">
              <div className="section-heading">Send Email</div>
              <div className="section-sub">Write once. Reach every Michael in the house.</div>

              <div className="grid-2">
                <div>
                  <div className="card" style={{ padding: 24 }}>
                    <div style={{ marginBottom: 18 }}>
                      <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>Audience</label>
                      <select
                        className="form-select"
                        value={broadcastForm.audience}
                        onChange={(e) => setBroadcastForm((f) => ({ ...f, audience: e.target.value }))}
                      >
                        <option value="all">All members</option>
                        <option value="michael">Michael Tier only</option>
                        <option value="inspired">Inspired Tier only</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: 18 }}>
                      <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>Subject line</label>
                      <input
                        className="form-input"
                        placeholder="What's this about?"
                        value={broadcastForm.subject}
                        onChange={(e) => setBroadcastForm((f) => ({ ...f, subject: e.target.value }))}
                      />
                    </div>

                    <div style={{ marginBottom: 18 }}>
                      <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                        Message
                        <span style={{ fontWeight: 400, letterSpacing: "0.05em", textTransform: "none", marginLeft: 8, fontSize: 9 }}>
                          Use {"{{name}}"} to personalise with each member&apos;s name. Blank lines = new paragraph.
                        </span>
                      </label>
                      <textarea
                        className="form-textarea"
                        style={{ minHeight: 200 }}
                        placeholder={"Hey {{name}},\n\nSomething exciting is happening in the house...\n\nStay locked in."}
                        value={broadcastForm.body}
                        onChange={(e) => setBroadcastForm((f) => ({ ...f, body: e.target.value }))}
                      />
                    </div>

                    {broadcastResult && (
                      <div style={{ padding: "12px 16px", background: "rgba(126,200,126,0.08)", border: "1px solid rgba(126,200,126,0.2)", borderRadius: 3, marginBottom: 16 }}>
                        <p style={{ fontSize: 13, color: "var(--green)", margin: 0 }}>
                          ✓ Sent to {broadcastResult.sent} of {broadcastResult.total} members
                        </p>
                      </div>
                    )}

                    <button
                      className="btn btn-gold"
                      style={{ width: "100%", justifyContent: "center" }}
                      disabled={broadcastSending || !broadcastForm.subject || !broadcastForm.body}
                      onClick={async () => {
                        if (!confirm(`Send "${broadcastForm.subject}" to ${broadcastForm.audience === "all" ? "all" : broadcastForm.audience} members?`)) return
                        setBroadcastSending(true)
                        setBroadcastResult(null)
                        try {
                          const res = await fetch("/api/broadcast", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(broadcastForm),
                          })
                          const data = await res.json()
                          if (res.ok) {
                            setBroadcastResult(data)
                            setBroadcastForm((f) => ({ ...f, subject: "", body: "" }))
                          } else {
                            showToast("Error", data.error || "Something went wrong")
                          }
                        } finally {
                          setBroadcastSending(false)
                        }
                      }}
                    >
                      {broadcastSending ? "Sending…" : "Send Email"}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="label">Tips</div>
                  <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {[
                        ["{{name}}", "Replaced with each member's first name automatically"],
                        ["Blank line", "Creates a new paragraph in the email"],
                        ["Keep it short", "2–4 paragraphs. Members read on mobile."],
                        ["One CTA", "The email already has an 'Open the house' button at the bottom"],
                        ["Test first", "Send to yourself by setting audience to a tier with only you in it"],
                      ].map(([tip, desc]) => (
                        <div key={tip}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)", marginBottom: 4 }}>{tip}</div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>{desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* TOAST */}
      {toast && (
        <div className="toast show">
          <div className="toast-title">{toast.title}</div>
          <div>{toast.body}</div>
        </div>
      )}

      {/* MEMBER PROFILE MODAL */}
      {profileMember && (
        <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && setProfileMember(null)}>
          <div className="modal">
            <button className="modal-close" onClick={() => setProfileMember(null)}>✕</button>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <div className="user-avatar" style={{ width: 56, height: 56, fontSize: 20 }}>
                {profileMember.avatarUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={profileMember.avatarUrl} alt={profileMember.name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                  : profileMember.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="modal-title" style={{ marginBottom: 2 }}>{profileMember.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {[profileMember.city, profileMember.country].filter(Boolean).join(", ")}
                  {profileMember.industry ? ` · ${profileMember.industry}` : ""}
                </div>
              </div>
            </div>
            <div className="gold-line" />
            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div><div className="label">Tier</div><span className="tag tag-gold">{tierLabel(profileMember.tier, profileMember.tierLevel)}</span></div>
            </div>
            {profileMember.building && (
              <div style={{ marginBottom: 16 }}>
                <div className="label">Building</div>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{profileMember.building}</p>
              </div>
            )}
            {profileMember.canHelpWith && (
              <div style={{ marginBottom: 16 }}>
                <div className="label">Can help with</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {profileMember.canHelpWith.split(",").map((t) => <span key={t} className="tag">{t.trim()}</span>)}
                </div>
              </div>
            )}
            {profileMember.lookingFor && (
              <div style={{ marginBottom: 16 }}>
                <div className="label">Looking for</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {profileMember.lookingFor.split(",").map((t) => <span key={t} className="tag">{t.trim()}</span>)}
                </div>
              </div>
            )}
            <div className="gold-line" />
            <div style={{ display: "flex", gap: 10 }}>
              <Link
                href={`/members/${profileMember.id}`}
                className="btn btn-gold"
                style={{ flex: 1, justifyContent: "center" }}
              >
                Full Profile →
              </Link>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setProfileMember(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* POST MODAL */}
      {(modal === "helpme" || modal === "collab") && (
        <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            <div className="modal-title">{modal === "helpme" ? "Post a Help Me" : "Post to Collab Board"}</div>
            <div className="modal-sub">{modal === "helpme" ? "Make an announcement. The house responds." : "Co-founders. Talent. Partners. All trusted."}</div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                {modal === "helpme" ? "What kind of help?" : "Opportunity type"}
              </label>
              <select className="form-select" value={postForm.category} onChange={(e) => setPostForm((f) => ({ ...f, category: e.target.value }))}>
                <option value="">Select…</option>
                {modal === "helpme"
                  ? [["NETWORK","Network / Introduction"],["SKILL","Skill / Expertise"],["FUNDING","Funding / Investment"],["COLLAB","Collab / Partnership"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)
                  : [["COFOUNDER","Co-founder search"],["SKILLS","Skills needed (paid)"],["INVESTOR","Investor connection"],["PARTNERSHIP","Partnership / JV"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                {modal === "helpme" ? "Headline" : "Title"}
              </label>
              <input className="form-input" placeholder={modal === "helpme" ? "I need a warm intro to…" : "Looking for a…"} value={postForm.title} onChange={(e) => setPostForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>Details</label>
              <textarea className="form-textarea" placeholder="Give enough detail that the right Michael can say yes immediately." value={postForm.body} onChange={(e) => setPostForm((f) => ({ ...f, body: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>Tags <span style={{ fontWeight: 400, letterSpacing: "0.05em", textTransform: "none", fontSize: 9 }}>(comma separated)</span></label>
              <input className="form-input" placeholder="Design, SaaS, Africa, Equity…" value={postForm.tags} onChange={(e) => setPostForm((f) => ({ ...f, tags: e.target.value }))} />
            </div>

            <button
              className="btn btn-gold"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => createPost(modal === "helpme" ? "HELPME" : "COLLAB")}
              disabled={postSaving || !postForm.category || !postForm.title || !postForm.body}
            >
              {postSaving ? "Posting…" : modal === "helpme" ? "Post Request" : "Publish Post"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
