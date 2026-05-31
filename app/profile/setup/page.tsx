import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { getFirstName } from "@/lib/michael-names"
import ProfileForm from "./ProfileForm"
import styles from "./page.module.css"

export default async function ProfileSetupPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/")

  const member = await prisma.member.findUnique({
    where: { email: session.user.email },
  })
  if (!member) redirect("/join")
  if (member.profileComplete) redirect("/dashboard")

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logoMark}>House of Michaels</div>
      </header>

      <div className={styles.intro}>
        <p className={styles.introEyebrow}>You&apos;re in.</p>
        <h1 className={styles.introHeading}>
          Complete your profile,<br />
          <span>{getFirstName(member.name)}.</span>
        </h1>
        <p className={styles.introSub}>
          Two minutes. This is how other Michaels find you — and how you find them.
        </p>
      </div>

      <ProfileForm firstName={getFirstName(member.name)} tier={member.tier} />
    </div>
  )
}
