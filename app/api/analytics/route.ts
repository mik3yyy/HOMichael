import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

const VALID_EVENTS = new Set([
  "page_view",
  "step_1","step_2","step_3","step_4","step_5","step_6","step_7","step_8",
  "signin_click","signin_attempt",
])

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { event, step, sessionId, source, refCode } = body
    if (!VALID_EVENTS.has(event)) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }
    await prisma.pageEvent.create({
      data: { event, step: step ?? null, sessionId: sessionId ?? null, source: source ?? null, refCode: refCode ?? null },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.email !== process.env.OWNER_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const now = new Date()
  const day1 = new Date(now); day1.setHours(0, 0, 0, 0)
  const day7 = new Date(now); day7.setDate(day7.getDate() - 7)
  const day30 = new Date(now); day30.setDate(day30.getDate() - 30)

  const [allEvents, todayEvents, week7Events, month30Events, droppedAttempts] = await Promise.all([
    prisma.pageEvent.findMany({ select: { event: true, step: true, source: true, sessionId: true, createdAt: true } }),
    prisma.pageEvent.count({ where: { event: "page_view", createdAt: { gte: day1 } } }),
    prisma.pageEvent.count({ where: { event: "page_view", createdAt: { gte: day7 } } }),
    prisma.pageEvent.count({ where: { event: "page_view", createdAt: { gte: day30 } } }),
    prisma.checkoutAttempt.findMany({
      where: { status: { in: ["cancelled", "expired", "pending"] } },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, email: true, name: true, tier: true, status: true, amountCents: true, createdAt: true, referredByCode: true },
    }),
  ])

  const totalViews = allEvents.filter(e => e.event === "page_view").length
  const totalSigninClicks = allEvents.filter(e => e.event === "signin_click").length
  const totalSigninAttempts = allEvents.filter(e => e.event === "signin_attempt").length

  // Funnel: how many unique sessions reached each step
  const stepCounts: Record<number, number> = {}
  for (let s = 1; s <= 8; s++) {
    const key = `step_${s}`
    stepCounts[s] = allEvents.filter(e => e.event === key).length
  }

  // Sources breakdown
  const sourceMap: Record<string, number> = {}
  allEvents.filter(e => e.event === "page_view" && e.source).forEach(e => {
    const src = e.source!
    sourceMap[src] = (sourceMap[src] || 0) + 1
  })
  const sources = Object.entries(sourceMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([src, count]) => ({ src, count }))

  // Daily views for last 14 days
  const day14 = new Date(now); day14.setDate(day14.getDate() - 13); day14.setHours(0, 0, 0, 0)
  const recentViews = allEvents.filter(e => e.event === "page_view" && new Date(e.createdAt) >= day14)
  const dailyMap: Record<string, number> = {}
  recentViews.forEach(e => {
    const d = new Date(e.createdAt).toISOString().slice(0, 10)
    dailyMap[d] = (dailyMap[d] || 0) + 1
  })
  const daily: { date: string; count: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    daily.push({ date: key, count: dailyMap[key] || 0 })
  }

  const checkoutStats = {
    cancelled: droppedAttempts.filter(a => a.status === "cancelled").length,
    expired: droppedAttempts.filter(a => a.status === "expired").length,
    pending: droppedAttempts.filter(a => a.status === "pending").length,
    lostRevenue: droppedAttempts
      .filter(a => a.status !== "pending")
      .reduce((sum, a) => sum + a.amountCents, 0),
  }

  return NextResponse.json({
    totalViews,
    todayViews: todayEvents,
    week7Views: week7Events,
    month30Views: month30Events,
    totalSigninClicks,
    totalSigninAttempts,
    stepCounts,
    sources,
    daily,
    droppedAttempts,
    checkoutStats,
  })
}
