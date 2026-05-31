"use client"
import { signIn } from "next-auth/react"
import styles from "./SignInButtons.module.css"

export default function SignInButtons() {
  return (
    <div className={styles.group}>
      <button
        className={styles.provider}
        onClick={() => signIn("google", { callbackUrl: "/join" })}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
            fill="#4285F4"
          />
          <path
            d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
            fill="#34A853"
          />
          <path
            d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
            fill="#FBBC05"
          />
          <path
            d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </button>

      <button
        className={styles.provider}
        onClick={() => signIn("linkedin", { callbackUrl: "/join" })}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect width="18" height="18" rx="2" fill="#0A66C2" />
          <path
            d="M4.5 7H6.5V14H4.5V7ZM5.5 4C4.672 4 4 4.672 4 5.5S4.672 7 5.5 7 7 6.328 7 5.5 6.328 4 5.5 4ZM8 7H10V8C10.4 7.4 11.2 7 12 7C13.8 7 14 8.5 14 9.5V14H12V10C12 9.4 12 8.5 11 8.5 10 8.5 10 9.5 10 10V14H8V7Z"
            fill="white"
          />
        </svg>
        Continue with LinkedIn
      </button>
    </div>
  )
}
