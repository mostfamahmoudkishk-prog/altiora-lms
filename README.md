# Altiora - Premium Educational Platform

Altiora is a state-of-the-art, premium educational platform featuring student and teacher dashboards, real-time communications, secure video delivery, and WebRTC-based live streaming capabilities.

## Key Features

- **Teacher Dashboard & Course Builder**: Complete course management with drag-and-drop module and lesson reordering.
- **Secure Video Playback**: Video playback is secured and restricted to the custom **Altiora Desktop Player** (Electron + React) featuring:
  - Screenshot/Screen-sharing protection.
  - Active screen recording detection (blocking OBS, Camtasia, etc.).
  - Signed URLs (5-minute regeneration) and dynamic watermarking.
- **Mediasoup WebRTC Live Streaming**: Low-latency teacher-to-student streaming with:
  - Video, audio, and screen sharing.
  - Interactive features like chat, participant list, raised hands, and recording support.
- **Real-Time Notification Center**: Socket.IO powered real-time notification alerts (counter and center).
- **Security & Anti-Cheat**: Secure device tracking and session limit enforcement.

---

## Technical Stack

- **Framework**: TanStack Start / Vite / TypeScript
- **Database**: PostgreSQL (Supabase) via Prisma ORM
- **Real-Time / Streaming**: Socket.IO, Mediasoup SFU (WebRTC)
- **Email Delivery**: Resend API
- **Caching**: Upstash Redis

---

## Environment Variables

Create a `.env` file in the root directory. You can copy [.env.example](file:///.env.example) to start:

```bash
cp .env.example .env
```

Ensure all variables are configured:

### Database Connections
- `DATABASE_URL`: Connection string for PostgreSQL (with connection pooling).
- `DIRECT_URL`: Direct connection string for PostgreSQL (used for Prisma migrations).

### Authentication & Security
- `JWT_SECRET`: Secret key used for signing JWT authentication tokens.
- `PLAYER_SECRET`: Secret key used to encrypt desktop player communication tokens.
- `SUPER_ADMIN_EMAIL`: Default super admin email address.
- `SUPER_ADMIN_PASSWORD_HASH`: Bcrypt password hash for the default super admin.

### Bunny CDN / Video Streaming
- `BUNNY_API_KEY`: API key for managing Bunny Stream libraries.
- `BUNNY_LIBRARY_ID`: Bunny Stream Library ID.
- `BUNNY_PULL_ZONE`: Bunny Pull Zone identifier.
- `BUNNY_CDN_URL`: Pull Zone CDN domain (e.g., `https://example.b-cdn.net`).
- `BUNNY_CDN_HOST`: Content Delivery hostname.
- `BUNNY_STREAM_HOSTNAME`: Stream API endpoint.

### Cloudflare Stream
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account identifier.
- `CLOUDFLARE_STREAM_TOKEN`: API Token for Cloudflare Stream uploads.

### TURN / WebRTC Servers
- `METERED_TURN_USERNAME`: Metered TURN service username.
- `METERED_TURN_CREDENTIAL`: Metered TURN service credential key.

### Supabase Integration
- `SUPABASE_URL`: Supabase project URL endpoint.
- `SUPABASE_ANON_KEY`: Supabase client anonymous public key.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (bypass RLS).

### Email Service
- `RESEND_API_KEY`: API key for the Resend transactional email service.

### Upstash Redis Cache
- `UPSTASH_REDIS_REST_URL`: Upstash Redis database URL.
- `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis database token.

### Sentry Error Reporting
- `SENTRY_DSN`: Sentry DSN key for logging frontend and backend exceptions.

### GitHub Auth Token
- `GH_TOKEN`: Personal Access Token for managing desktop player auto-updates.

---

## Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd altiora
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Synchronize Prisma Database**:
   Validate your Prisma schema and generate client types:
   ```bash
   npx prisma validate
   npx prisma generate
   ```

---

## Commands & Scripts

### Local Development

Start the development server (runs Vite/TanStack Start):
```bash
npm run dev
```

### Production Build

1. Build the production package:
   ```bash
   npm run build
   ```

2. Run the production preview server locally:
   ```bash
   npm run start
   ```

---

## Altiora Desktop Player (Electron Client)

To develop or build the secure Electron Desktop Player:

1. **Navigate to the player folder**:
   ```bash
   cd apps/altiora-player
   ```

2. **Install Player dependencies**:
   ```bash
   npm install
   ```

3. **Run Player in Dev Mode**:
   ```bash
   npm run electron:dev
   ```

4. **Package Player for Production** (.exe/.dmg):
   ```bash
   npm run dist
   ```

---

## Vercel Deployment Notes

To deploy Altiora on Vercel:

1. **Prisma Client Generation**: Ensure `npx prisma generate` is run during the build step. In Vercel Project Settings, set your **Build Command** to:
   ```bash
   npx prisma generate && npm run build
   ```
2. **Environment Variables**: Add all variables defined in `.env.example` to the **Environment Variables** tab in your Vercel Dashboard.
3. **Database Migrations**: Run database migrations out-of-band or via a hook command before deploying:
   ```bash
   npx prisma db push
   ```
