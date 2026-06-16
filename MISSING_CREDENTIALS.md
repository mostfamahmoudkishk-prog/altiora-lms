# Missing Credentials Guide - Altiora Production Deployment

The following environment variables are defined in `.env.example` but are currently missing from the local `.env` environment. For a successful production deployment, please ensure they are generated and configured in your hosting environment (e.g., Vercel / Supabase).

---

## 1. Database & Prisma

### `DIRECT_URL`
- **Why Needed**: Prisma requires a direct, unpooled database connection string to execute schema migrations (`prisma db push` or `prisma migrate deploy`). The primary `DATABASE_URL` typically connects through a transaction pooler (which does not support schema modifications).
- **How to Obtain**: 
  1. Go to your **Supabase Dashboard** -> Project Settings -> Database.
  2. Under **Connection string**, select the **Direct connection** mode (typically port 5432).
  3. Copy the URL and replace connection parameters with your password.

---

## 2. Supabase SDK Client Configurations

### `SUPABASE_URL`
- **Why Needed**: Used by the backend and client-side Supabase client SDKs to query user database profiles, storage buckets, and auth schemas.
- **How to Obtain**: Find this in **Supabase Dashboard** -> Project Settings -> API -> Project URL.

### `SUPABASE_ANON_KEY`
- **Why Needed**: The anonymous public key used on the frontend to communicate with Supabase services safely within Row-Level Security rules.
- **How to Obtain**: Find this in **Supabase Dashboard** -> Project Settings -> API -> Project API Keys -> `anon` (public).

### `SUPABASE_SERVICE_ROLE_KEY`
- **Why Needed**: A high-privilege key used on secure backend API endpoints to bypass database Row-Level Security (RLS) policies for administrative operations.
- **How to Obtain**: Find this in **Supabase Dashboard** -> Project Settings -> API -> Project API Keys -> `service_role` (secret). Keep this highly secure!

---

## 3. Bunny CDN & Pull Zones

### `BUNNY_PULL_ZONE`
- **Why Needed**: Identifies the specific CDN Pull Zone linked to your Bunny Stream or storage resources.
- **How to Obtain**: Log into the **Bunny.net Dashboard** -> Pull Zones. Copy the name or ID of the pull zone created for Altiora assets.

### `BUNNY_CDN_URL`
- **Why Needed**: Used to serve streaming thumbnails, metadata, and custom course file attachments through a global cache.
- **How to Obtain**: Found in **Bunny.net Dashboard** under your Pull Zone's **Linked Hostnames** (e.g., `https://altiora-cdn.b-cdn.net`).

---

## 4. Cloudflare Stream Integration

### `CLOUDFLARE_ACCOUNT_ID`
- **Why Needed**: Identifies your Cloudflare account to manage video streams, uploads, and playback credentials.
- **How to Obtain**: Log into the **Cloudflare Dashboard**, select your domain or account, and copy the **Account ID** shown on the sidebar.

### `CLOUDFLARE_STREAM_TOKEN`
- **Why Needed**: Authorizes secure video chunk uploads and metadata generation via the Cloudflare Stream API.
- **How to Obtain**: In **Cloudflare Dashboard** -> My Profile -> API Tokens -> Create Token -> Select **Cloudflare Stream** template.

---

## 5. WebRTC / TURN Servers

### `TURN_URI`
- **Why Needed**: The WebRTC TURN/STUN connection URI for fallback signaling (essential for live streams when direct peer-to-peer is blocked by symmetric NATs/firewalls).
- **How to Obtain**: Copy the URI scheme (e.g., `turn:global.relay.metered.ca:443`) from your WebRTC TURN server provider dashboard (e.g., Metered.ca, Twilio, or Xirsys).

### `TURN_USERNAME`
- **Why Needed**: The dynamic or static username credential to authenticate connection requests on the TURN server.
- **How to Obtain**: Provided by your TURN service dashboard.

### `TURN_PASSWORD`
- **Why Needed**: The credential password/secret to validate the connection session on the TURN server.
- **How to Obtain**: Provided by your TURN service dashboard.
