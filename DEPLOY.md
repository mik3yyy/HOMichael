# House of Michaels — Full Deployment Guide
## Vercel (hosting) + Neon (PostgreSQL database)

---

## How this works

Your app is a single Next.js project. When you deploy to Vercel:
- The **frontend** (React pages) is served from Vercel's global CDN.
- The **backend** (everything inside `app/api/`) runs as serverless functions on the same Vercel deployment — no separate server needed.
- The **database** lives on Neon, a serverless PostgreSQL provider with a free tier.

You will follow these stages in order:
1. Create the Neon database and push the schema
2. Collect all environment variables
3. Deploy to Vercel and paste in the env vars
4. Update OAuth providers and Stripe to point at your live URL

---

## Stage 1 — Create the Neon database

### 1.1 Create a Neon account

1. Go to **https://neon.tech**
2. Click **Sign up** — you can sign up with GitHub or Google.
3. Verify your email if prompted.

### 1.2 Create a project

1. After logging in you land on the Neon console. Click **New project**.
2. Fill in:
   - **Name:** `house-of-michaels`
   - **Postgres version:** 16 (the default is fine)
   - **Region:** pick the one geographically closest to most of your users (e.g. `AWS / us-east-1` for US, `AWS / eu-west-1` for Europe)
3. Click **Create project**.

Neon creates the project in a few seconds and immediately shows you the connection details.

### 1.3 Copy your two connection strings

On the project page you will see a **Connection string** panel. You need **two** strings — not one.

**String 1 — Pooled (for the running app):**
1. In the Connection string panel, make sure **Pooled connection** is toggled **on**.
2. Copy the string. It looks like:
   ```
   postgresql://user:password@ep-xxx-yyy.region.aws.neon.tech/neondb?sslmode=require&pgbouncer=true
   ```
   This goes into `DATABASE_URL`.

**String 2 — Direct (for schema migrations):**
1. Toggle **Pooled connection** to **off** (or look for "Direct connection" in the same panel).
2. Copy that string. It looks like:
   ```
   postgresql://user:password@ep-xxx-yyy.region.aws.neon.tech/neondb?sslmode=require
   ```
   The only difference is it has no `&pgbouncer=true`. This goes into `DATABASE_DIRECT_URL`.

> **Why two strings?** Vercel's serverless functions need connection pooling (pgbouncer) to avoid exhausting database connections. But Prisma's schema push needs a direct connection. Using both avoids connection errors in production.

### 1.4 Update your local .env with the Neon strings

Open `.env` on your machine and replace the SQLite lines:

```env
DATABASE_URL="postgresql://user:password@ep-xxx-yyy.region.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"
DATABASE_DIRECT_URL="postgresql://user:password@ep-xxx-yyy.region.aws.neon.tech/neondb?sslmode=require"
```

Use your actual copied strings — do not use the placeholders above.

### 1.5 Push the schema to Neon

Run this command once from your project folder:

```bash
npx prisma db push
```

You should see output like:

```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "neondb" at "ep-xxx-yyy..."

🚀  Your database is now in sync with your Prisma schema.

✔ Generated Prisma Client
```

This creates all the tables (`Member`, `Pod`, `CheckIn`, `Post`, `PostResponse`) in your Neon database. You can verify by going to the **Tables** tab in the Neon console.

---

## Stage 2 — Collect all environment variables

Before deploying you need every value ready to paste. Go through each service below and collect the values.

### NEXTAUTH_SECRET
Generate a secure random secret by running this in your terminal:

```bash
openssl rand -base64 32
```

Copy the output string (e.g. `K7f2Lp...`). This is your `NEXTAUTH_SECRET`.

### NEXTAUTH_URL
This is your production URL. You will know it after deploying to Vercel. It will be either:
- The Vercel auto-generated URL: `https://homichael.vercel.app`
- Or your custom domain if you add one later.

You can set this after your first deploy. For now leave it blank and come back.

