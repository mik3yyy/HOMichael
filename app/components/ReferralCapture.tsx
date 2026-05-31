"use client"
import { useSearchParams } from "next/navigation"
import { useEffect } from "react"

export default function ReferralCapture() {
  const params = useSearchParams()

  useEffect(() => {
    const ref = params.get("ref")
    if (ref) {
      // 7-day cookie
      document.cookie = `hom_ref=${ref}; path=/; max-age=604800; SameSite=Lax`
    }
  }, [params])

  return null
}
