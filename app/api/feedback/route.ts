import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const member = await prisma.member.findUnique({ where: { email: session.user.email } })
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { mustHave, referral, missing } = await req.json()

  await prisma.feedback.create({
    data: {
      memberId: member.id,
      mustHave: mustHave || null,
      referral: referral || null,
      missing: missing || null,
    },
  })

  return NextResponse.json({ ok: true })
}