### Google OAuth credentials
1. Go to **https://console.cloud.google.com**
2. Select your project (or create one: click the project dropdown → **New project**).
3. Go to **APIs & Services → Credentials**.
4. Click **+ Create Credentials → OAuth 2.0 Client ID**.
5. Set **Application type** to **Web application**.
6. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
   (You will add the production URL here after deploy — see Stage 4.)
7. Click **Create**. Google shows you the **Client ID** and **Client Secret**.
8. Copy both.

### LinkedIn OAuth credentials
1. Go to **https://www.linkedin.com/developers/apps**
2. Click **Create app**.
3. Fill in the app name and associate it with a LinkedIn company page (required — you can create a personal page if needed).
4. Under the **Auth** tab, find **OAuth 2.0 settings**.
5. Under **Authorized redirect URLs**, add:
   ```
   http://localhost:3000/api/auth/callback/linkedin
   ```
6. Under **Products**, request access to **Sign In with LinkedIn using OpenID Connect**.
7. Copy the **Client ID** and **Client Secret** from the Auth tab.

### Stripe keys
1. Go to **https://dashboard.stripe.com**
2. Make sure you are in **Live mode** (toggle in the top-left — use Test mode during testing).
3. Go to **Developers → API keys**.
4. Copy the **Secret key** (`sk_live_...` or `sk_test_...`). This is `STRIPE_SECRET_KEY`.
5. You will get `STRIPE_WEBHOOK_SECRET` in Stage 4 after you have a live URL.

### Resend API key
1. Go to **https://resend.com** and create a free account.
2. Go to **API Keys → Create API Key**.
3. Name it `house-of-michaels`, set permission to **Full access**.
4. Copy the key (`re_...`). This is `RESEND_API_KEY`.
5. While here, go to **Domains** and add your domain if you have one (so emails come from your domain instead of `onboarding@resend.dev`).

### OWNER_EMAIL
Just your email address — submissions from the "Message the Owner" form will arrive here.

---

## Stage 3 — Deploy to Vercel

### 3.1 Create a Vercel account

1. Go to **https://vercel.com**
2. Click **Sign up** and choose **Continue with GitHub** (recommended — Vercel will have access to your repos).

### 3.2 Import the repository

1. From the Vercel dashboard click **Add New → Project**.
2. Under **Import Git Repository**, find `mik3yyy/HOMichael` and click **Import**.
3. Vercel detects it is a Next.js app and pre-fills the build settings. Leave them exactly as they are:
   - **Framework Preset:** Next.js
   - **Build Command:** `prisma generate && next build`
   - **Output Directory:** `.next`
   - **Install Command:** `npm install`

### 3.3 Add environment variables

Before clicking Deploy, scroll down to the **Environment Variables** section on the same screen. Add each variable one at a time:

| Name | Value |
|---|---|
| `DATABASE_URL` | Your Neon pooled connection string |
| `DATABASE_DIRECT_URL` | Your Neon direct connection string |
| `NEXTAUTH_SECRET` | The `openssl rand` output from Stage 2 |
| `NEXTAUTH_URL` | Leave blank for now — add after first deploy |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `LINKEDIN_CLIENT_ID` | From LinkedIn Developer Portal |
| `LINKEDIN_CLIENT_SECRET` | From LinkedIn Developer Portal |
| `STRIPE_SECRET_KEY` | From Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | Leave blank for now — add after first deploy |
| `RESEND_API_KEY` | From Resend |
| `OWNER_EMAIL` | Your email address |

For each row: type the variable name in the **Name** field, paste the value in the **Value** field, make sure **Production** is checked, then press **Add**.

### 3.4 Deploy

Click **Deploy**.

Vercel will:
1. Install dependencies (`npm install`)
2. Generate the Prisma client (`prisma generate`)
3. Build the Next.js app (`next build`)
4. Deploy to its global CDN

This takes about 60–90 seconds. When it finishes you will see a **Congratulations** screen with your live URL (e.g. `https://homichael.vercel.app`).

**Copy that URL.** You need it for the next two stages.

### 3.5 Set NEXTAUTH_URL

