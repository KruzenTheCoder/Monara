-- ════════════════════════════════════════════════════════
--  Monara Gamification & Rewards — Supabase Migration
-- ════════════════════════════════════════════════════════

-- ── Gamification Profile ──
CREATE TABLE IF NOT EXISTS user_gamification (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp      INTEGER NOT NULL DEFAULT 0,
  level         INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  signup_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  total_entries INTEGER NOT NULL DEFAULT 0,
  today_action_count INTEGER NOT NULL DEFAULT 0,
  today_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  weekly_consistency JSONB NOT NULL DEFAULT '{"weekStart":"","activeDays":[],"bonusClaimed":false}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Action Logs (audit trail + anti-abuse) ──
CREATE TABLE IF NOT EXISTS gamification_action_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type   TEXT NOT NULL CHECK (action_type IN (
    'LOGIN', 'EXPENSE_LOG', 'INCOME_LOG', 'BUDGET_CREATE',
    'DASHBOARD_VIEW', 'BILL_PAY', 'SAVINGS_CONTRIBUTION'
  )),
  xp_earned     INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_action_logs_user_date
  ON gamification_action_logs(user_id, created_at DESC);

-- ── Badges ──
CREATE TABLE IF NOT EXISTS user_badges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id      TEXT NOT NULL,
  unlocked      BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_at   TIMESTAMPTZ,
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user
  ON user_badges(user_id);

-- ── Milestones ──
CREATE TABLE IF NOT EXISTS user_milestones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_id  TEXT NOT NULL,
  achieved      BOOLEAN NOT NULL DEFAULT FALSE,
  achieved_at   TIMESTAMPTZ,
  UNIQUE(user_id, milestone_id)
);

CREATE INDEX IF NOT EXISTS idx_user_milestones_user
  ON user_milestones(user_id);

-- ── Row Level Security ──
ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_milestones ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own data
CREATE POLICY "Users manage own gamification"
  ON user_gamification FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own action logs"
  ON gamification_action_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own badges"
  ON user_badges FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own milestones"
  ON user_milestones FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Auto-update updated_at trigger ──
CREATE OR REPLACE FUNCTION update_gamification_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_gamification_updated
  BEFORE UPDATE ON user_gamification
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_timestamp();

-- ── Initialize gamification profile on user signup ──
CREATE OR REPLACE FUNCTION init_gamification_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_gamification (user_id, signup_date)
  VALUES (NEW.id, CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Hook into the existing profiles table insert (adjust trigger name if needed)
-- If you already have a profiles table trigger, add the gamification init there instead
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_init_gamification'
  ) THEN
    CREATE TRIGGER trg_init_gamification
      AFTER INSERT ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION init_gamification_profile();
  END IF;
END;
$$;
