"use client"
import { useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import styles from "./page.module.css"
import { COUNTRIES } from "@/lib/countries"
import { INDUSTRIES } from "@/lib/industries"
import { BUILDING_OPTIONS, HELP_TAGS } from "@/lib/profile-options"

function MultiSelect({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string
  onChange: (val: string) => void
}) {
  const selected = value ? value.split(",").map((s) => s.trim()).filter(Boolean) : []

  function toggle(opt: string) {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt).join(", "))
    } else {
      onChange([...selected, opt].join(", "))
    }
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
        {options.map((opt) => {
          const active = selected.includes(opt)
          return (
            <div
              key={opt}
              onClick={() => toggle(opt)}
              style={{
                padding: "7px 13px",
                borderRadius: 3,
                border: `1px solid ${active ? "var(--gold)" : "var(--border-dim)"}`,
                background: active ? "var(--gold-dim)" : "var(--bg3)",
                color: active ? "var(--gold)" : "var(--text-muted)",
                fontSize: 12,
                cursor: "pointer",
                userSelect: "none",
                transition: "all 0.15s",
              }}
            >
              {opt}
            </div>
          )
        })}
      </div>
      {selected.length > 0 && (
        <p style={{ fontSize: 10, color: "var(--gold)", marginTop: 8, letterSpacing: "0.06em" }}>
          {selected.length} selected
        </p>
      )}
    </div>
  )
}

export default function ProfileForm({
  firstName,
  tier,
}: {
  firstName: string
  tier: string
}) {
  const router = useRouter()
  const { update } = useSession()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [buildingType, setBuildingType] = useState("")
  const [countrySearch, setCountrySearch] = useState("")
  const [countryOpen, setCountryOpen] = useState(false)
  const countryRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    city: "",
    country: "",
    industry: "",
    bio: "",
    building: "",
    canHelpWith: "",
    lookingFor: "",
    linkedinUrl: "",
    avatarUrl: "",
  })

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit() {
    setSaving(true)
    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      await update() // refresh JWT with profileComplete: true
      router.push("/dashboard")
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className={styles.card}>
      {/* Progress */}
      <div className={styles.progress}>
        {[1, 2, 3].map((n) => (
          <div key={n} className={`${styles.progressStep}${step >= n ? ` ${styles.done}` : ""}`} />
        ))}
      </div>

      {step === 1 && (
        <>
          <div className={styles.stepLabel}>Step 1 of 3 — Where are you?</div>
          <h2 className={styles.stepHeading}>Tell the house where you are.</h2>

          <div className={styles.field}>
            <label>City</label>
            <input
              className="form-input"
              placeholder="Lagos, London, Miami…"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label>Country</label>
            <div ref={countryRef} style={{ position: "relative" }}>
              <input
                className="form-input"
                placeholder="Search country…"
                value={countryOpen ? countrySearch : form.country}
                autoComplete="off"
                onFocus={() => { setCountryOpen(true); setCountrySearch("") }}
                onChange={(e) => { setCountrySearch(e.target.value); setCountryOpen(true) }}
                onBlur={() => setTimeout(() => {
                  setCountryOpen(false)
                  if (!COUNTRIES.includes(countrySearch) && countrySearch) setCountrySearch("")
                }, 150)}
              />
              {countryOpen && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200,
                  background: "var(--bg2)", border: "1px solid var(--border)",
                  borderRadius: 4, maxHeight: 220, overflowY: "auto", marginTop: 2,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                }}>
                  {COUNTRIES.filter((c) =>
                    c.toLowerCase().includes(countrySearch.toLowerCase())
                  ).length === 0 ? (
                    <div style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-muted)" }}>No countries found</div>
                  ) : COUNTRIES.filter((c) =>
                    c.toLowerCase().includes(countrySearch.toLowerCase())
                  ).map((c) => (
                    <div
                      key={c}
                      onMouseDown={() => { set("country", c); setCountrySearch(c); setCountryOpen(false) }}
                      style={{
                        padding: "9px 14px", fontSize: 13, cursor: "pointer",
                        background: form.country === c ? "var(--bg3)" : "transparent",
                        color: form.country === c ? "var(--gold)" : "var(--text)",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg3)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = form.country === c ? "var(--bg3)" : "transparent")}
                    >
                      {c}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className={styles.field}>
            <label>Industry</label>
            <select
              className="form-select"
              value={form.industry}
              onChange={(e) => set("industry", e.target.value)}
            >
              <option value="">Select industry…</option>
              {INDUSTRIES.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label>Short bio <span className={styles.optional}>(optional)</span></label>
            <textarea
              className="form-textarea"
              placeholder="One or two lines about you."
              style={{ minHeight: 80 }}
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
            />
          </div>

          <button
            className={`btn btn-gold ${styles.nextBtn}`}
            onClick={() => setStep(2)}
            disabled={!form.city || !form.country || !form.industry}
          >
            Continue →
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <div className={styles.stepLabel}>Step 2 of 3 — What are you about?</div>
          <h2 className={styles.stepHeading}>Tell the house what you&apos;re building.</h2>

          <div className={styles.field}>
            <label>What are you building?</label>
            <select
              className="form-select"
              value={buildingType}
              onChange={(e) => {
                const val = e.target.value
                setBuildingType(val)
                if (val !== "Other") set("building", val)
                else set("building", "")
              }}
            >
              <option value="">Select…</option>
              {BUILDING_OPTIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
            {buildingType === "Other" && (
              <input
                className="form-input"
                style={{ marginTop: 10 }}
                placeholder="Describe what you're building…"
                value={form.building}
                onChange={(e) => set("building", e.target.value)}
                autoFocus
              />
            )}
          </div>

          <div className={styles.field}>
            <label>What can you help other Michaels with?</label>
            <p className={styles.hint} style={{ marginBottom: 6 }}>Select all that apply</p>
            <MultiSelect
              options={HELP_TAGS}
              value={form.canHelpWith}
              onChange={(val) => set("canHelpWith", val)}
            />
          </div>

          <div className={styles.field}>
            <label>What are you looking for?</label>
            <p className={styles.hint} style={{ marginBottom: 6 }}>Select all that apply</p>
            <MultiSelect
              options={HELP_TAGS}
              value={form.lookingFor}
              onChange={(val) => set("lookingFor", val)}
            />
          </div>

          <div className={styles.btnRow}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
            <button
              className="btn btn-gold"
              onClick={() => setStep(3)}
              disabled={!form.building}
            >
              Continue →
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className={styles.stepLabel}>Step 3 of 3 — Optional links</div>
          <h2 className={styles.stepHeading}>Help Michaels find you.</h2>

          <div className={styles.field}>
            <label>LinkedIn URL <span className={styles.optional}>(optional)</span></label>
            <input
              className="form-input"
              placeholder="https://linkedin.com/in/yourname"
              value={form.linkedinUrl}
              onChange={(e) => set("linkedinUrl", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label>Profile photo URL <span className={styles.optional}>(optional)</span></label>
            <input
              className="form-input"
              placeholder="https://… (paste a photo URL)"
              value={form.avatarUrl}
              onChange={(e) => set("avatarUrl", e.target.value)}
            />
            <p className={styles.hint}>You can use your LinkedIn or Twitter photo URL</p>
          </div>

          <div className={styles.btnRow}>
            <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
            <button
              className={`btn btn-gold ${styles.submitBtn}`}
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? "Entering…" : "Enter the House →"}
            </button>
          </div>

          <p
            className={styles.skip}
            onClick={handleSubmit}
          >
            Skip for now
          </p>
        </>
      )}
    </div>
  )
}
