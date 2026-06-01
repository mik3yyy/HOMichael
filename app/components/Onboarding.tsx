"use client"

import { useState, useRef, useEffect } from "react"
import { signIn } from "next-auth/react"
import styles from "./Onboarding.module.css"

// ── Name detection (client-safe, no Node deps) ────────────────────────────
const MICHAEL_SET = new Set([
  "michael","mike","mikey","micky","mickey","mick",
  "michel","micha","miguel","michele","michal",
  "mikael","mikkel","mikko","mikhail","misha","mischa",
  "mihail","michail","mykhailo","micheal","micheil","mikel","mikaele",
])

function normName(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").trim()
}

function isMichaelName(name: string) {
  return name.trim().split(/\s+/).some(p => MICHAEL_SET.has(normName(p)))
}

// ── Screen definitions ────────────────────────────────────────────────────

type ScreenType = "intro" | "choice" | "statement" | "signin"

interface ScreenDef {
  type: ScreenType
  eyebrow?: string
  heading?: string
  subheading?: string
  body?: string
  options?: string[]
  cta?: string
}

const SCREENS: ScreenDef[] = [
  {
    type: "intro",
  },
  {
    type: "choice",
    eyebrow: "01 — 08",
    heading: "What are you working on right now?",
    subheading: "Be honest. This is just between us.",
    options: [
      "Building a business",
      "Growing my career",
      "Launching something new",
      "Still figuring it out",
    ],
  },
  {
    type: "choice",
    eyebrow: "02 — 08",
    heading: "How are you showing up today?",
    subheading: "Right now. In this season of your life.",
    options: [
      "Focused and locked in",
      "Grinding through it",
      "Inspired but scattered",
      "Searching for clarity",
    ],
  },
  {
    type: "choice",
    eyebrow: "03 — 08",
    heading: "What do you want to do better?",
    subheading: "Pick the one that stings a little.",
    options: [
      "Network smarter",
      "Think bigger",
      "Execute faster",
      "Stay consistent",
    ],
  },
  {
    type: "choice",
    eyebrow: "04 — 08",
    heading: "What would change everything for you right now?",
    subheading: "One thing. The truest answer.",
    options: [
      "The right connections",
      "A real co-founder",
      "Accountability that works",
      "Access to capital",
    ],
  },
  {
    type: "statement",
    eyebrow: "05 — 08",
    heading: "The name Michael has always meant something.",
    body: "From the Hebrew <em>מִיכָאֵל</em> — &ldquo;Who is like God?&rdquo; A name carried by kings, builders, and those who refused to settle. Every great movement has a Michael somewhere in the story. This house exists because of what that name demands of the people who carry it.",
    cta: "I feel that →",
  },
  {
    type: "choice",
    eyebrow: "06 — 08",
    heading: "What does the name mean to you?",
    subheading: "Be honest. No wrong answer.",
    options: [
      "It's my identity — full stop",
      "It pushes me to live up to it",
      "It connects me to something bigger",
      "It's just a name — but I'm making it legendary",
    ],
  },
  {
    type: "choice",
    eyebrow: "07 — 08",
    heading: "What are you really trying to build?",
    subheading: "Your real answer. Not the polished one.",
    options: [
      "Financial freedom",
      "Something that outlasts me",
      "A life I fully control",
      "A global presence",
    ],
  },
  {
    type: "signin",
    eyebrow: "08 — 08",
    heading: "You're ready.",
    body: "Sign in to see your place in the house and your membership price. One-time. Lifetime.",
  },
]

const TOTAL_QUESTIONS = 8 // excludes intro, name, reveal

// ── Component ─────────────────────────────────────────────────────────────

