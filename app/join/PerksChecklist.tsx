"use client"
import { useState } from "react"
import styles from "./page.module.css"

const PERKS = [
  "Founding member rate — locked in forever the moment you pay",
  "Lifetime access — no subscriptions, no renewals, no recurring charges. Ever.",
  "A private network of builders who carry the same name",
  "Weekly accountability pods — five Michaels, one mission, no excuses",
  "A community scaling together toward $1,000 extra per member per month",
  // ── show more ──
  "Discounted tools, software & services negotiated exclusively for members",
  "Discounted experiences — events, retreats, and real-world meetups",
  "The Directory — every Michael in one room when it opens August 10",
  "Collab Board — post an opportunity, find your co-founder, close deals",
  "Help Me network — one post, the right Michael always responds",
  "Early access to products built by Michaels before the world sees them",
  "Ability to shape the house — vote on what gets built next",
]

const VISIBLE = 5

export default function PerksChecklist() {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? PERKS : PERKS.slice(0, VISIBLE)

  return (
    <ul className={styles.perksList}>
      {shown.map((perk) => (
        <li key={perk} className={styles.perksItem}>
          <span className={styles.perksCheck}>✓</span>
          {perk}
        </li>
      ))}
      <li>
        <button
          className={styles.perksToggle}
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Show less ↑" : `+ ${PERKS.length - VISIBLE} more included`}
        </button>
      </li>
    </ul>
  )
}
