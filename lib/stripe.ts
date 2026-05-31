import Stripe from "stripe"

// STRIPE_MODE env var overrides NODE_ENV — set to "test" or "live" in Vercel
// to control which keys are used regardless of environment.
// If not set, defaults to "live" in production and "test" in development.
const mode =
  process.env.STRIPE_MODE ??
  (process.env.NODE_ENV === "production" ? "live" : "test")

const useLive = mode === "live"

export const stripe = new Stripe(
  useLive ? process.env.STRIPE_SECRET_KEY! : process.env.STRIPE_TEST_KEY!,
  { apiVersion: "2023-10-16" }
)

export const stripeWebhookSecret = useLive
  ? process.env.STRIPE_WEBHOOK_SECRET!
  : process.env.STRIPE_WEBHOOK_TEST!
