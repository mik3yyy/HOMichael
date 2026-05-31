import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getCurrentWeek } from "@/lib/pods"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const member = await prisma.member.findUnique({
    where: { email: session.user.email },
    include: { pod: { include: { members: { select: { id: true, firstName: true, name: true, city: true, industry: true, avatarUrl: true, email: true } } } } },
  })

  if (!member?.pod) {
    return NextResponse.json({ pod: null })
  }

  const week = getCurrentWeek()
  const checkIns = await prisma.checkIn.findMany({
    where: { podId: member.pod.id, week },
    select: { memberId: true },
  })

  const checkedInIds = new Set(checkIns.map((c) => c.memberId))

  const podMembers = member.pod.members.map((m) => ({
    ...m,
    checkedIn: checkedInIds.has(m.id),
    isMe: m.id === member.id,
  }))

  // Calculate streak: count consecutive weeks all members submitted
  const streak = await computeStreak(member.pod.id, member.pod.members.length)

  return NextResponse.json({
    pod: {
      id: member.pod.id,
      cohort: member.pod.cohort,
      members: podMembers,
      streak,
      week,
    },
  })
}

async function computeStreak(podId: string, memberCount: number): Promise<number> {
  // Count the last N weeks where all members checked in
  const allCheckIns = await prisma.checkIn.groupBy({
    by: ["week"],
    where: { podId },
    _count: { memberId: true },
    orderBy: { week: "desc" },
    take: 10,
  })

  let streak = 0
  for (const w of allCheckIns) {
    if (w._count.memberId >= memberCount) streak++
    else break
  }
  return streak
}
