import Stripe from "stripe"

const isProd = process.env.NODE_ENV === "production"

export const stripe = new Stripe(
  isProd ? process.env.STRIPE_SECRET_KEY! : process.env.STRIPE_TEST_KEY!,
  { apiVersion: "2023-10-16" }
)

export const stripeWebhookSecret = isProd
  ? process.env.STRIPE_WEBHOOK_SECRET!
  : process.env.STRIPE_WEBHOOK_TEST!
