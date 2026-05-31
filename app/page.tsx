import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import ReferralCapture from "./components/ReferralCapture"
import Onboarding from "./components/Onboarding"

export default async function LandingPage() {
  const session = await getServerSession(authOptions)

  if (session?.user?.isMember) {
    redirect(session.user.profileComplete ? "/dashboard" : "/profile/setup")
  }
  if (session?.user?.email) redirect("/join")

  return (
    <>
      <Suspense fallback={null}>
        <ReferralCapture />
      </Suspense>
      <Onboarding />
    </>
  )
}
