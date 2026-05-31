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
  })
  if (!member?.podId) {
    return NextResponse.json({ checkIns: [], myCheckIn: null })
  }

  const week = getCurrentWeek()

  const [checkIns, myCheckIn] = await Promise.all([
    prisma.checkIn.findMany({
      where: { podId: member.podId, week },
      include: {
        member: {
          select: { id: true, firstName: true, name: true, avatarUrl: true },
        },
      },
    }),
    prisma.checkIn.findUnique({
      where: { memberId_week: { memberId: member.id, week } },
    }),
  ])

  return NextResponse.json({ checkIns, myCheckIn, week })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const member = await prisma.member.findUnique({
    where: { email: session.user.email },
  })
  if (!member?.podId) {
    return NextResponse.json({ error: "Not in a pod yet" }, { status: 400 })
  }

  const { lastWeek, thisWeek, blocker } = await req.json()
  const week = getCurrentWeek()

  const checkIn = await prisma.checkIn.upsert({
    where: { memberId_week: { memberId: member.id, week } },
    update: { lastWeek, thisWeek, blocker },
    create: {
      memberId: member.id,
      podId: member.podId,
      week,
      lastWeek,
      thisWeek,
      blocker,
    },
  })

  return NextResponse.json(checkIn)
}
