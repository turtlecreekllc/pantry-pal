
-- PRD-004: Food Waste Gamification Strategy Database Schema

-- 1. Impact Records
CREATE TYPE impact_outcome AS ENUM ('rescued', 'expired', 'removed', 'donated');

CREATE TABLE impact_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    household_id UUID REFERENCES households(id) ON DELETE SET NULL, -- Optional link to household
    item_id UUID, -- Can be null if item is deleted
    item_name TEXT NOT NULL,
    outcome impact_outcome NOT NULL,
    quantity_amount NUMERIC NOT NULL,
    quantity_unit TEXT NOT NULL,
    estimated_weight_g NUMERIC, -- Estimated weight in grams
    estimated_cost_cents INTEGER, -- Estimated cost in cents
    co2_saved_g NUMERIC, -- Estimated CO2 saved in grams (only for rescued items)
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying user impact over time
CREATE INDEX idx_impact_records_user_date ON impact_records(user_id, recorded_at);

-- 2. User Impact Summaries (for fast dashboard loading)
-- We can use a materialized view or just a regular table updated via triggers/cron.
-- For now, a regular table updated via application logic or triggers is safer for real-time feedback.
CREATE TYPE impact_period AS ENUM ('week', 'month', 'all_time');

CREATE TABLE user_impact_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period impact_period NOT NULL,
    period_start TIMESTAMPTZ NOT NULL, -- e.g., start of week/month, or user join date for all_time
    items_rescued INTEGER DEFAULT 0,
    items_expired INTEGER DEFAULT 0,
    weight_saved_g NUMERIC DEFAULT 0,
    money_saved_cents INTEGER DEFAULT 0,
    co2_avoided_g NUMERIC DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, period, period_start)
);

-- 3. Achievements
CREATE TYPE achievement_tier AS ENUM ('bronze', 'silver', 'gold');
CREATE TYPE achievement_category AS ENUM ('getting_started', 'consistency', 'impact', 'rescue', 'exploration');
CREATE TYPE threshold_type AS ENUM ('count', 'streak', 'cumulative');

CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE, -- e.g., 'first_scan', 'rescue_10'
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_url TEXT, -- Or icon name
    tier achievement_tier NOT NULL,
    category achievement_category NOT NULL,
    threshold_value NUMERIC NOT NULL,
    threshold_type threshold_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Achievements
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    progress NUMERIC DEFAULT 0, -- Current progress value
    is_seen BOOLEAN DEFAULT FALSE, -- For showing "New Badge" animation
    UNIQUE(user_id, achievement_id)
);

-- 5. Challenges
CREATE TYPE challenge_type AS ENUM ('weekly', 'monthly', 'seasonal');
CREATE TYPE challenge_goal_type AS ENUM ('rescue_count', 'rescue_percent', 'money_saved');

CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    type challenge_type NOT NULL,
    goal_value NUMERIC NOT NULL,
    goal_type challenge_goal_type NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    reward_badge_id UUID REFERENCES achievements(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. User Challenges
CREATE TYPE challenge_status AS ENUM ('active', 'completed', 'abandoned', 'failed');

CREATE TABLE user_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    status challenge_status DEFAULT 'active',
    progress NUMERIC DEFAULT 0,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(user_id, challenge_id)
);

-- Seed some initial achievements based on PRD
INSERT INTO achievements (key, name, description, tier, category, threshold_value, threshold_type) VALUES
('first_scan', 'First Scan', 'Scan your first receipt or shelf', 'bronze', 'getting_started', 1, 'count'),
('pantry_pioneer', 'Pantry Pioneer', 'Add 20 items to your pantry', 'bronze', 'getting_started', 20, 'count'),
('waste_warrior_bronze', 'Waste Warrior', 'Rescue 10 items', 'bronze', 'impact', 10, 'cumulative'),
('waste_warrior_silver', 'Waste Warrior', 'Rescue 50 items', 'silver', 'impact', 50, 'cumulative'),
('waste_warrior_gold', 'Waste Warrior', 'Rescue 100 items', 'gold', 'impact', 100, 'cumulative'),
('money_saver_bronze', 'Saver', 'Save $50 in food costs', 'bronze', 'impact', 5000, 'cumulative'), -- cents
('money_saver_silver', 'Super Saver', 'Save $100 in food costs', 'silver', 'impact', 10000, 'cumulative');

-- RLS Policies

-- Impact Records: Users can view/create their own
ALTER TABLE impact_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own impact records" ON impact_records
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- User Impact Summaries: Users can view their own
ALTER TABLE user_impact_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own impact summaries" ON user_impact_summaries
    USING (auth.uid() = user_id);

-- Achievements: Public read
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Achievements are public readable" ON achievements
    FOR SELECT USING (true);

-- User Achievements: Users view/manage their own
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own achievements" ON user_achievements
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Challenges: Public read
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Challenges are public readable" ON challenges
    FOR SELECT USING (true);

-- User Challenges: Users view/manage their own
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own challenges" ON user_challenges
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

