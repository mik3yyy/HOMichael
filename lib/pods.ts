import { prisma } from "./db"

const POD_SIZE = 5

export async function assignToPod(memberId: string): Promise<string> {
  // Find a pod with space
  const openPod = await prisma.pod.findFirst({
    where: { members: { none: {} } },
    include: { _count: { select: { members: true } } },
  })

  // Re-query with count filter (SQLite doesn't support havingRaw easily)
  const pods = await prisma.pod.findMany({
    include: { _count: { select: { members: true } } },
  })

  const available = pods.find((p) => p._count.members < POD_SIZE)

  let podId: string

  if (available) {
    podId = available.id
  } else {
    const cohort = pods.length + 1
    const newPod = await prisma.pod.create({
      data: { cohort },
    })
    podId = newPod.id
  }

  await prisma.member.update({
    where: { id: memberId },
    data: { podId },
  })

  return podId
}

export function getCurrentWeek(): string {
  const now = new Date()
  const d = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  )
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  )
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`
}
