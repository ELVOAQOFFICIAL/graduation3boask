# Graduation3BOASK

Next.js 14 graduation song request platform with 3-layer auth, Supabase backend, Cloudflare Turnstile, and Resend email OTP.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Fill `.env.local`.
3. Run development server:

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Cloudflare Pages Deploy

This project is configured for Cloudflare Pages using `@cloudflare/next-on-pages`.

1. Build Cloudflare output:

```bash
npm run cf:build
```

2. Deploy to Pages project `graduation3boask`:

```bash
npm run cf:deploy
```

## Required Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `RESEND_API_KEY`
- `ADMIN_ALERT_EMAIL`
- `ADMIN_USERNAME_HASH`
- `ADMIN_PASSWORD_HASH`
- `NEXT_PUBLIC_APP_URL`

## Database Setup

Run in Supabase SQL Editor:

1. `supabase/schema.sql`
2. `supabase/seed-data.sql`
