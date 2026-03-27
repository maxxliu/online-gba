-- ═══════════════════════════════════════════════════════════
-- RetroPlay Cloud Sync — Initial Schema
-- ═══════════════════════════════════════════════════════════

-- ROM metadata (binary data lives in Storage bucket)
-- NOTE: name and filename are stored as plaintext (encryption planned for future)
CREATE TABLE user_roms (
  rom_id         TEXT NOT NULL,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  filename       TEXT NOT NULL,
  size           INTEGER NOT NULL,
  added_at       BIGINT NOT NULL,
  last_played_at BIGINT,
  storage_path   TEXT NOT NULL,
  updated_at     BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  PRIMARY KEY (user_id, rom_id)
);

-- Save state metadata (binary data lives in Storage bucket)
CREATE TABLE user_save_states (
  id             TEXT NOT NULL,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rom_id         TEXT NOT NULL,
  slot           INTEGER NOT NULL,
  created_at     BIGINT NOT NULL,
  playtime       INTEGER NOT NULL,
  screenshot_path TEXT,
  storage_path   TEXT NOT NULL,
  updated_at     BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE user_settings (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  settings   JSONB NOT NULL DEFAULT '{}'::JSONB,
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE TABLE user_playtime (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rom_id      TEXT NOT NULL,
  seconds     INTEGER NOT NULL DEFAULT 0,
  last_played BIGINT NOT NULL,
  updated_at  BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  PRIMARY KEY (user_id, rom_id)
);

-- ═══════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════

ALTER TABLE user_roms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own roms" ON user_roms
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE user_save_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own save states" ON user_save_states
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE user_playtime ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own playtime" ON user_playtime
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- Storage Buckets
-- ═══════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public) VALUES ('rom-data', 'rom-data', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('save-state-data', 'save-state-data', false);

-- Storage RLS: users can only access objects in their own folder
CREATE POLICY "Users manage own rom files" ON storage.objects
  FOR ALL USING (
    bucket_id = 'rom-data' AND (storage.foldername(name))[1] = auth.uid()::text
  ) WITH CHECK (
    bucket_id = 'rom-data' AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users manage own save state files" ON storage.objects
  FOR ALL USING (
    bucket_id = 'save-state-data' AND (storage.foldername(name))[1] = auth.uid()::text
  ) WITH CHECK (
    bucket_id = 'save-state-data' AND (storage.foldername(name))[1] = auth.uid()::text
  );
