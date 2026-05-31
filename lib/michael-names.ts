// All known Michael variants across languages and cultures
const MICHAEL_VARIANTS = new Set([
  // English
  "michael", "mike", "mikey", "micky", "mickey", "mick",
  // French / German
  "michel", "micha",
  // Spanish / Portuguese
  "miguel",
  // Italian
  "michele",
  // Polish
  "michal",
  // Nordic
  "mikael", "mikkel", "mikko",
  // Russian / Eastern European
  "mikhail", "misha", "mischa", "mihail", "mihails", "michail",
  // Ukrainian
  "mykhailo",
  // Irish
  "micheal",
  // Scottish Gaelic
  "micheil",
  // Basque
  "mikel",
  // Maori / Samoan
  "mikaele",
  // Hebrew transliteration
  "mikha", "mikha'el",
  // Arabic
  "mikha'il",
])

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
}

// Returns true if any part of the full name is a Michael variant
export function isMichaelVariant(fullName: string): boolean {
  const parts = fullName.trim().split(/\s+/)
  return parts.some((p) => MICHAEL_VARIANTS.has(normalize(p)))
}

export function getTier(fullName: string): "MICHAEL" | "INSPIRED" {
  return isMichaelVariant(fullName) ? "MICHAEL" : "INSPIRED"
}

export function getPrice(tier: "MICHAEL" | "INSPIRED"): number {
  return tier === "MICHAEL" ? 25 : 35
}

export function getPriceCents(tier: "MICHAEL" | "INSPIRED"): number {
  return tier === "MICHAEL" ? 2500 : 3500
}

export function getFirstName(fullName: string): string {
  return (fullName || "").trim().split(/\s+/)[0] || fullName
}

// Returns the Michael-variant part of a full name if one exists,
// otherwise returns the first name. Ensures personalisation always
// highlights the Michael name (e.g. "Michael" from "Chibuikem Michael Okpechi").
export function getMichaelName(fullName: string): string {
  const parts = (fullName || "").trim().split(/\s+/)
  const michaelPart = parts.find((p) => MICHAEL_VARIANTS.has(normalize(p)))
  return michaelPart ?? parts[0] ?? fullName
}
