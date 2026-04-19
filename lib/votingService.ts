/**
 * Meal Voting Service
 * Handles real-time meal voting for households
 */
import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

/** Vote response types */
type VoteResponse = 'yes' | 'maybe' | 'no';

/** Vote status */
type VoteStatus = 'voting' | 'accepted' | 'rejected';

/** Meal vote proposal */
interface MealVote {
  readonly id: string;
  readonly householdId: string;
  readonly proposedBy: string;
  readonly recipeId: string;
  readonly recipeName: string;
  readonly recipeImage?: string;
  readonly proposedDate: string;
  readonly status: VoteStatus;
  readonly createdAt: Date;
  readonly responses?: readonly VoteResponseRecord[];
}

/** Individual vote response record */
interface VoteResponseRecord {
  readonly id: string;
  readonly voteId: string;
  readonly userId: string;
  readonly userName?: string;
  readonly response: VoteResponse;
  readonly createdAt: Date;
}

/** Vote summary with counts */
interface VoteSummary {
  readonly yes: number;
  readonly maybe: number;
  readonly no: number;
  readonly total: number;
}

/** Callback for vote updates */
type VoteUpdateCallback = (vote: MealVote) => void;

/**
 * Creates a new meal vote proposal
 * @param params - Vote creation parameters
 * @returns Created vote or null on error
 */
async function createVote({
  householdId,
  proposedBy,
  recipeId,
  recipeName,
  recipeImage,
  proposedDate,
}: {
  readonly householdId: string;
  readonly proposedBy: string;
  readonly recipeId: string;
  readonly recipeName: string;
  readonly recipeImage?: string;
  readonly proposedDate: string;
}): Promise<MealVote | null> {
  try {
    const { data, error } = await supabase
      .from('meal_votes')
      .insert({
        household_id: householdId,
        proposed_by: proposedBy,
        recipe_id: recipeId,
        recipe_name: recipeName,
        recipe_image: recipeImage,
        proposed_date: proposedDate,
        status: 'voting',
      })
      .select()
      .single();
    if (error) {
      console.error('Failed to create vote:', error);
      return null;
    }
    return mapVoteFromDB(data);
  } catch (error) {
    console.error('Error creating vote:', error);
    return null;
  }
}

/**
 * Submits a vote response
 * @param params - Vote response parameters
 * @returns Success boolean
 */
async function submitVote({
  voteId,
  userId,
  response,
}: {
  readonly voteId: string;
  readonly userId: string;
  readonly response: VoteResponse;
}): Promise<boolean> {
  try {
    // Check if user already voted
    const { data: existing } = await supabase
      .from('vote_responses')
      .select('id')
      .eq('vote_id', voteId)
      .eq('user_id', userId)
      .single();
    if (existing) {
      // Update existing vote
      const { error } = await supabase
        .from('vote_responses')
        .update({ response })
        .eq('id', existing.id);
      if (error) {
        console.error('Failed to update vote:', error);
        return false;
      }
    } else {
      // Insert new vote
      const { error } = await supabase.from('vote_responses').insert({
        vote_id: voteId,
        user_id: userId,
        response,
      });
      if (error) {
        console.error('Failed to submit vote:', error);
        return false;
      }
    }
    // Check if voting should be resolved
    await checkAndResolveVote(voteId);
    return true;
  } catch (error) {
    console.error('Error submitting vote:', error);
    return false;
  }
}

/**
 * Checks if voting is complete and resolves if so
 * @param voteId - Vote ID to check
 */
async function checkAndResolveVote(voteId: string): Promise<void> {
  try {
    // Get the vote with household info
    const { data: vote } = await supabase
      .from('meal_votes')
      .select('*, households(member_count)')
      .eq('id', voteId)
      .single();
    if (!vote || vote.status !== 'voting') {
      return;
    }
    // Get all responses
    const { data: responses } = await supabase
      .from('vote_responses')
      .select('*')
      .eq('vote_id', voteId);
    const memberCount = vote.households?.member_count || 1;
    const responseCount = responses?.length || 0;
    // If all members voted, resolve
    if (responseCount >= memberCount) {
      const summary = calculateSummary(responses || []);
      const status: VoteStatus = summary.yes > summary.no ? 'accepted' : 'rejected';
      await supabase
        .from('meal_votes')
        .update({ status })
        .eq('id', voteId);
      // If accepted, add to meal plan
      if (status === 'accepted') {
        await addVotedMealToPlan(vote);
      }
    }
  } catch (error) {
    console.error('Error resolving vote:', error);
  }
}

/**
 * Adds an accepted vote to the meal plan
 * @param vote - Accepted vote data
 */
async function addVotedMealToPlan(vote: Record<string, unknown>): Promise<void> {
  try {
    const { error } = await supabase.from('meal_plans').insert({
      household_id: vote.household_id,
      recipe_id: vote.recipe_id,
      date: vote.proposed_date,
      meal_type: 'dinner',
      created_by: vote.proposed_by,
      source: 'vote',
    });
    if (error) {
      console.error('Failed to add voted meal to plan:', error);
    }
  } catch (error) {
    console.error('Error adding voted meal:', error);
  }
}

