const FROM = "House of Michaels <noreply@houseofmichaels.com>"

interface EmailPayload {
  to: string
  subject: string
  html: string
}

async function send(payload: EmailPayload) {
  const key = process.env.RESEND_API_KEY
  if (!key) return // silently skip in dev without key

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, ...payload }),
  })
}

export async function emailPostResponse({
  toEmail,
  toName,
  fromName,
  postTitle,
  message,
}: {
  toEmail: string
  toName: string
  fromName: string
  postTitle: string
  message?: string
}) {
  await send({
    to: toEmail,
    subject: `${fromName} responded to your post`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:32px;">
        <p style="color:#c9a84c;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;">House of Michaels</p>
        <h2 style="margin:8px 0 24px;">You got a response, ${toName}.</h2>
        <p><strong>${fromName}</strong> responded to your post:</p>
        <blockquote style="border-left:3px solid #c9a84c;padding-left:16px;color:#666;margin:16px 0;">
          "${postTitle}"
        </blockquote>
        ${message ? `<p>Their message: <em>"${message}"</em></p>` : ""}
        <p>Log in to the house to follow up.</p>
        <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#c9a84c;color:#000;text-decoration:none;font-weight:700;font-size:12px;letter-spacing:0.1em;">
          OPEN THE HOUSE →
        </a>
      </div>
    `,
  })
}

export async function emailOwnerMessage({
  fromName,
  fromEmail,
  subject,
  message,
}: {
  fromName: string
  fromEmail: string
  subject: string
  message: string
}) {
  const ownerEmail = process.env.OWNER_EMAIL
  if (!ownerEmail) return

  await send({
    to: ownerEmail,
    subject: `[House] ${fromName}: ${subject}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:32px;">
        <p style="color:#c9a84c;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;">Message from the House</p>
        <p><strong>From:</strong> ${fromName} (${fromEmail})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0;"/>
        <p style="white-space:pre-wrap;">${message}</p>
      </div>
    `,
  })
}
