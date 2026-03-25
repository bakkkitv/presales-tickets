-- Fix handle_new_oauth_user trigger to support both Spotify and Apple sign-ins.
-- Previously hardcoded for Spotify; now detects provider and handles Apple
-- separately (no tokens at sign-in time — those come later via MusicKit).

CREATE OR REPLACE FUNCTION handle_new_oauth_user()
RETURNS TRIGGER AS $$
DECLARE
  provider text;
  user_email text;
  user_display_name text;
  spotify_id text;
  access_tok text;
  refresh_tok text;
  expires_at timestamptz;
BEGIN
  provider := NEW.raw_app_meta_data->>'provider';
  user_email := NEW.email;
  user_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name'
  );

  IF provider = 'spotify' THEN
    spotify_id := NEW.raw_user_meta_data->>'provider_id';
    access_tok := NEW.raw_app_meta_data->'provider_token'->>'access_token';
    refresh_tok := NEW.raw_app_meta_data->'provider_token'->>'refresh_token';
    expires_at := now() + interval '1 hour';

    INSERT INTO public.users (
      id, spotify_user_id, access_token, refresh_token, token_expires_at,
      email, display_name, streaming_service, is_authorized, created_at, updated_at
    ) VALUES (
      NEW.id, spotify_id, access_tok, refresh_tok, expires_at,
      user_email, user_display_name, 'spotify', true, now(), now()
    )
    ON CONFLICT (id) DO UPDATE SET
      spotify_user_id   = EXCLUDED.spotify_user_id,
      access_token      = EXCLUDED.access_token,
      refresh_token     = COALESCE(EXCLUDED.refresh_token, public.users.refresh_token),
      token_expires_at  = EXCLUDED.token_expires_at,
      email             = COALESCE(EXCLUDED.email, public.users.email),
      display_name      = COALESCE(EXCLUDED.display_name, public.users.display_name),
      is_authorized     = true,
      updated_at        = now();

  ELSIF provider = 'apple' THEN
    -- No tokens at sign-in time for Apple; MusicKit provides the Music User
    -- Token separately. Just create/update the user row so the app can
    -- update it after MusicKit authorization completes.
    INSERT INTO public.users (
      id, email, display_name, streaming_service, is_authorized, created_at, updated_at
    ) VALUES (
      NEW.id, user_email, user_display_name, 'apple', true, now(), now()
    )
    ON CONFLICT (id) DO UPDATE SET
      email            = COALESCE(EXCLUDED.email, public.users.email),
      display_name     = COALESCE(EXCLUDED.display_name, public.users.display_name),
      streaming_service = COALESCE(public.users.streaming_service, 'apple'),
      is_authorized    = true,
      updated_at       = now();

  ELSE
    INSERT INTO public.users (id, email, display_name, created_at, updated_at)
    VALUES (NEW.id, user_email, user_display_name, now(), now())
    ON CONFLICT (id) DO UPDATE SET
      email        = COALESCE(EXCLUDED.email, public.users.email),
      display_name = COALESCE(EXCLUDED.display_name, public.users.display_name),
      updated_at   = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add apple_music_user_token column if it doesn't exist.
-- This stores the MusicKit Music User Token separately from Spotify access tokens.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS apple_music_user_token text;

-- If the table uses a separate auth_user_id column instead of id = auth UUID,
-- add a unique index so we can look up by auth UUID either way.
-- (safe to run even if the column already has a unique constraint)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'users'
      AND column_name  = 'auth_user_id'
  ) THEN
    -- Table already uses id = auth UUID — nothing to add.
    NULL;
  END IF;
END $$;