/**
 * Gets active votes for a household
 * @param householdId - Household ID
 * @returns Array of active votes
 */
async function getActiveVotes(householdId: string): Promise<readonly MealVote[]> {
  try {
    const { data, error } = await supabase
      .from('meal_votes')
      .select(`
        *,
        vote_responses(*)
      `)
      .eq('household_id', householdId)
      .eq('status', 'voting')
      .gte('proposed_date', new Date().toISOString().split('T')[0])
      .order('proposed_date', { ascending: true });
    if (error) {
      console.error('Failed to fetch active votes:', error);
      return [];
    }
    return (data || []).map(mapVoteFromDB);
  } catch (error) {
    console.error('Error fetching active votes:', error);
    return [];
  }
}

/**
 * Gets a specific vote by ID
 * @param voteId - Vote ID
 * @returns Vote or null
 */
async function getVote(voteId: string): Promise<MealVote | null> {
  try {
    const { data, error } = await supabase
      .from('meal_votes')
      .select(`
        *,
        vote_responses(*)
      `)
      .eq('id', voteId)
      .single();
    if (error) {
      console.error('Failed to fetch vote:', error);
      return null;
    }
    return mapVoteFromDB(data);
  } catch (error) {
    console.error('Error fetching vote:', error);
    return null;
  }
}

/**
 * Gets user's response for a vote
 * @param voteId - Vote ID
 * @param userId - User ID
 * @returns User's response or null
 */
async function getUserResponse(
  voteId: string,
  userId: string,
): Promise<VoteResponse | null> {
  try {
    const { data, error } = await supabase
      .from('vote_responses')
      .select('response')
      .eq('vote_id', voteId)
      .eq('user_id', userId)
      .single();
    if (error || !data) {
      return null;
    }
    return data.response as VoteResponse;
  } catch {
    return null;
  }
}

/**
 * Calculates vote summary from responses
 * @param responses - Vote response records
 * @returns Vote summary with counts
 */
function calculateSummary(
  responses: readonly Record<string, unknown>[],
): VoteSummary {
  const summary = { yes: 0, maybe: 0, no: 0, total: responses.length };
  for (const response of responses) {
    const vote = response.response as VoteResponse;
    if (vote === 'yes') summary.yes++;
    else if (vote === 'maybe') summary.maybe++;
    else if (vote === 'no') summary.no++;
  }
  return summary;
}

/**
 * Cancels a vote (only proposer can cancel)
 * @param voteId - Vote ID
 * @param userId - User requesting cancel
 * @returns Success boolean
 */
async function cancelVote(voteId: string, userId: string): Promise<boolean> {
  try {
    const { data: vote } = await supabase
      .from('meal_votes')
      .select('proposed_by')
      .eq('id', voteId)
      .single();
    if (!vote || vote.proposed_by !== userId) {
      return false;
    }
    const { error } = await supabase
      .from('meal_votes')
      .update({ status: 'rejected' })
      .eq('id', voteId);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Subscribes to real-time vote updates
 * @param householdId - Household ID to subscribe to
 * @param callback - Callback for vote updates
 * @returns Unsubscribe function
 */
function subscribeToVotes(
  householdId: string,
  callback: VoteUpdateCallback,
): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`votes:${householdId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'meal_votes',
        filter: `household_id=eq.${householdId}`,
      },
      async (payload) => {
        const vote = await getVote(payload.new?.id || payload.old?.id);
        if (vote) {
          callback(vote);
        }
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'vote_responses',
      },
      async (payload) => {
        const voteId = payload.new?.vote_id || payload.old?.vote_id;
        if (voteId) {
          const vote = await getVote(voteId);
          if (vote) {
            callback(vote);
          }
        }
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Maps database record to MealVote interface
 * @param data - Database record
 * @returns MealVote object
 */
function mapVoteFromDB(data: Record<string, unknown>): MealVote {
  return {
    id: data.id as string,
    householdId: data.household_id as string,
    proposedBy: data.proposed_by as string,
    recipeId: data.recipe_id as string,
    recipeName: data.recipe_name as string || 'Unknown Recipe',
    recipeImage: data.recipe_image as string | undefined,
    proposedDate: data.proposed_date as string,
    status: data.status as VoteStatus,
    createdAt: new Date(data.created_at as string),
    responses: (data.vote_responses as Record<string, unknown>[] | undefined)?.map(
      (r) => ({
        id: r.id as string,
        voteId: r.vote_id as string,
        userId: r.user_id as string,
        response: r.response as VoteResponse,
        createdAt: new Date(r.created_at as string),
      }),
    ),
  };
}

/** Voting service with all public methods */
export const votingService = {
  createVote,
  submitVote,
  getActiveVotes,
  getVote,
  getUserResponse,
  calculateSummary,
  cancelVote,
  subscribeToVotes,
} as const;

export type { MealVote, VoteResponse, VoteResponseRecord, VoteSummary, VoteStatus };

