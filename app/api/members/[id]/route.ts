import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const member = await prisma.member.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      firstName: true,
      tier: true,
      tierLevel: true,
      city: true,
      country: true,
      industry: true,
      bio: true,
      building: true,
      canHelpWith: true,
      lookingFor: true,
      avatarUrl: true,
      linkedinUrl: true,
      joinedAt: true,
      _count: { select: { posts: true, responses: true } },
    },
  })

  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(member)
}
