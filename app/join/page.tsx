import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getTier, getPrice, getMichaelName } from "@/lib/michael-names"
import { prisma } from "@/lib/db"
import CheckoutButton from "./CheckoutButton"
import styles from "./page.module.css"

const PERKS = [
  "Access to a private network of builders who carry the same name",
  "Weekly accountability pods — five Michaels, one mission, no excuses",
  "Discounted tools, software & services negotiated exclusively for members",
  "Discounted experiences — events, retreats, and real-world meetups",
  "The Directory — every Michael in one room when it opens August 10",
  "Collab Board — post an opportunity, find your co-founder, close deals",
  "Help Me network — one post, the right Michael always responds",
  "Ability to shape the house — vote on what gets built next",
  "A community scaling together toward $1,000 extra per member per month",
  "Early access to products built by Michaels before the world sees them",
  "Founding member rate — locked in forever once you pay",
  "Lifetime access — no subscriptions, no renewals, no recurring charges. Ever.",
]

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
        <a href="/" className={styles.logoMark}>House of Michaels</a>
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

          {/* Perks checklist */}
          <ul className={styles.perksList}>
            {PERKS.map((perk) => (
              <li key={perk} className={styles.perksItem}>
                <span className={styles.perksCheck}>✓</span>
                {perk}
              </li>
            ))}
          </ul>
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
