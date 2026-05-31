import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getTier, getPrice, getMichaelName } from "@/lib/michael-names"
import { prisma } from "@/lib/db"
import CheckoutButton from "./CheckoutButton"
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

  // Live member count + days to directory launch
  const memberCount = await prisma.member.count() + 1000
  const launchDate = new Date("2026-08-10")
  const daysLeft = Math.max(0, Math.ceil((launchDate.getTime() - Date.now()) / 86400000))

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a href="/" className={styles.logoMark}>House of Michaels</a>
      </header>

      {/* ── PAYMENT CARD (unchanged) ── */}
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
          {isMichael ? (
            <p className={styles.tierNote}>Auto-verified. No recurring charges. Ever.</p>
          ) : (
            <p className={styles.tierNote}>The extra $10 is your tribute to the name. No questions asked.</p>
          )}
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

      {/* ── WHAT'S WAITING INSIDE ── */}
      <div className={styles.perksWrap}>
        <div className={styles.perksHeading}>What you&apos;re paying for</div>

        <div className={styles.perksGrid}>

          {/* PERKS */}
          <div className={styles.perkCard}>
            <div className={styles.perkIcon}>◈</div>
            <div className={styles.perkTitle}>A house that pays you back</div>
            <p className={styles.perkBody}>
              Our goal is simple: every Michael earning an extra{" "}
              <strong>$1,000 a month</strong> within a year of joining. Through
              deals closed in the house, collabs that shipped, and connections
              that converted — this community is being built to generate real
              income for every member in it.
            </p>
            <div className={styles.perkList}>
              <div className={styles.perkItem}>
                <span className={styles.perkDot} />
                Exclusive discounts on tools, software &amp; services — negotiated just for members
              </div>
              <div className={styles.perkItem}>
                <span className={styles.perkDot} />
                Early access to products built by Michaels, before the world sees them
              </div>
              <div className={styles.perkItem}>
                <span className={styles.perkDot} />
                Member-only deals that disappear once the house grows past 2,000
              </div>
            </div>
          </div>

          {/* DIRECTORY */}
          <div className={`${styles.perkCard} ${styles.perkCardGold}`}>
            <div className={styles.perkIcon}>⊞</div>
            <div className={styles.perkTitle}>The Directory — opens in</div>
            <div className={styles.countdown}>
              <span className={styles.countdownNum}>{daysLeft}</span>
              <span className={styles.countdownLabel}>days</span>
            </div>
            <p className={styles.perkBody}>
              On <strong>10 August 2026</strong>, the full member directory goes
              live. Every Michael in one searchable room — founders, investors,
              athletes, musicians, creatives, and builders from across the globe.
              Brilliant minds. Real products. People doing things that matter.
            </p>
            <p className={styles.perkBody}>
              You will find your next co-founder here. Your next investor. Your
              next client. Your next collaborator. The directory is not a list of
              profiles — it is the most concentrated network of ambitious people
              named Michael on the planet. Nothing like it exists anywhere else.
            </p>
            <div className={styles.progressWrap}>
              <div className={styles.progressTop}>
                <span className={styles.progressCount}>{memberCount.toLocaleString()}+ members</span>
                <span className={styles.progressGoal}>Goal: 2,000</span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${Math.min(100, (memberCount / 2000) * 100)}%` }}
                />
              </div>
              <p className={styles.progressNote}>
                {2000 - memberCount > 0
                  ? `${(2000 - memberCount).toLocaleString()} spots remaining before we close the founding rate forever.`
                  : "The house is full. Founding members are locked in."}
              </p>
            </div>
          </div>

          {/* PODS */}
          <div className={styles.perkCard}>
            <div className={styles.perkIcon}>◎</div>
            <div className={styles.perkTitle}>Pods — your inner circle</div>
            <p className={styles.perkBody}>
              Five Michaels. One mission. Every week, your pod meets for a
              check-in: what you accomplished, what you&apos;re building next,
              and what is blocking you. No audience. No performance. Just five
              people who genuinely want to see each other win.
            </p>
            <p className={styles.perkBody}>
              Think about the five most driven people you know. Now imagine
              being in a room with five more — all builders, all moving, all
              accountable. That is what happens every week inside a pod.
              People have shipped products, closed deals, and broken through
              plateaus because someone in their pod held them to it.
            </p>
            <div className={styles.perkList}>
              <div className={styles.perkItem}>
                <span className={styles.perkDot} />
                Weekly async check-ins — 3 questions that keep you honest
              </div>
              <div className={styles.perkItem}>
                <span className={styles.perkDot} />
                Grouped by industry and timezone — no random matching
              </div>
              <div className={styles.perkItem}>
                <span className={styles.perkDot} />
                Pods are for life — the longer you stay, the deeper it gets
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
