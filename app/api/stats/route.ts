import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [totalMembers, activeCollabs, helpRequests, countries] =
    await Promise.all([
      prisma.member.count(),
      prisma.post.count({ where: { type: "COLLAB" } }),
      prisma.post.count({ where: { type: "HELPME" } }),
      prisma.member
        .groupBy({ by: ["country"] })
        .then((rows) => rows.filter((r) => r.country).length),
    ])

  return NextResponse.json({ totalMembers, activeCollabs, helpRequests, countries })
}
