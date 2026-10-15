# Poem Repo

A small app for writing, publishing, and reading poems. React + Vite on the
frontend, Supabase for auth, data, and storage. No custom backend — the browser
talks to Supabase directly and Row Level Security (RLS) decides who can do what.

## Stack

- **Frontend:** React 18 + Vite + TypeScript, React Router
- **Backend:** Supabase (Auth, Postgres + RLS)
- **Hosting:** Netlify (static SPA)

## Features

- Sign in with Google
- Write poems (line breaks preserved), with a live preview
- Public poems or private drafts (`is_public`)
- Edit and delete your own poems
- Like poems, with a denormalized `like_count` kept in sync by a trigger
- Feed sorted by **Newest** or **Most liked**, with pagination
- Profiles with username, display name, and bio
- **My Poems** and **Liked** dashboards
- Username chosen by the user on first sign-in (auto-suggested from Google)

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your Supabase values:

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://<your-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-or-publishable-key>
```

The anon/publishable key is safe to expose in the browser because RLS protects
the data.

### 3. Run

```bash
npm run dev
```

## Database

The schema lives in Supabase. Applying the migration creates:

| Table      | Purpose                                             |
| ---------- | --------------------------------------------------- |
| `profiles` | One row per user; auto-created on signup by trigger |
| `poems`    | Poems, with `author_id`, `is_public`, `like_count`  |
| `likes`    | `(user_id, poem_id)` composite key prevents dupe likes |

Plus triggers:

- `handle_new_user` — creates a `profiles` row on signup, with an auto-generated
  unique username
- `handle_like_count_change` — keeps `poems.like_count` accurate on like/unlike
- `handle_updated_at` — bumps `updated_at` on poem edits

RLS policies:

- **profiles** — readable by everyone; only the owner can update
- **poems** — anyone can read public poems (authors can also read their own
  private ones); authors can insert/update/delete only their own
- **likes** — readable by everyone; users can add/remove only their own

Trigger functions have `EXECUTE` revoked from `PUBLIC` so they can't be called
over the REST API — the triggers themselves are unaffected.

## Google login setup

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   create an **OAuth client ID** (Web application).
2. Add Supabase's callback URL as an authorized redirect URI:
   `https://<your-ref>.supabase.co/auth/v1/callback`
3. In Supabase: **Authentication → Providers → Google**, paste the client ID and
   secret, and enable the provider.
4. In Supabase: **Authentication → URL Configuration**, add your Netlify URL and
   `http://localhost:5173` to the allowed redirect URLs.

## Deploying to Netlify

1. Push this repo to GitHub.
2. In Netlify, **Add new site → Import an existing project** and pick the repo.
   The `netlify.toml` handles the build settings.
3. In **Site settings → Environment variables**, add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY`.
4. After the first deploy, add the Netlify URL to Supabase's allowed redirect
   URLs (see above).

`public/_redirects` and `netlify.toml` both include the SPA fallback rule
(`/* /index.html 200`) so deep links like `/poem/<id>` work on refresh.

## Project structure

```
src/
  lib/
    supabase.ts      # Supabase client
    AuthContext.tsx  # Session state + sign in/out
    username.ts      # Detects auto-generated usernames
    types.ts         # Profile / Poem types
  components/
    Layout.tsx       # Top bar + nav
    RequireAuth.tsx  # Route guard
    PoemCard.tsx     # Feed card
    LikeButton.tsx   # Like / unlike
  pages/
    Feed.tsx         # Public feed, newest / most liked
    PoemPage.tsx     # Single poem view
    WritePoem.tsx    # Create + edit
    Profile.tsx      # User profile
    MyPoems.tsx      # Own poems dashboard
    LikedPoems.tsx   # Liked poems dashboard
    Login.tsx        # Google sign-in
    UsernameSetup.tsx# Choose a username on first login
```