1. In Vercel, go to your project → **Settings → Environment Variables**.
2. Find `NEXTAUTH_URL`, click the pencil icon to edit.
3. Set the value to your live URL, e.g. `https://homichael.vercel.app`.
4. Click **Save**.

After saving an env var, you must redeploy for it to take effect:
- Go to **Deployments** tab → find the latest deployment → click the three-dot menu → **Redeploy**.

---

## Stage 4 — Connect OAuth providers and Stripe to your live URL

### 4.1 Google — add the production redirect URI

1. Go back to **https://console.cloud.google.com → APIs & Services → Credentials**.
2. Click your OAuth 2.0 Client.
3. Under **Authorized redirect URIs**, click **+ Add URI** and add:
   ```
   https://your-domain.vercel.app/api/auth/callback/google
   ```
   Replace `your-domain` with your actual Vercel subdomain.
4. Click **Save**.

### 4.2 LinkedIn — add the production redirect URI

1. Go to **https://www.linkedin.com/developers/apps** → your app → **Auth** tab.
2. Under **Authorized redirect URLs**, add:
   ```
   https://your-domain.vercel.app/api/auth/callback/linkedin
   ```
3. Click **Update**.

### 4.3 Stripe — create the production webhook

1. Go to **https://dashboard.stripe.com/webhooks**.
2. Click **+ Add endpoint**.
3. Set **Endpoint URL** to:
   ```
   https://your-domain.vercel.app/api/webhook
   ```
4. Click **Select events**, search for and check:
   - `checkout.session.completed`
5. Click **Add endpoint**.
6. On the webhook detail page, click **Reveal** next to **Signing secret**.
7. Copy the value (`whsec_...`).

Now add it to Vercel:
1. Go to Vercel → your project → **Settings → Environment Variables**.
2. Add `STRIPE_WEBHOOK_SECRET` with the `whsec_...` value.
3. Redeploy (**Deployments → latest → three-dot menu → Redeploy**).

---

## Stage 5 — Verify the live app

Open your production URL and test the following:

- [ ] Home page loads
- [ ] Sign in with Google works (redirects back to `/dashboard`)
- [ ] Sign in with LinkedIn works
- [ ] Profile setup form saves correctly
- [ ] Directory shows members
- [ ] Stripe checkout opens on the `/join` page
- [ ] A test payment completes and the member is created in Neon (check the **Tables** tab in Neon console)
- [ ] "Message the Owner" sends an email to `OWNER_EMAIL`

---

## Redeploying after code changes

Every time you push to `main` on GitHub, Vercel automatically triggers a new deployment. You do not need to do anything manually. The build runs `prisma generate && next build` each time.

If you change the Prisma schema (add a new field or model), you also need to run `npx prisma db push` locally (with your Neon `.env` values) to apply the schema change to the live database before or after deploying.

---

## Troubleshooting

**Build fails: "Environment variable not found: DATABASE_DIRECT_URL"**
→ You forgot to add `DATABASE_DIRECT_URL` in Vercel env vars. Add it and redeploy.

**Sign-in redirects to an error page**
→ `NEXTAUTH_URL` doesn't match the domain you're signing in from. Update it in Vercel env vars to the exact URL including `https://`, then redeploy.

**Google/LinkedIn OAuth returns "redirect_uri_mismatch"**
→ The redirect URI in the provider's console doesn't match. Make sure you added `https://your-domain.vercel.app/api/auth/callback/google` (or `/linkedin`) to the authorized URIs.

**Stripe webhook returns 400 "No signatures found"**
→ `STRIPE_WEBHOOK_SECRET` is wrong or missing. It must be the signing secret from the specific webhook endpoint (not the API key). Reveal it again in Stripe Dashboard → Webhooks → your endpoint.

**App loads but shows "Application error"**
→ Check Vercel's **Functions** tab or **Deployments → your deployment → View Function Logs** to see the actual error.

**Prisma: "prepared statement already exists"**
→ You're hitting connection limit issues. Confirm `DATABASE_URL` uses the pooled string with `&pgbouncer=true`, not the direct one.
