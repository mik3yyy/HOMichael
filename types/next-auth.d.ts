import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null
      email?: string | null
      image?: string | null
      isMember?: boolean
      tier?: string
      tierLevel?: string
      profileComplete?: boolean
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isMember?: boolean
    tier?: string
    tierLevel?: string
    profileComplete?: boolean
    checked?: boolean
  }
}
