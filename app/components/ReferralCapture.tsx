"use client"
import { useSearchParams } from "next/navigation"
import { useEffect } from "react"

export default function ReferralCapture() {
  const params = useSearchParams()

  useEffect(() => {
    const ref = params.get("ref")
    if (ref) {
      const secure = location.protocol === "https:" ? "; Secure" : ""
      document.cookie = `hom_ref=${ref}; path=/; max-age=604800; SameSite=Lax${secure}`
    }
  }, [params])

  return null
}
