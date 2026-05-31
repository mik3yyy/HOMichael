import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { emailPostResponse } from "@/lib/email"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const post = await prisma.post.findUnique({
    where: { id: params.id },
    include: { author: true },
  })
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 })
  }

  if (post.authorId === member.id) {
    return NextResponse.json({ error: "Cannot respond to your own post" }, { status: 400 })
  }

  const { message } = await req.json()

  await prisma.postResponse.upsert({
    where: { postId_memberId: { postId: post.id, memberId: member.id } },
    update: { message: message || null },
    create: {
      postId: post.id,
      memberId: member.id,
      message: message || null,
    },
  })

  // Email the post author
  await emailPostResponse({
    toEmail: post.author.email,
    toName: post.author.firstName,
    fromName: member.name,
    postTitle: post.title,
    message,
  })

  return NextResponse.json({ ok: true })
}
