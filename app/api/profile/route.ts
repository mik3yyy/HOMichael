import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { assignToPod } from "@/lib/pods"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const member = await prisma.member.findUnique({
    where: { email: session.user.email },
  })
  if (!member) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 })
  }

  const {
    city,
    country,
    industry,
    bio,
    building,
    canHelpWith,
    lookingFor,
    avatarUrl,
    linkedinUrl,
  } = await req.json()

  await prisma.member.update({
    where: { id: member.id },
    data: {
      city: city || null,
      country: country || null,
      industry: industry || null,
      bio: bio || null,
      building: building || null,
      canHelpWith: canHelpWith || null,
      lookingFor: lookingFor || null,
      avatarUrl: avatarUrl || null,
      linkedinUrl: linkedinUrl || null,
      profileComplete: true,
    },
  })

  // Assign to a pod if not already in one
  if (!member.podId) {
    await assignToPod(member.id)
  }

  return NextResponse.json({ ok: true })
}
