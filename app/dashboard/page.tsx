import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { getFirstName } from "@/lib/michael-names"
import { getCurrentWeek } from "@/lib/pods"
import DashboardClient from "./DashboardClient"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/")

  const member = await prisma.member.findUnique({
    where: { email: session.user.email },
    include: {
      pod: {
        include: {
          members: {
            select: {
              id: true, firstName: true, name: true,
              city: true, industry: true, avatarUrl: true, email: true,
            },
          },
        },
      },
    },
  })

  if (!member) redirect("/join")
  if (!member.profileComplete) redirect("/profile/setup")

  const week = getCurrentWeek()

  const directoryUnlocked = process.env.DIRECTORY_UNLOCKED === "true"
  const launchDate = new Date("2026-08-10")
  const daysLeft = Math.max(0, Math.ceil((launchDate.getTime() - Date.now()) / 86400000))

  const [stats, recentPosts, podCheckIns, myCheckIn, referralCount] = await Promise.all([
    Promise.all([
      prisma.member.count(),
      prisma.post.count({ where: { type: "COLLAB" } }),
      prisma.post.count({ where: { type: "HELPME" } }),
      prisma.member.groupBy({ by: ["country"] }).then((r) => r.filter((x) => x.country).length),
    ]).then(([m, c, h, co]) => ({ totalMembers: m + 1149, activeCollabs: c, helpRequests: h, countries: co + 20 })),

    prisma.post.findMany({
      take: 3,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, firstName: true, city: true, tier: true, tierLevel: true } },
        _count: { select: { responses: true } },
      },
    }),

    member.podId
      ? prisma.checkIn.findMany({
          where: { podId: member.podId, week },
          select: { memberId: true },
        })
      : [],

    member.podId
      ? prisma.checkIn.findUnique({
          where: { memberId_week: { memberId: member.id, week } },
        })
      : null,

    prisma.member.count({ where: { referredByCode: member.referralCode } }),
  ])

  const checkedInIds = new Set(podCheckIns.map((c) => c.memberId))

  const podMembers = member.pod?.members.map((m) => ({
    ...m,
    checkedIn: checkedInIds.has(m.id),
    isMe: m.email === session.user.email,
  })) ?? []

  const isOwner = session.user.email === process.env.OWNER_EMAIL

  return (
    <DashboardClient
      member={{
        id: member.id,
        name: member.name,
        firstName: member.firstName,
        tier: member.tier,
        tierLevel: member.tierLevel,
        email: member.email,
        referralCode: member.referralCode,
        podCohort: member.pod?.cohort ?? null,
      }}
      initialStats={stats}
      initialRecentPosts={JSON.parse(JSON.stringify(recentPosts))}
      podMembers={podMembers}
      myCheckIn={myCheckIn ? { lastWeek: myCheckIn.lastWeek ?? "", thisWeek: myCheckIn.thisWeek ?? "", blocker: myCheckIn.blocker ?? "" } : null}
      referralCount={referralCount}
      baseUrl={process.env.NEXTAUTH_URL || "http://localhost:3000"}
      directoryUnlocked={directoryUnlocked}
      directoryDaysLeft={daysLeft}
      totalMembers={stats.totalMembers}
      isOwner={isOwner}
    />
  )
}
