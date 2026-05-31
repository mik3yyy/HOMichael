import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { stripe } from "@/lib/stripe"
import { getPriceCents } from "@/lib/michael-names"

function getBaseUrl(req: NextRequest): string {
  // Use the actual request origin — works on localhost any port, Vercel, custom domain
  const host = req.headers.get("host") || "localhost:3000"
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (host.startsWith("localhost") ? "http" : "https")
  return `${proto}://${host}`
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const tier: "MICHAEL" | "INSPIRED" =
    body.tier === "MICHAEL" || body.tier === "INSPIRED" ? body.tier : "MICHAEL"

  const amount = getPriceCents(tier)
  const baseUrl = getBaseUrl(req)

  const refCookie = req.cookies.get("hom_ref")?.value

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: session.user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name:
                tier === "MICHAEL"
                  ? "House of Michaels — Michael Tier"
                  : "House of Michaels — Inspired by Michael",
              description:
                tier === "MICHAEL"
                  ? "Lifetime membership. You are a Michael."
                  : "Lifetime membership. Inspired by Michael.",
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        email: session.user.email,
        name: session.user.name || "",
        tier,
        referredByCode: refCookie || "",
      },
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/join`,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Stripe error"
    console.error("[checkout]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
