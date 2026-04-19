import { supabase } from './supabase';
import {
  ImpactRecord,
  UserImpactSummary,
  Achievement,
  UserAchievement,
  PantryItem,
  Unit,
  ImpactOutcome
} from './types';

// Environmental Impact Calculations (CO2 kg per kg of food)
const CO2_PER_KG: Record<string, number> = {
  'Meat': 15.0, // Average of Beef (27) and Poultry (6.9)
  'Dairy': 9.0, // Average of Cheese (13.5) and Milk/Eggs
  'Produce': 1.5, // Average of Veg (2.0) and Fruit (1.1)
  'Bakery': 1.4,
  'Pasta & Grains': 2.7,
  'Pantry': 2.0, // Generic average
  'Frozen': 3.0,
  'Snacks': 2.0,
  'Beverages': 0.5,
  'Other': 2.0,
};

// Estimated weight per unit if not specified (in grams)
const WEIGHT_ESTIMATES: Record<string, number> = {
  'item': 250, // Average item weight
  'cup': 240,
  'tbsp': 15,
  'tsp': 5,
  'oz': 28.35,
  'lb': 453.6,
  'g': 1,
  'kg': 1000,
  'ml': 1,
  'l': 1000,
};

// Estimated cost per unit (in cents) - very rough estimates
const COST_ESTIMATES: Record<string, number> = {
  'item': 300, // $3.00
  'lb': 400, // $4.00/lb
  'kg': 880,
  'oz': 25,
  'g': 1,
  'ml': 0.5,
  'l': 200, // $2.00/L
  'cup': 100,
  'tbsp': 10,
  'tsp': 5,
};

// Achievement definitions for onboarding
export const ONBOARDING_ACHIEVEMENTS = {
  setup_complete: {
    key: 'setup_complete',
    name: 'Getting Started',
    description: 'Complete your profile setup',
    icon: '🎯',
    category: 'getting_started',
    threshold: 1,
    tokenReward: 50, // Bonus tokens for completing onboarding
  },
  first_pantry_item: {
    key: 'first_pantry_item',
    name: 'Pantry Pioneer',
    description: 'Add your first pantry item',
    icon: '🥫',
    category: 'getting_started',
    threshold: 1,
    tokenReward: 10,
  },
  pantry_pro: {
    key: 'pantry_pro',
    name: 'Pantry Pro',
    description: 'Add 10 items to your pantry',
    icon: '📦',
    category: 'getting_started',
    threshold: 10,
    tokenReward: 25,
  },
} as const;

