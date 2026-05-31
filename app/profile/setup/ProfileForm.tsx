"use client"
import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import styles from "./page.module.css"

const INDUSTRIES = [
  "Tech", "Finance", "Creative", "Health", "Property",
  "Education", "Consulting", "Media", "Legal", "E-commerce", "Other",
]

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
            <input
              className="form-input"
              placeholder="Nigeria, UK, USA…"
              value={form.country}
              onChange={(e) => set("country", e.target.value)}
            />
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
            <textarea
              className="form-textarea"
              placeholder="Describe your project, company, or goal."
              style={{ minHeight: 90 }}
              value={form.building}
              onChange={(e) => set("building", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label>What can you help other Michaels with?</label>
            <input
              className="form-input"
              placeholder="Design, Fundraising, Legal, Africa markets…"
              value={form.canHelpWith}
              onChange={(e) => set("canHelpWith", e.target.value)}
            />
            <p className={styles.hint}>Separate with commas</p>
          </div>
          <div className={styles.field}>
            <label>What are you looking for?</label>
            <input
              className="form-input"
              placeholder="Co-founder, UK investors, Copywriter…"
              value={form.lookingFor}
              onChange={(e) => set("lookingFor", e.target.value)}
            />
            <p className={styles.hint}>Separate with commas</p>
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
