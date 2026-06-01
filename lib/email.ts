const FROM = "House of Michaels <hello@houseofmichaels.com>"
// Always use the real domain for email links — never localhost
const rawBase = process.env.NEXTAUTH_URL || ""
const BASE = rawBase.includes("localhost") || !rawBase
  ? "https://houseofmichaels.com"
  : rawBase

const GOLD = "#c9a84c"
const BG = "#080808"
const TEXT = "#e8e4dc"

function wrapper(body: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <meta name="color-scheme" content="dark">
      <meta name="supported-color-schemes" content="dark">
      <style>
        body { margin:0!important;padding:0!important;background:#080808!important; }
        .wrapper { background:#080808!important; }
        .card { background:#0f0f0f!important; }
      </style>
    </head>
    <body style="margin:0;padding:0;background-color:#080808;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;" bgcolor="#080808">
      <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#080808" class="wrapper" style="background-color:#080808;padding:40px 16px;">
        <tr><td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
            <tr><td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#0f0f0f" class="card" style="background-color:#0f0f0f;border:1px solid #2a2010;border-radius:4px;">
                <tr><td style="padding:32px 32px 0;text-align:center;">
                  <img src="https://houseofmichaels.com/icon-192.png" alt="House of Michaels" width="44" height="44" style="display:inline-block;width:44px;height:44px;border-radius:10px;margin-bottom:12px;" />
                  <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:${GOLD};">House of Michaels</p>
                </td></tr>
                <tr><td style="padding:24px 32px 40px;color:#e8e4dc;">
                  ${body}
                </td></tr>
                <tr><td style="padding:20px 32px;border-top:1px solid #1a1a1a;text-align:center;">
                  <p style="margin:0;font-size:10px;color:#555;letter-spacing:0.08em;">
                    © House of Michaels &nbsp;·&nbsp; <a href="${BASE}" style="color:#555;text-decoration:none;">houseofmichaels.com</a>
                  </p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `
}

function btn(text: string, href: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:24px;padding:14px 32px;background:${GOLD};color:#000;text-decoration:none;font-weight:700;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;border-radius:2px;">${text}</a>`
}

async function send(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY
  if (!key) return
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
}

// ── 1. Welcome — sent when member pays and joins ──────────────────────────
export async function emailWelcome({ toEmail, firstName, tier }: {
  toEmail: string
  firstName: string
  tier: string
}) {
  const isMichael = tier === "MICHAEL"
  await send(toEmail, `Welcome to the house, ${firstName}.`, wrapper(`
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:300;color:${TEXT};font-family:Georgia,serif;">
      Welcome to the house,<br><span style="color:${GOLD};">${firstName}.</span>
    </h1>
    <p style="margin:16px 0;font-size:13px;color:#7a7570;line-height:1.7;">
      ${isMichael
        ? "Your name has been verified. You are a Michael. This house was built for you."
        : "You believe in what this name stands for. This house is yours."}
    </p>
    <p style="margin:16px 0;font-size:13px;color:#7a7570;line-height:1.7;">
      You have lifetime access. No subscriptions. No renewals. No recurring charges. Ever. Set up your profile now so you are ready when the house fully opens.
    </p>
    ${btn("Set up your profile →", `${BASE}/profile/setup`)}
    <p style="margin:24px 0 0;font-size:11px;color:#3a3530;line-height:1.6;">
      One house. One name. For life.
    </p>
  `))
}

// ── 2. Profile complete ───────────────────────────────────────────────────
export async function emailProfileComplete({ toEmail, firstName }: {
  toEmail: string
  firstName: string
}) {
  await send(toEmail, "You're in. Your profile is live.", wrapper(`
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:300;color:${TEXT};font-family:Georgia,serif;">
      You&rsquo;re in, <span style="color:${GOLD};">${firstName}.</span>
    </h1>
    <p style="margin:16px 0;font-size:13px;color:#7a7570;line-height:1.7;">
      Your profile is live. When the directory opens on <strong style="color:${TEXT};">10 August 2026</strong>, every Michael will be able to find you, connect with you, and build with you.
    </p>
    <p style="margin:16px 0;font-size:13px;color:#7a7570;line-height:1.7;">
      While you wait, the house is listening. Head to <strong style="color:${TEXT};">Shape the Future</strong> in your dashboard to vote on what gets built next — your voice literally decides the roadmap. Or message the founder directly if you have an idea, a question, or something you think this house needs.
    </p>
    <p style="margin:16px 0;font-size:13px;color:#7a7570;line-height:1.7;">
      Pods — your five-person accountability circle — are coming. We are assembling them carefully. You will hear from us when yours is ready.
    </p>
    ${btn("Go to your dashboard →", `${BASE}/dashboard`)}
  `))
}

// ── 3. Pod assignment notification ────────────────────────────────────────
export async function emailPodAssigned({ toEmail, firstName, cohort, podMemberNames }: {
  toEmail: string
  firstName: string
  cohort: number
  podMemberNames: string[]
}) {
  const names = podMemberNames.filter(Boolean).join(", ")
  await send(toEmail, `Your pod is ready — Cohort ${cohort}`, wrapper(`
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:300;color:${TEXT};font-family:Georgia,serif;">
      Your pod is assembled, <span style="color:${GOLD};">${firstName}.</span>
    </h1>
    <p style="margin:16px 0;font-size:13px;color:#7a7570;line-height:1.7;">
      You have been placed in <strong style="color:${GOLD};">Cohort ${cohort}</strong>. Your pod members are:
    </p>
    <p style="margin:16px 0;font-size:15px;color:${TEXT};font-weight:700;">${names}</p>
    <p style="margin:16px 0;font-size:13px;color:#7a7570;line-height:1.7;">
      Submit your first check-in this week. Three questions. Honest answers. That is how this works.
    </p>
    ${btn("Open the house →", `${BASE}/dashboard`)}
  `))
}

// ── 4. Post response notification ─────────────────────────────────────────
export async function emailPostResponse({ toEmail, toName, fromName, postTitle, message }: {
  toEmail: string
  toName: string
  fromName: string
  postTitle: string
  message?: string
}) {
  await send(toEmail, `${fromName} responded to your post`, wrapper(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:300;color:${TEXT};font-family:Georgia,serif;">
      You got a response, <span style="color:${GOLD};">${toName}.</span>
    </h1>
    <p style="margin:16px 0;font-size:13px;color:#7a7570;line-height:1.7;">
      <strong style="color:${TEXT};">${fromName}</strong> responded to your post:
    </p>
    <blockquote style="border-left:3px solid ${GOLD};padding-left:16px;margin:16px 0;font-size:13px;color:#7a7570;font-style:italic;">
      &ldquo;${postTitle}&rdquo;
    </blockquote>
    ${message ? `<p style="font-size:13px;color:#7a7570;line-height:1.7;">Their message: <em>&ldquo;${message}&rdquo;</em></p>` : ""}
    ${btn("Open the house →", `${BASE}/dashboard`)}
  `))
}

// ── 5. Discount offer — 25% off for checkout drop-offs ────────────────────
export async function emailDiscountOffer({ toEmail, firstName, tier, originalAmount, discountedAmount, checkoutUrl }: {
  toEmail: string
  firstName: string
  tier: string
  originalAmount: number
  discountedAmount: number
  checkoutUrl: string
}) {
  const isMichael = tier === "MICHAEL"
  await send(toEmail, `${firstName}, your spot is still here — and we made it easier.`, wrapper(`
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:300;color:${TEXT};font-family:Georgia,serif;">
      Your spot is still here,<br><span style="color:${GOLD};">${firstName}.</span>
    </h1>
    <p style="margin:16px 0;font-size:13px;color:#7a7570;line-height:1.7;">
      You came close. We noticed you stopped just before the door.
    </p>
    <p style="margin:16px 0;font-size:13px;color:#7a7570;line-height:1.7;">
      ${isMichael
        ? "This house was built for people who carry that name. It was built for you."
        : "You were drawn here for a reason. That matters."}
      We want to make it easier to get in — so we're holding your spot with a one-time offer.
    </p>
    <div style="margin:24px 0;padding:20px 24px;background:#0a0a08;border:1px solid #2a2010;border-radius:4px;text-align:center;">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#7a7570;margin-bottom:12px;">Your offer</div>
      <div style="display:flex;align-items:baseline;justify-content:center;gap:12px;margin-bottom:8px;">
        <span style="font-size:18px;color:#3a3530;text-decoration:line-through;">\$${originalAmount}</span>
        <span style="font-size:36px;font-weight:700;color:${GOLD};">\$${discountedAmount}</span>
      </div>
      <div style="font-size:11px;color:#7a7570;letter-spacing:0.05em;">25% off · one-time · lifetime access</div>
    </div>
    <p style="margin:16px 0;font-size:13px;color:#7a7570;line-height:1.7;">
      This link is just for you. It expires — so don't sit on it.
    </p>
    ${btn("Claim your spot →", checkoutUrl)}
    <p style="margin:24px 0 0;font-size:11px;color:#3a3530;line-height:1.6;">
      One house. One name. For life.
    </p>
  `))
}

// ── 6. Owner message notification ─────────────────────────────────────────
export async function emailOwnerMessage({ fromName, fromEmail, subject, message }: {
  fromName: string
  fromEmail: string
  subject: string
  message: string
}) {
  const ownerEmail = process.env.OWNER_EMAIL
  if (!ownerEmail) return
  await send(ownerEmail, `[House] ${fromName}: ${subject}`, wrapper(`
    <p style="margin:0 0 16px;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${GOLD};">Message from the House</p>
    <p style="font-size:13px;color:#7a7570;margin:0 0 8px;"><strong style="color:${TEXT};">From:</strong> ${fromName} (${fromEmail})</p>
    <p style="font-size:13px;color:#7a7570;margin:0 0 16px;"><strong style="color:${TEXT};">Subject:</strong> ${subject}</p>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:16px 0;">
    <p style="font-size:13px;color:#7a7570;line-height:1.7;white-space:pre-wrap;">${message}</p>
  `))
}
