import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const industry = searchParams.get("industry") || ""
  const tier = searchParams.get("tier") || ""
  const country = searchParams.get("country") || ""
  const cursor = searchParams.get("cursor") || undefined
  const take = 12

  const where: Record<string, unknown> = {
    profileComplete: true,
    ...(search && {
      OR: [
        { name: { contains: search } },
        { city: { contains: search } },
        { industry: { contains: search } },
        { building: { contains: search } },
      ],
    }),
    ...(industry && { industry }),
    ...(country && { country }),
    ...(tier === "michael" && { tier: "MICHAEL" }),
    ...(tier === "inspired" && { tier: "INSPIRED" }),
    ...(tier === "mike" && { tierLevel: "MIKE" }),
    ...(tier === "mj" && { tierLevel: "MJ" }),
    ...(tier === "goat" && { tierLevel: "GOAT" }),
  }

  const [members, total] = await Promise.all([
    prisma.member.findMany({
      where,
      take,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: { joinedAt: "desc" },
      select: {
        id: true,
        name: true,
        firstName: true,
        tier: true,
        tierLevel: true,
        city: true,
        country: true,
        industry: true,
        building: true,
        canHelpWith: true,
        lookingFor: true,
        avatarUrl: true,
        linkedinUrl: true,
        joinedAt: true,
      },
    }),
    prisma.member.count({ where }),
  ])

  const nextCursor = members.length === take ? members[members.length - 1].id : null

  return NextResponse.json({ members, total, nextCursor })
}
