import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/db"
import { getMichaelName } from "@/lib/michael-names"
import { generateReferralCode, creditReferrer } from "@/lib/referral"
import SuccessClient from "./SuccessClient"
import styles from "./page.module.css"
import type Stripe from "stripe"

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/")

  const sessionId = searchParams.session_id
  if (!sessionId) redirect("/join")

  // Retrieve Stripe session — never call redirect() inside try/catch
  // because Next.js uses thrown errors for redirects and catch swallows them
  let stripeSession: Stripe.Checkout.Session
  try {
    stripeSession = await stripe.checkout.sessions.retrieve(sessionId)
  } catch {
    redirect("/join")
  }

  if (stripeSession!.payment_status !== "paid") redirect("/join")

  const meta = (stripeSession!.metadata ?? {}) as Record<string, string>
  const email = meta.email || session.user.email!
  const name = meta.name || session.user.name || ""
  const tier = meta.tier || "MICHAEL"
  const firstName = getMichaelName(name || email)

  // Upsert member — webhook may have already created it
  let isNewMember = false

  const existing = await prisma.member.findUnique({ where: { email } })

  if (!existing) {
    isNewMember = true
    await prisma.member.upsert({
      where: { email },
      update: { stripeSessionId: sessionId },
      create: {
        email,
        name,
        firstName,
        tier,
        stripeSessionId: sessionId,
        referralCode: generateReferralCode(),
        referredByCode: meta.referredByCode || null,
      },
    })

    if (meta.referredByCode) {
      await creditReferrer(meta.referredByCode)
    }
  } else {
    isNewMember = !existing.profileComplete
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logoMark}>House of Michaels</div>
      </header>
      <SuccessClient firstName={firstName} tier={tier} isNewMember={isNewMember} />
    </div>
  )
}
