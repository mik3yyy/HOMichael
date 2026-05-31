import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import LinkedInProvider from "next-auth/providers/linkedin"
import { prisma } from "./db"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
      authorization: {
        params: { scope: "openid profile email" },
      },
      issuer: "https://www.linkedin.com",
      jwks_endpoint: "https://www.linkedin.com/oauth/openid/jwks",
      async profile(profile) {
        return {
          id: profile.sub,
          name: `${profile.given_name} ${profile.family_name}`,
          email: profile.email,
          image: profile.picture,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, trigger }) {
      if (
        token.email &&
        (trigger === "signIn" || trigger === "update" || !token.checked)
      ) {
        try {
          const member = await prisma.member.findUnique({
            where: { email: token.email as string },
          })
          token.isMember = !!member
          token.tier = member?.tier
          token.tierLevel = member?.tierLevel
          token.profileComplete = member?.profileComplete ?? false
          token.checked = true
        } catch {
          token.isMember = false
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.isMember = token.isMember as boolean
        session.user.tier = token.tier as string | undefined
        session.user.tierLevel = token.tierLevel as string | undefined
        session.user.profileComplete = token.profileComplete as boolean
      }
      return session
    },
  },
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
  },
}
