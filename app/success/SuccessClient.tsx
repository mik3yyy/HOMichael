"use client"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import styles from "./page.module.css"

export default function SuccessClient({
  firstName,
  tier,
  isNewMember,
}: {
  firstName: string
  tier: string
  isNewMember: boolean
}) {
  const { update } = useSession()
  const router = useRouter()
  const [countdown, setCountdown] = useState(3)
  const redirected = useRef(false)

  const destination = isNewMember ? "/profile/setup" : "/dashboard"

  function go() {
    if (!redirected.current) {
      redirected.current = true
      router.push(destination)
    }
  }

  useEffect(() => {
    // Refresh the JWT so isMember becomes true, then redirect immediately
    update().then(go)

    // Countdown display — also redirects when it hits 0 as a fallback
    const timer = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) {
          clearInterval(timer)
          go()
          return 0
        }
        return n - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isMichael = tier === "MICHAEL"

  return (
    <div className={styles.card} onClick={go} style={{ cursor: "pointer" }}>
      <div className={styles.mark}>◈</div>

      <h1 className={styles.heading}>
        Welcome to the house,<br />
        <span className={styles.name}>{firstName}.</span>
      </h1>

      <p className={styles.body}>
        {isMichael
          ? "You're a Michael. This house is yours."
          : "You believe in what this house stands for. This house is yours."}
      </p>

      <div className={styles.tierPill}>
        {isMichael ? "◈ Michael Tier" : "◈ Inspired by Michael"}
      </div>

      <div className={styles.redirect}>
        {countdown > 0
          ? isNewMember
            ? `Setting up your profile in ${countdown}…`
            : `Entering the house in ${countdown}…`
          : "Entering…"}
      </div>
    </div>
  )
}
