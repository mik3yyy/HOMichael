import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getTier, getPrice, getFirstName } from "@/lib/michael-names"
import CheckoutButton from "./CheckoutButton"
import styles from "./page.module.css"

export default async function JoinPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) redirect("/")
  if (session.user.isMember) redirect("/dashboard")

  const fullName = session.user.name || session.user.email
  const firstName = getFirstName(fullName)
  const tier = getTier(fullName)
  const price = getPrice(tier)
  const isMichael = tier === "MICHAEL"

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a href="/" className={styles.logoMark}>House of Michaels</a>
      </header>

      <div className={styles.card}>
        {/* Avatar */}
        <div className={styles.avatar}>
          {firstName.slice(0, 2).toUpperCase()}
        </div>

        {/* Name + verdict */}
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

        {/* Tier block */}
        <div className={styles.tierBlock}>
          <div className={styles.tierName}>
            ◈ {isMichael ? "Michael Tier" : "Inspired by Michael Tier"}
          </div>
          <div className={styles.priceRow}>
            <span className={styles.price}>${price}</span>
            <span className={styles.priceSub}>one-time · lifetime access</span>
          </div>
          {isMichael ? (
            <p className={styles.tierNote}>
              Auto-verified. No recurring charges. Ever.
            </p>
          ) : (
            <p className={styles.tierNote}>
              The extra $10 is your tribute to the name. No questions asked.
            </p>
          )}
        </div>

        <div className={styles.divider} />

        {/* Pay button */}
        <CheckoutButton tier={tier} price={price} />

        <p className={styles.secureNote}>
          Secured by Stripe · No card stored · Pay once, access forever
        </p>
      </div>

      <p className={styles.wrongAccount}>
        Not {firstName}?{" "}
        <a href="/api/auth/signout?callbackUrl=/" className={styles.link}>
          Sign out
        </a>
      </p>
    </div>
  )
}
