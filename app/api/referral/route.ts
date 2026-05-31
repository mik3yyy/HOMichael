import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { computeTierLevel } from "@/lib/referral"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const member = await prisma.member.findUnique({
    where: { email: session.user.email },
    select: { referralCode: true, tierLevel: true },
  })
  if (!member) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 })
  }

  const referralCount = await prisma.member.count({
    where: { referredByCode: member.referralCode },
  })

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"

  // Thresholds
  const thresholds = [
    { level: "MIKE", target: 5 },
    { level: "MJ", target: 10 },
    { level: "GOAT", target: 25 },
  ]

  const current = member.tierLevel
  const next = thresholds.find(
    (t) =>
      referralCount < t.target &&
      (current === "MEMBER" ||
        (current === "MIKE" && t.level !== "MIKE") ||
        (current === "MJ" && t.level === "GOAT"))
  )

  return NextResponse.json({
    referralCode: member.referralCode,
    referralLink: `${baseUrl}/?ref=${member.referralCode}`,
    referralCount,
    tierLevel: computeTierLevel(referralCount),
    nextTarget: next?.target ?? null,
    nextLevel: next?.level ?? null,
  })
}