export const gamificationService = {
  /**
   * Calculate estimated weight in grams
   */
  calculateWeight(quantity: number, unit: string): number {
    const unitWeight = WEIGHT_ESTIMATES[unit.toLowerCase()] || 250;
    return quantity * unitWeight;
  },

  /**
   * Calculate estimated cost in cents
   */
  calculateCost(quantity: number, unit: string): number {
    const unitCost = COST_ESTIMATES[unit.toLowerCase()] || 300;
    return quantity * unitCost;
  },

  /**
   * Calculate CO2 avoided in grams
   */
  calculateCO2(weightGrams: number, category: string | null): number {
    const categoryFactor = CO2_PER_KG[category || 'Other'] || 2.0;
    // weight in kg * factor = kg CO2 -> convert to grams
    return (weightGrams / 1000) * categoryFactor * 1000;
  },

  /**
   * Record an impact event (item used, expired, etc.)
   */
  async recordImpact(
    userId: string,
    item: PantryItem,
    outcome: ImpactOutcome,
    amountUsed: number,
    householdId?: string | null
  ): Promise<void> {
    try {
      const weight = this.calculateWeight(amountUsed, item.unit);
      const cost = this.calculateCost(amountUsed, item.unit);
      const co2 = outcome === 'rescued' ? this.calculateCO2(weight, item.category) : 0;

      const record: Partial<ImpactRecord> = {
        user_id: userId,
        household_id: householdId,
        item_id: item.id,
        item_name: item.name,
        outcome,
        quantity_amount: amountUsed,
        quantity_unit: item.unit,
        estimated_weight_g: weight,
        estimated_cost_cents: cost,
        co2_saved_g: co2,
        recorded_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('impact_records').insert(record);

      if (error) throw error;

      // Update summary stats
      await this.updateSummaries(userId, outcome, weight, cost, co2);
      
      // Check for achievements if rescued
      if (outcome === 'rescued') {
        await this.checkAchievements(userId);
      }
    } catch (error) {
      console.error('Error recording impact:', error);
      // Don't block UI on gamification errors
    }
  },

  /**
   * Update user impact summaries (week, month, all_time)
   */
  async updateSummaries(
    userId: string,
    outcome: ImpactOutcome,
    weight: number,
    cost: number,
    co2: number
  ): Promise<void> {
    const periods = ['week', 'month', 'all_time'] as const;
    const now = new Date();
    
    for (const period of periods) {
      let periodStart = new Date();
      if (period === 'week') {
        const day = periodStart.getDay();
        const diff = periodStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
        periodStart.setDate(diff);
        periodStart.setHours(0, 0, 0, 0);
      } else if (period === 'month') {
        periodStart.setDate(1);
        periodStart.setHours(0, 0, 0, 0);
      } else {
        periodStart = new Date(0); // Epoch for all time
      }

      // Upsert logic would be ideal, but for now we'll fetch and update
      // A better approach is an RPC call or backend trigger, but doing client-side for MVP
      const { data: existing, error: fetchError } = await supabase
        .from('user_impact_summaries')
        .select('*')
        .eq('user_id', userId)
        .eq('period', period)
        .eq('period_start', periodStart.toISOString())
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching summary:', fetchError);
        continue;
      }

      const updates = {
        user_id: userId,
        period,
        period_start: periodStart.toISOString(),
        items_rescued: (existing?.items_rescued || 0) + (outcome === 'rescued' ? 1 : 0),
        items_expired: (existing?.items_expired || 0) + (outcome === 'expired' ? 1 : 0),
        weight_saved_g: (existing?.weight_saved_g || 0) + (outcome === 'rescued' ? weight : 0),
        money_saved_cents: (existing?.money_saved_cents || 0) + (outcome === 'rescued' ? cost : 0),
        co2_avoided_g: (existing?.co2_avoided_g || 0) + co2,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from('user_impact_summaries')
        .upsert(updates, { onConflict: 'user_id, period, period_start' });

      if (upsertError) console.error('Error updating summary:', upsertError);
    }
  },

  /**
   * Get impact summary for a user
   */
  async getImpactSummary(userId: string, period: 'week' | 'month' | 'all_time'): Promise<UserImpactSummary | null> {
    const now = new Date();
    let periodStart = new Date();
    
    if (period === 'week') {
      const day = periodStart.getDay();
      const diff = periodStart.getDate() - day + (day === 0 ? -6 : 1);
      periodStart.setDate(diff);
      periodStart.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);
    } else {
      periodStart = new Date(0);
    }

    const { data, error } = await supabase
      .from('user_impact_summaries')
      .select('*')
      .eq('user_id', userId)
      .eq('period', period)
      .eq('period_start', periodStart.toISOString())
      .single();
    
    if (error) {
       if (error.code !== 'PGRST116') console.error('Error fetching impact summary:', error);
       return null;
    }
    
    return data;
  },

  /**
   * Check and unlock achievements
   */
  async checkAchievements(userId: string): Promise<void> {
    // 1. Get user stats (all time)
    const summary = await this.getImpactSummary(userId, 'all_time');
    if (!summary) return;

    // 2. Get all achievements
    const { data: achievements } = await supabase.from('achievements').select('*');
    if (!achievements) return;

    // 3. Get user's unlocked achievements
    const { data: userAchievements } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);
    
    const unlockedIds = new Set(userAchievements?.map(ua => ua.achievement_id));

    // 4. Check each achievement
    for (const achievement of achievements) {
      if (unlockedIds.has(achievement.id)) continue;

      let achieved = false;
      let progress = 0;

      if (achievement.category === 'impact') {
        if (achievement.key.includes('waste_warrior')) {
          progress = summary.items_rescued;
          achieved = progress >= achievement.threshold_value;
        } else if (achievement.key.includes('money_saver')) {
          progress = summary.money_saved_cents;
          achieved = progress >= achievement.threshold_value;
        }
      } else if (achievement.category === 'getting_started' && achievement.key === 'pantry_pioneer') {
        // Check current pantry count
         const { count } = await supabase
          .from('pantry_items')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
         progress = count || 0;
         achieved = progress >= achievement.threshold_value;
      }

      if (achieved) {
        await supabase.from('user_achievements').insert({
          user_id: userId,
          achievement_id: achievement.id,
          progress: progress,
          is_seen: false, // New unlock!
        });
      }
    }
  },

  /**
   * Award onboarding completion achievement and bonus tokens
   */
  async awardOnboardingComplete(userId: string): Promise<{ success: boolean; tokensAwarded?: number }> {
    try {
      const achievement = ONBOARDING_ACHIEVEMENTS.setup_complete;
      
      // Check if already awarded
      const { data: existing } = await supabase
        .from('user_achievements')
        .select('id')
        .eq('user_id', userId)
        .eq('achievement_id', achievement.key)
        .single();
      
      if (existing) {
        console.log('[Gamification] Onboarding achievement already awarded');
        return { success: true, tokensAwarded: 0 };
      }

      // Award the achievement
      const { error: achievementError } = await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: achievement.key,
          progress: 1,
          is_seen: false,
        });

      if (achievementError) {
        console.warn('[Gamification] Error awarding achievement:', achievementError);
        // Continue anyway to try to award tokens
      }

      // Award bonus tokens
      const { error: tokenError } = await supabase
        .from('token_balances')
        .upsert(
          {
            user_id: userId,
            purchased_tokens: achievement.tokenReward,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (tokenError) {
        console.warn('[Gamification] Error awarding tokens:', tokenError);
        // Try alternative method - add to existing balance
        const { data: balance } = await supabase
          .from('token_balances')
          .select('purchased_tokens')
          .eq('user_id', userId)
          .single();

        if (balance) {
          await supabase
            .from('token_balances')
            .update({
              purchased_tokens: (balance.purchased_tokens || 0) + achievement.tokenReward,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);
        }
      }

      console.log(`[Gamification] Awarded ${achievement.tokenReward} tokens for onboarding completion`);
      return { success: true, tokensAwarded: achievement.tokenReward };
    } catch (error) {
      console.error('[Gamification] Error in awardOnboardingComplete:', error);
      return { success: false };
    }
  },

  /**
   * Get user's achievement progress for display
   */
  async getUserAchievements(userId: string): Promise<{
    unlocked: string[];
    progress: Record<string, number>;
  }> {
    try {
      const { data: achievements } = await supabase
        .from('user_achievements')
        .select('achievement_id, progress')
        .eq('user_id', userId);

      const unlocked = achievements?.map(a => a.achievement_id) || [];
      const progress: Record<string, number> = {};
      achievements?.forEach(a => {
        progress[a.achievement_id] = a.progress;
      });

      return { unlocked, progress };
    } catch (error) {
      console.error('[Gamification] Error fetching achievements:', error);
      return { unlocked: [], progress: {} };
    }
  },
};

