export type ImpactOutcome = 'rescued' | 'expired' | 'removed' | 'donated';

export interface ImpactRecord {
  id: string;
  user_id: string;
  household_id?: string | null;
  item_id?: string | null;
  item_name: string;
  outcome: ImpactOutcome;
  quantity_amount: number;
  quantity_unit: string;
  estimated_weight_g?: number;
  estimated_cost_cents?: number;
  co2_saved_g?: number;
  recorded_at: string;
  created_at: string;
}

export type ImpactPeriod = 'week' | 'month' | 'all_time';

export interface UserImpactSummary {
  id: string;
  user_id: string;
  period: ImpactPeriod;
  period_start: string;
  items_rescued: number;
  items_expired: number;
  weight_saved_g: number;
  money_saved_cents: number;
  co2_avoided_g: number;
  updated_at: string;
}

export type AchievementTier = 'bronze' | 'silver' | 'gold';
export type AchievementCategory = 'getting_started' | 'consistency' | 'impact' | 'rescue' | 'exploration';
export type ThresholdType = 'count' | 'streak' | 'cumulative';

export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon_url?: string;
  tier: AchievementTier;
  category: AchievementCategory;
  threshold_value: number;
  threshold_type: ThresholdType;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  progress: number;
  is_seen: boolean;
  achievement?: Achievement; // For joined queries
}

export type ChallengeType = 'weekly' | 'monthly' | 'seasonal';
export type ChallengeGoalType = 'rescue_count' | 'rescue_percent' | 'money_saved';

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: ChallengeType;
  goal_value: number;
  goal_type: ChallengeGoalType;
  start_date: string;
  end_date: string;
  reward_badge_id?: string;
  created_at: string;
}

export type ChallengeStatus = 'active' | 'completed' | 'abandoned' | 'failed';

export interface UserChallenge {
  id: string;
  user_id: string;
  challenge_id: string;
  status: ChallengeStatus;
  progress: number;
  enrolled_at: string;
  completed_at?: string;
  challenge?: Challenge; // For joined queries
}
