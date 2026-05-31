"use client"
import { useState } from "react"
import styles from "./CheckoutButton.module.css"

export default function CheckoutButton({
  tier,
  price,
}: {
  tier: "MICHAEL" | "INSPIRED"
  price: number
}) {
  const [loading, setLoading] = useState(false)

  async function handleCheckout() {
    setLoading(true)
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  return (
    <button
      className={styles.btn}
      onClick={handleCheckout}
      disabled={loading}
    >
      {loading ? (
        <span className={styles.spinner} />
      ) : (
        <>Pay ${price} — Enter the House</>
      )}
    </button>
  )
}
