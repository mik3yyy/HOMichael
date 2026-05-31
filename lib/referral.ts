import { randomBytes } from "crypto"
import { prisma } from "./db"

export function generateReferralCode(): string {
  return randomBytes(4).toString("hex").toUpperCase()
}

const TIER_THRESHOLDS = [
  { level: "GOAT", min: 25 },
  { level: "MJ", min: 10 },
  { level: "MIKE", min: 5 },
  { level: "MEMBER", min: 0 },
] as const

export function computeTierLevel(referralCount: number): string {
  return (
    TIER_THRESHOLDS.find((t) => referralCount >= t.min)?.level ?? "MEMBER"
  )
}

export async function creditReferrer(referredByCode: string) {
  const referrer = await prisma.member.findUnique({
    where: { referralCode: referredByCode },
  })
  if (!referrer) return

  const count = await prisma.member.count({
    where: { referredByCode },
  })

  const tierLevel = computeTierLevel(count)

  await prisma.member.update({
    where: { id: referrer.id },
    data: { tierLevel },
  })
}
