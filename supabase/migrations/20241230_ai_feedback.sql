-- AI Feedback Migration
-- Stores user feedback (thumbs up/down) on AI responses

-- Create ai_feedback table
CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  -- Message context
  message_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  -- Feedback
  rating TEXT NOT NULL CHECK (rating IN ('positive', 'negative')),
  comment TEXT,
  -- Context metadata
  screen_context TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_ai_feedback_user_id ON ai_feedback(user_id);
CREATE INDEX idx_ai_feedback_rating ON ai_feedback(rating);
CREATE INDEX idx_ai_feedback_created_at ON ai_feedback(created_at DESC);
CREATE INDEX idx_ai_feedback_screen_context ON ai_feedback(screen_context);

-- Enable RLS
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback"
  ON ai_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
  ON ai_feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own feedback
CREATE POLICY "Users can update their own feedback"
  ON ai_feedback FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own feedback
CREATE POLICY "Users can delete their own feedback"
  ON ai_feedback FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_ai_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_feedback_updated_at
  BEFORE UPDATE ON ai_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_feedback_updated_at();

-- Comment on table
COMMENT ON TABLE ai_feedback IS 'Stores user feedback on AI chat responses';
COMMENT ON COLUMN ai_feedback.rating IS 'positive = thumbs up, negative = thumbs down';
COMMENT ON COLUMN ai_feedback.comment IS 'Optional user comment explaining the feedback';
COMMENT ON COLUMN ai_feedback.screen_context IS 'Which screen the user was on when they provided feedback';