export default function Onboarding() {
  const [screenIdx, setScreenIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [showSignIn, setShowSignIn] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  // Restore from sessionStorage after client mount
  useEffect(() => {
    try {
      const savedScreen = sessionStorage.getItem("hom_screen")
      if (savedScreen) setScreenIdx(parseInt(savedScreen, 10) || 0)
    } catch {}
    setHydrated(true)
  }, [])

  // Save screen whenever it changes (only after hydration)
  useEffect(() => {
    if (!hydrated) return
    try { sessionStorage.setItem("hom_screen", String(screenIdx)) } catch {}
  }, [screenIdx, hydrated])

  const screen = SCREENS[screenIdx]
  const isLast = screenIdx === SCREENS.length - 1

  // Progress: intro = 0, each choice/statement adds to progress, name = 100%
  const progressPct = screenIdx === 0
    ? 0
    : screenIdx >= SCREENS.length - 1
    ? 100
    : Math.round(((screenIdx) / (SCREENS.length - 2)) * 100)

  function transition(cb: () => void) {
    setVisible(false)
    setSelected(null)
    setTimeout(() => {
      cb()
      setVisible(true)
    }, 380)
  }

  function advance() {
    if (screenIdx < SCREENS.length - 1) {
      transition(() => setScreenIdx(i => i + 1))
    }
  }

  function selectOption(opt: string) {
    setSelected(opt)
    setTimeout(advance, 720)
  }

  return (
    <div className={styles.page}>
      {/* Progress bar */}
      {screenIdx > 0 && (
        <div
          className={styles.progressBar}
          style={{ width: `${progressPct}%` }}
        />
      )}

      {/* Logo — only on intro; replaced by Start over on other screens */}
      {screenIdx === 0 && <div className={styles.logo}>House of Michaels</div>}

      {/* Start over — only show after intro screen */}
      {screenIdx > 0 && (
        <button
          className={styles.startOver}
          onClick={() => {
            try { sessionStorage.removeItem("hom_screen") } catch {}
            setScreenIdx(0)
            setSelected(null)
            setVisible(true)
          }}
        >
          ← Start over
        </button>
      )}

      {/* Sign in link */}
      <button className={styles.signInLink} onClick={() => setShowSignIn(true)}>
        Sign in
      </button>

      {/* Sign in modal */}
      {showSignIn && (
        <div className={styles.signInBackdrop} onClick={() => setShowSignIn(false)}>
          <div className={styles.signInModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.signInModalTitle}>Sign in to House of Michaels</div>
            <button
              className={`${styles.loginBtn} ${styles.loginBtnGoogle}`}
              onClick={() => signIn("google", { callbackUrl: "/join" })}
            >
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <button className={styles.signInClose} onClick={() => setShowSignIn(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Screen */}
      <div className={`${styles.screen} ${visible ? styles.visible : styles.hidden}`}>

        {/* ── INTRO ── */}
        {screen.type === "intro" && (
          <div className={styles.introWrap}>
            <div className={styles.introM}>M</div>
            <div className={styles.introBrand}>House of Michaels</div>
            <h1 className={styles.introHeading}>
              There is only<br />one house.
            </h1>
            <p className={styles.introSub}>
              A private circle of builders, dreamers, and doers united
              by one name. Ten questions. Then you&apos;re in — or inspired to be.
            </p>
            <button className={styles.introBegin} onClick={advance}>
              Begin
              <span className={styles.introBeginArrow}>→</span>
            </button>
          </div>
        )}

        {/* ── CHOICE ── */}
        {screen.type === "choice" && (
          <div>
            <div className={styles.eyebrow}>{screen.eyebrow}</div>
            <h2 className={styles.heading}>{screen.heading}</h2>
            {screen.subheading && (
              <p className={styles.subheading}>{screen.subheading}</p>
            )}
            <div className={styles.options}>
              {screen.options!.map((opt) => (
                <button
                  key={opt}
                  className={`${styles.option}${selected === opt ? ` ${styles.selected}` : ""}`}
                  onClick={() => selectOption(opt)}
                  disabled={!!selected}
                >
                  <span className={styles.optionDot} />
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STATEMENT ── */}
        {screen.type === "statement" && (
          <div>
            <div className={styles.eyebrow}>{screen.eyebrow}</div>
            <h2 className={styles.heading}>{screen.heading}</h2>
            <p
              className={styles.statementBody}
              dangerouslySetInnerHTML={{ __html: screen.body! }}
            />
            <button className={styles.cta} onClick={advance}>
              {screen.cta || "Continue →"}
            </button>
          </div>
        )}

        {/* ── SIGN IN ── */}
        {screen.type === "signin" && (
          <div className={styles.reveal}>
            <div className={styles.revealIcon}>◈</div>
            <div className={styles.eyebrow}>{screen.eyebrow}</div>
            <h2 className={styles.revealName}>{screen.heading}</h2>
            <p className={styles.revealNote} style={{ marginBottom: 32 }}>{screen.body}</p>

            <div className={styles.loginGroup}>
              <button
                className={`${styles.loginBtn} ${styles.loginBtnGoogle}`}
                onClick={() => signIn("google", { callbackUrl: "/join" })}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
              {/* LinkedIn hidden until OAuth is fixed */}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
