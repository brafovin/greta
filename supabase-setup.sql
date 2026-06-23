-- FunFlow – Supabase setup
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rooms (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  description      TEXT        NOT NULL DEFAULT '',
  category         TEXT        NOT NULL DEFAULT 'chill',
  host_id          TEXT        NOT NULL,
  host_username    TEXT        NOT NULL,
  max_participants INTEGER     NOT NULL DEFAULT 20,
  is_private       BOOLEAN     NOT NULL DEFAULT FALSE,
  tags             TEXT[]      NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.participants (
  room_id        UUID        NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id        TEXT        NOT NULL,
  username       TEXT        NOT NULL,
  avatar         TEXT        NOT NULL DEFAULT '#7c3aed',
  is_muted       BOOLEAN     NOT NULL DEFAULT FALSE,
  is_speaking    BOOLEAN     NOT NULL DEFAULT FALSE,
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID        NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id    TEXT        NOT NULL,
  username   TEXT        NOT NULL,
  avatar     TEXT        NOT NULL DEFAULT '#7c3aed',
  text       TEXT        NOT NULL,
  reactions  JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Realtime ──────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.rooms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rooms_select"        ON public.rooms        FOR SELECT USING (true);
CREATE POLICY "rooms_insert"        ON public.rooms        FOR INSERT WITH CHECK (true);
CREATE POLICY "rooms_delete"        ON public.rooms        FOR DELETE USING (true);

CREATE POLICY "participants_select" ON public.participants FOR SELECT USING (true);
CREATE POLICY "participants_insert" ON public.participants FOR INSERT WITH CHECK (true);
CREATE POLICY "participants_update" ON public.participants FOR UPDATE USING (true);
CREATE POLICY "participants_delete" ON public.participants FOR DELETE USING (true);

CREATE POLICY "messages_select"     ON public.messages     FOR SELECT USING (true);
CREATE POLICY "messages_insert"     ON public.messages     FOR INSERT WITH CHECK (true);
CREATE POLICY "messages_update"     ON public.messages     FOR UPDATE USING (true);
CREATE POLICY "messages_delete"     ON public.messages     FOR DELETE USING (true);

-- ── Stale participant cleanup ─────────────────────────────────────────────────
-- Participants stop sending heartbeats when they close the tab without leaving.
-- Run this periodically (e.g. via a Supabase cron job or Edge Function):
--
--   DELETE FROM public.participants WHERE last_heartbeat < NOW() - INTERVAL '90 seconds';
--   DELETE FROM public.rooms
--     WHERE id NOT IN (SELECT DISTINCT room_id FROM public.participants)
--       AND created_at < NOW() - INTERVAL '1 minute';
--
-- Or create the helper function below and call it from a pg_cron job:

CREATE OR REPLACE FUNCTION public.cleanup_stale_data()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.participants WHERE last_heartbeat < NOW() - INTERVAL '90 seconds';
  DELETE FROM public.rooms
    WHERE id NOT IN (SELECT DISTINCT room_id FROM public.participants)
      AND created_at < NOW() - INTERVAL '1 minute';
END;
$$;

-- Allow anon/authenticated users to call cleanup (triggered client-side on join)
GRANT EXECUTE ON FUNCTION public.cleanup_stale_data() TO anon;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_data() TO authenticated;

-- ── Apple Sign In (Supabase Auth) ─────────────────────────────────────────────
-- In Supabase Dashboard → Authentication → Providers → Apple:
-- 1. Enable Apple provider
-- 2. Enter your Apple Services ID (Client ID) and private key
-- 3. Add your Vercel domain to "Redirect URLs":
--    https://<your-app>.vercel.app
--
-- In Apple Developer:
-- 1. Create an App ID with "Sign In with Apple" capability
-- 2. Create a Services ID with the same domain + redirect URL
-- 3. Create a private key for Sign In with Apple → download the .p8 file
-- 4. Enter Client ID, Team ID, Key ID, and private key content in Supabase
