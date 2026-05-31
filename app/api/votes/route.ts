import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

const FEATURES = [
  { key: "mobile-app",        label: "Mobile app (iOS + Android)",       base: 183 },
  { key: "live-events",       label: "Live events and meetups",           base: 147 },
  { key: "marketplace",       label: "Marketplace for services",          base: 102 },
  { key: "resource-library",  label: "Resource library and templates",    base:  61 },
  { key: "mentorship",        label: "Mentorship pairing",                base:  14 },
]

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const member = await prisma.member.findUnique({ where: { email: session.user.email } })
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const totalMembers = await prisma.member.count()

  const [voteCounts, myVotes] = await Promise.all([
    prisma.featureVote.groupBy({ by: ["feature"], _count: true }),
    prisma.featureVote.findMany({ where: { memberId: member.id }, select: { feature: true } }),
  ])

  const countMap: Record<string, number> = {}
  voteCounts.forEach((v) => { countMap[v.feature] = v._count })

  const myVoteSet = new Set(myVotes.map((v) => v.feature))

  const features = FEATURES.map((f) => {
    const realVotes = countMap[f.key] ?? 0
    const totalVotes = realVotes + f.base
    const displayTotal = totalMembers + 1149
    return {
      key: f.key,
      label: f.label,
      votes: totalVotes,
      pct: Math.min(99, Math.round((totalVotes / Math.max(displayTotal, 1)) * 100)),
      voted: myVoteSet.has(f.key),
    }
  })

  return NextResponse.json({ features })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const member = await prisma.member.findUnique({ where: { email: session.user.email } })
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { feature } = await req.json()
  if (!FEATURES.find((f) => f.key === feature)) {
    return NextResponse.json({ error: "Invalid feature" }, { status: 400 })
  }

  const existing = await prisma.featureVote.findUnique({
    where: { memberId_feature: { memberId: member.id, feature } },
  })

  if (existing) {
    await prisma.featureVote.delete({ where: { id: existing.id } })
    return NextResponse.json({ voted: false })
  } else {
    await prisma.featureVote.create({ data: { memberId: member.id, feature } })
    return NextResponse.json({ voted: true })
  }
}
