import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import Link from "next/link"
import styles from "./page.module.css"

function tierLabel(tier: string, tierLevel: string): string {
  if (tierLevel === "GOAT") return "◈ GOAT"
  if (tierLevel === "MJ") return "◈ MJ Tier"
  if (tierLevel === "MIKE") return "◈ Mike Tier"
  return tier === "MICHAEL" ? "◈ Michael Tier" : "◈ Inspired Tier"
}

export default async function MemberProfilePage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/")
  if (!session.user.isMember) redirect("/join")

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
      _count: { select: { posts: true } },
    },
  })

  if (!member) notFound()

  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const helpTags = member.canHelpWith
    ? member.canHelpWith.split(",").map((t) => t.trim()).filter(Boolean)
    : []
  const lookingTags = member.lookingFor
    ? member.lookingFor.split(",").map((t) => t.trim()).filter(Boolean)
    : []

  const joined = new Date(member.joinedAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link href="/dashboard" className={styles.back}>← Back to the house</Link>

        <div className={styles.card}>
          {/* Header */}
          <div className={styles.profileHeader}>
            <div className={styles.avatar}>
              {member.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.avatarUrl} alt={member.name} className={styles.avatarImg} />
              ) : (
                initials
              )}
            </div>
            <div className={styles.profileInfo}>
              <h1 className={styles.name}>{member.name}</h1>
              <p className={styles.location}>
                {[member.city, member.country].filter(Boolean).join(", ")}
                {member.industry && ` · ${member.industry}`}
              </p>
              <span className="tag tag-gold" style={{ marginTop: 8, display: "inline-block" }}>
                {tierLabel(member.tier, member.tierLevel)}
              </span>
            </div>
          </div>

          <div className={styles.divider} />

          {/* Bio */}
          {member.bio && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>About</div>
              <p className={styles.sectionText}>{member.bio}</p>
            </div>
          )}

          {/* Building */}
          {member.building && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Building</div>
              <p className={styles.sectionText}>{member.building}</p>
            </div>
          )}

          {/* Help with */}
          {helpTags.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Can help with</div>
              <div className={styles.tags}>
                {helpTags.map((t) => (
                  <span key={t} className="tag">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Looking for */}
          {lookingTags.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Looking for</div>
              <div className={styles.tags}>
                {lookingTags.map((t) => (
                  <span key={t} className="tag">{t}</span>
                ))}
              </div>
            </div>
          )}

          <div className={styles.divider} />

          {/* Meta */}
          <div className={styles.meta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Member since</span>
              <span className={styles.metaValue}>{joined}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Posts</span>
              <span className={styles.metaValue}>{member._count.posts}</span>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            {member.linkedinUrl && (
              <a
                href={member.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
              >
                LinkedIn →
              </a>
            )}
            <Link href="/dashboard" className="btn btn-gold" style={{ flex: 1, justifyContent: "center" }}>
              Back to the House
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
