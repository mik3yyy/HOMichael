import { NextRequest, NextResponse } from "next/server"
import { stripe, stripeWebhookSecret } from "@/lib/stripe"
import { prisma } from "@/lib/db"
import { generateReferralCode, creditReferrer } from "@/lib/referral"
import { getMichaelName } from "@/lib/michael-names"
import { emailWelcome } from "@/lib/email"
import type Stripe from "stripe"

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      stripeWebhookSecret
    )
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const meta = session.metadata

    if (meta?.email && meta?.tier) {
      const firstName = getMichaelName(meta.name || meta.email)

      const member = await prisma.member.upsert({
        where: { email: meta.email },
        update: { stripeSessionId: session.id },
        create: {
          email: meta.email,
          name: meta.name || meta.email,
          firstName,
          tier: meta.tier,
          stripeSessionId: session.id,
          referralCode: generateReferralCode(),
          referredByCode: meta.referredByCode || null,
        },
      })

      // Credit the referrer if applicable
      if (meta.referredByCode) {
        await creditReferrer(meta.referredByCode)
      }

      // Send welcome email
      await emailWelcome({ toEmail: meta.email, firstName, tier: meta.tier })
    }
  }

  return NextResponse.json({ received: true })
}
