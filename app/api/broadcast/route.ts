import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

const FROM = "House of Michaels <hello@houseofmichaels.com>"
const BASE = process.env.NEXTAUTH_URL || "https://houseofmichaels.com"

function buildHtml(subject: string, body: string) {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .split("\n\n")
    .map((p) => `<p style="margin:0 0 16px;font-size:14px;color:#a09890;line-height:1.75;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("")

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#080808;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:40px 20px;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#0f0f0f;border:1px solid rgba(201,168,76,0.2);border-radius:4px;">
            <tr><td style="padding:32px 40px 0;text-align:center;">
              <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#c9a84c;">House of Michaels</p>
              <h1 style="margin:12px 0 0;font-size:24px;font-weight:300;color:#e8e4dc;font-family:Georgia,serif;">${subject}</h1>
            </td></tr>
            <tr><td style="padding:28px 40px;">
              ${escaped}
              <a href="${BASE}/dashboard" style="display:inline-block;margin-top:8px;padding:13px 28px;background:#c9a84c;color:#000;text-decoration:none;font-weight:700;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;border-radius:2px;">
                Open the house →
              </a>
            </td></tr>
            <tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
              <p style="margin:0;font-size:10px;color:#3a3530;letter-spacing:0.08em;">
                © House of Michaels · <a href="${BASE}" style="color:#3a3530;text-decoration:none;">houseofmichaels.com</a>
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Owner only
  if (session.user.email !== process.env.OWNER_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { subject, body, audience } = await req.json()
  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Subject and body required" }, { status: 400 })
  }

  // Fetch recipients
  const where: Record<string, string> = {}
  if (audience === "michael") where.tier = "MICHAEL"
  if (audience === "inspired") where.tier = "INSPIRED"

  const members = await prisma.member.findMany({
    where: { profileComplete: true, ...where },
    select: { email: true, firstName: true },
  })

  if (members.length === 0) {
    return NextResponse.json({ error: "No recipients found" }, { status: 400 })
  }

  const html = buildHtml(subject, body)
  const key = process.env.RESEND_API_KEY!

  // Send in batches of 50
  const BATCH = 50
  let sent = 0

  for (let i = 0; i < members.length; i += BATCH) {
    const batch = members.slice(i, i + BATCH).map((m) => ({
      from: FROM,
      to: m.email,
      subject,
      html: html.replace(/\{\{name\}\}/g, m.firstName),
    }))

    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    })

    if (res.ok) sent += batch.length
  }

  return NextResponse.json({ sent, total: members.length })
}
