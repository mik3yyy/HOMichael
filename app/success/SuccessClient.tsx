"use client"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
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
  const [countdown, setCountdown] = useState(4)

  const destination = isNewMember ? "/profile/setup" : "/dashboard"

  useEffect(() => {
    update() // refresh JWT so isMember becomes true

    const timer = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) {
          clearInterval(timer)
          router.push(destination)
          return 0
        }
        return n - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [update, router, destination])

  const isMichael = tier === "MICHAEL"

  return (
    <div className={styles.card}>
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
        {isNewMember
          ? `Setting up your profile in ${countdown}…`
          : `Entering the house in ${countdown}…`}
      </div>
    </div>
  )
}
