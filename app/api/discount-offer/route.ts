import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { stripe } from "@/lib/stripe"
import { emailDiscountOffer } from "@/lib/email"
import { getMichaelName } from "@/lib/michael-names"

const BASE = (() => {
  const u = process.env.NEXTAUTH_URL || ""
  return !u || u.includes("localhost") ? "https://houseofmichaels.com" : u
})()

async function getOrCreateCoupon(): Promise<string> {
  const id = "HOM25"
  try {
    const existing = await stripe.coupons.retrieve(id)
    return existing.id
  } catch {
    const coupon = await stripe.coupons.create({
      id,
      percent_off: 25,
      duration: "once",
      name: "House of Michaels — 25% welcome back",
    })
    return coupon.id
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.email !== process.env.OWNER_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { attemptId } = await req.json()
  if (!attemptId) return NextResponse.json({ error: "Missing attemptId" }, { status: 400 })

  const attempt = await prisma.checkoutAttempt.findUnique({ where: { id: attemptId } })
  if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (attempt.discountSentAt) return NextResponse.json({ error: "Already sent" }, { status: 409 })

  const couponId = await getOrCreateCoupon()
  const discountedAmount = Math.round(attempt.amountCents * 0.75)

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: attempt.email,
    discounts: [{ coupon: couponId }],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: attempt.tier === "MICHAEL"
              ? "House of Michaels — Michael Tier"
              : "House of Michaels — Inspired by Michael",
            description: attempt.tier === "MICHAEL"
              ? "Lifetime membership. You are a Michael."
              : "Lifetime membership. Inspired by Michael.",
          },
          unit_amount: attempt.amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      email: attempt.email,
      name: attempt.name,
      tier: attempt.tier,
      referredByCode: attempt.referredByCode || "",
    },
    success_url: `${BASE}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE}/join?dropped=1`,
  })

  const firstName = getMichaelName(attempt.name || attempt.email)

  await emailDiscountOffer({
    toEmail: attempt.email,
    firstName,
    tier: attempt.tier,
    originalAmount: attempt.amountCents / 100,
    discountedAmount: discountedAmount / 100,
    checkoutUrl: checkoutSession.url!,
  })

  await prisma.checkoutAttempt.update({
    where: { id: attemptId },
    data: { discountSentAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
