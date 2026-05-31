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
  const type = searchParams.get("type") || "HELPME"
  const category = searchParams.get("category") || ""

  const posts = await prisma.post.findMany({
    where: {
      type,
      ...(category && { category }),
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          name: true,
          city: true,
          tier: true,
          tierLevel: true,
          avatarUrl: true,
        },
      },
      _count: { select: { responses: true } },
    },
  })

  return NextResponse.json(posts)
}

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

  const { type, category, title, body, tags } = await req.json()

  if (!type || !category || !title || !body) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const post = await prisma.post.create({
    data: {
      type,
      category,
      title,
      body,
      tags: JSON.stringify(
        Array.isArray(tags)
          ? tags
          : String(tags)
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
      ),
      authorId: member.id,
    },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          name: true,
          city: true,
          tier: true,
          tierLevel: true,
        },
      },
      _count: { select: { responses: true } },
    },
  })

  return NextResponse.json(post, { status: 201 })
}
