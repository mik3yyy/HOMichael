import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { emailOwnerMessage } from "@/lib/email"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { subject, message } = await req.json()
  if (!subject || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  await emailOwnerMessage({
    fromName: session.user.name || session.user.email,
    fromEmail: session.user.email,
    subject,
    message,
  })

  return NextResponse.json({ ok: true })
}
