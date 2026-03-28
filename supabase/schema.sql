-- Graduation Song Request Platform — Database Schema
-- Run this in Supabase SQL Editor

-- 1. Users table
CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username            TEXT UNIQUE NOT NULL,
  password_hash       TEXT NOT NULL,
  first_name          TEXT NOT NULL DEFAULT '',
  last_name           TEXT NOT NULL DEFAULT '',
  display_name        TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  email               TEXT UNIQUE,
  role                TEXT NOT NULL DEFAULT 'user',
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  identity_confirmed  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT now(),
  last_login_at       TIMESTAMPTZ
);

-- 2. Allowed names (whitelist for Layer 2)
CREATE TABLE allowed_names (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  user_id     UUID UNIQUE REFERENCES users(id)
);

-- 3. Songs table
CREATE TABLE songs (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL REFERENCES users(id),
  song_name                   TEXT NOT NULL,
  artist                      TEXT,
  notes                       TEXT,
  music_api_id                TEXT,
  added_after_first_session   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_songs_all" ON songs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_read_all_songs" ON songs
  FOR SELECT USING (TRUE);

-- 4. OTP codes table
CREATE TABLE otp_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  code_hash   TEXT NOT NULL,
  email       TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 4b. User security settings (optional 2FA)
CREATE TABLE user_security_settings (
  user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  two_factor_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- 5. Activity log table
CREATE TABLE activity_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  event_type    TEXT NOT NULL,
  success       BOOLEAN,
  ip_address    INET,
  country_code  TEXT,
  city          TEXT,
  user_agent    TEXT,
  geo_alert     BOOLEAN NOT NULL DEFAULT FALSE,
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_songs_user_id ON songs(user_id);
CREATE INDEX idx_songs_created_at ON songs(created_at);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_event_type ON activity_log(event_type);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);
CREATE INDEX idx_otp_codes_user_id ON otp_codes(user_id);
CREATE INDEX idx_otp_codes_expires_at ON otp_codes(expires_at);
CREATE INDEX idx_users_username ON users(username);
