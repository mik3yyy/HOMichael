import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getTier, getPrice, getMichaelName } from "@/lib/michael-names"
import { prisma } from "@/lib/db"
import CheckoutButton from "./CheckoutButton"
import PerksChecklist from "./PerksChecklist"
import styles from "./page.module.css"

export default async function JoinPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) redirect("/")
  if (session.user.isMember) redirect("/dashboard")

  const fullName = session.user.name || session.user.email
  const firstName = getMichaelName(fullName)
  const tier = getTier(fullName)
  const price = getPrice(tier)
  const isMichael = tier === "MICHAEL"

  await prisma.member.count()

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a href="/" className={styles.logoMark} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" style={{ width: 24, height: 24, borderRadius: 4 }} />
          House of Michaels
        </a>
      </header>

      <div className={styles.card}>
        <div className={styles.avatar}>
          {firstName.slice(0, 2).toUpperCase()}
        </div>

        <p className={styles.greeting}>Welcome, {firstName}.</p>

        {isMichael ? (
          <div className={styles.verdict}>
            <span className={styles.verdictDot} />
            Your name has been verified. You&apos;re a Michael.
          </div>
        ) : (
          <div className={`${styles.verdict} ${styles.verdictInspired}`}>
            <span className={styles.verdictDot} />
            You&apos;re joining as Inspired by Michael.
          </div>
        )}

        <div className={styles.divider} />

        <div className={styles.tierBlock}>
          <div className={styles.tierName}>
            ◈ {isMichael ? "Michael Tier" : "Inspired by Michael Tier"}
          </div>
          <div className={styles.priceRow}>
            <span className={styles.price}>${price}</span>
            <span className={styles.priceSub}>one-time · lifetime access</span>
          </div>

          <PerksChecklist />
        </div>

        <div className={styles.divider} />

        <CheckoutButton tier={tier} price={price} />

        <p className={styles.secureNote}>
          Secured by Stripe · No card stored · Pay once, access forever
        </p>
      </div>

      <p className={styles.wrongAccount}>
        Not {firstName}?{" "}
        <a href="/api/auth/signout?callbackUrl=/" className={styles.link}>Sign out</a>
      </p>
    </div>
  )
}
