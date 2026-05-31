# Deploying House of Michaels — Vercel + Neon Postgres

This is a Next.js 14 app. Vercel hosts everything — frontend pages and backend API routes run as serverless functions in the same deployment. There is no separate backend server.

---

## Step 1 — Set up the database (Neon Postgres)

1. Go to **https://neon.tech** and create a free account.
2. Create a new project (name it `house-of-michaels` or similar).
3. Once created, open the **Connection Details** panel.
4. You need two connection strings:
   - **Pooled connection** (labeled "Connection string" with pgbouncer) → this is your `DATABASE_URL`
   - **Direct connection** (labeled "Direct connection") → this is your `DATABASE_DIRECT_URL`
5. Copy both strings — you'll paste them into Vercel env vars in Step 3.

Push the schema to Neon (run this once from your local machine):

```bash
# Set your real Neon URLs in .env first, then:
npx prisma db push
```

This creates all the tables in your Neon database.

---

## Step 2 — Connect your GitHub repo to Vercel

1. Go to **https://vercel.com** and sign in (or create a free account).
2. Click **Add New → Project**.
3. Import the `HOMichael` repository from GitHub (`mik3yyy/HOMichael`).
4. Vercel auto-detects Next.js. Leave the build settings as-is:
   - **Build Command:** `prisma generate && next build` *(already set in package.json)*
   - **Output Directory:** `.next`
   - **Install Command:** `npm install`
5. Do **not** click Deploy yet — add env vars first.

---

## Step 3 — Set environment variables on Vercel

In the project settings, go to **Settings → Environment Variables** and add every variable below. Set them for **Production** (and optionally Preview).

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Neon → pooled connection string |
| `DATABASE_DIRECT_URL` | Neon → direct connection string |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` in your terminal |
| `NEXTAUTH_URL` | Your Vercel production URL, e.g. `https://homichael.vercel.app` |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → OAuth 2.0 credentials |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → OAuth 2.0 credentials |
| `LINKEDIN_CLIENT_ID` | LinkedIn Developer Portal → your app |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn Developer Portal → your app |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys (use `sk_live_...` for prod) |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks (set up in Step 5) |
| `RESEND_API_KEY` | https://resend.com → API Keys |
| `OWNER_EMAIL` | Your email address |

---

## Step 4 — Deploy

Click **Deploy** on Vercel (or push a commit to `main` — Vercel deploys automatically on every push).

Once deployed, Vercel gives you a URL like `https://homichael.vercel.app`. That is your live app.

---

## Step 5 — Update OAuth redirect URIs

After you have your production URL, update the allowed redirect URIs in each OAuth provider.

### Google
1. Go to **https://console.cloud.google.com → APIs & Services → Credentials**.
2. Open your OAuth 2.0 client.
3. Under **Authorized redirect URIs**, add:
   ```
   https://your-domain.vercel.app/api/auth/callback/google
   ```

### LinkedIn
1. Go to **https://www.linkedin.com/developers/apps** → your app → Auth.
2. Under **Authorized redirect URLs**, add:
   ```
   https://your-domain.vercel.app/api/auth/callback/linkedin
   ```

---

## Step 6 — Set up the Stripe webhook

Stripe needs to notify your app when a payment completes.

1. Go to **https://dashboard.stripe.com/webhooks**.
2. Click **Add endpoint**.
3. Set the endpoint URL to:
   ```
   https://your-domain.vercel.app/api/webhook
   ```
4. Select the event: **`checkout.session.completed`**
5. After saving, Stripe shows the **Signing secret** (`whsec_...`).
6. Copy it and set `STRIPE_WEBHOOK_SECRET` in your Vercel env vars (then redeploy or trigger a redeploy so Vercel picks up the new value).

---

## Step 7 — Update NEXTAUTH_URL

Once you know your final domain (custom domain or the `.vercel.app` URL), make sure `NEXTAUTH_URL` in Vercel env vars matches it exactly, including `https://`. Mismatched URLs cause sign-in failures.

---

## Custom domain (optional)

1. In Vercel, go to **Settings → Domains**.
2. Add your domain and follow the DNS instructions Vercel provides.
3. After the domain is live, update `NEXTAUTH_URL` and the OAuth redirect URIs to the new domain.

---

## Local development vs production

| | Local | Production |
|---|---|---|
| Database | SQLite (`file:./dev.db`) | Neon PostgreSQL |
| Auth URL | `http://localhost:3000` | `https://your-domain.vercel.app` |
| Stripe | Test keys (`sk_test_...`) | Live keys (`sk_live_...`) |
| Webhook | Stripe CLI (`stripe listen`) | Stripe Dashboard endpoint |

For local dev, keep `DATABASE_URL=file:./dev.db` and `DATABASE_DIRECT_URL` unset in your local `.env`. The `directUrl` field in `schema.prisma` only matters when connecting to Neon.

---

## Troubleshooting

**Build fails with "prisma generate" error**
→ Make sure `prisma` is in `dependencies` (not just `devDependencies`) in `package.json`. It already is in this project.

**Sign-in redirect fails**
→ Check that `NEXTAUTH_URL` matches your Vercel domain exactly and that the OAuth provider has the correct callback URI.

**Stripe webhook returns 400**
→ Verify `STRIPE_WEBHOOK_SECRET` is the signing secret from the Stripe Dashboard (not the API key). Re-deploy after updating it.

**Database connection error on Vercel**
→ Use the pooled connection string (`?pgbouncer=true`) for `DATABASE_URL`. Vercel's serverless functions need connection pooling.
