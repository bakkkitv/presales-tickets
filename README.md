# PresaleTickets

Shows from artists you actually listen to.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://127.0.0.1:5175

## Redirect URIs

**Spotify Developer Dashboard:**
```
http://127.0.0.1:5175/api/spotify/callback
```

**Supabase Auth → Spotify provider:**
```
https://<project-ref>.supabase.co/auth/v1/callback
```

**Supabase Auth → Apple provider:**
```
https://<project-ref>.supabase.co/auth/v1/callback
```

## Env vars

| Variable | Source |
|---|---|
| `PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `PUBLIC_SUPABASE_ANON_KEY` | Same page (anon/public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page (service_role, secret) |
| `SPOTIFY_CLIENT_ID` | Spotify Developer Dashboard |
| `SPOTIFY_CLIENT_SECRET` | Spotify Developer Dashboard |
| (Apple Music) | Disabled for now (don’t put Apple private keys in `PUBLIC_` env vars) |

## Deploy

```bash
npx vercel
```

Set env vars in Vercel project settings. Update redirect URIs to your Vercel domain.
