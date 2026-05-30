import type { MealType } from './meal-plan';

// Household Sharing types
export const HOUSEHOLD_ROLES = ['owner', 'admin', 'member'] as const;
export type HouseholdRole = (typeof HOUSEHOLD_ROLES)[number];

export const INVITE_STATUSES = ['pending', 'accepted', 'declined', 'expired'] as const;
export type InviteStatus = (typeof INVITE_STATUSES)[number];

export interface Household {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  joined_at: string;
  user_email?: string;
  user_avatar_url?: string;
}

export interface HouseholdInvite {
  id: string;
  household_id: string;
  email: string;
  token: string;
  expires_at: string;
  status: InviteStatus;
  created_at: string;
  household_name?: string;
}

export interface HouseholdActivity {
  id: string;
  household_id: string;
  user_id: string;
  user_email?: string;
  action_type: 'item_added' | 'item_updated' | 'item_deleted' | 'meal_planned' | 'meal_completed' | 'member_joined' | 'member_left';
  action_data: Record<string, unknown>;
  created_at: string;
}

/**
 * Item claim - marks a pantry item as reserved for a specific member
 */
export interface ItemClaim {
  id: string;
  pantry_item_id: string;
  user_id: string;
  user_email?: string;
  note?: string;
  created_at: string;
}

/**
 * RSVP status for meal plans
 */
export const RSVP_STATUSES = ['attending', 'not_attending', 'maybe'] as const;
export type RSVPStatus = (typeof RSVP_STATUSES)[number];

/**
 * Meal RSVP - tracks attendance for planned meals
 */
export interface MealRSVP {
  id: string;
  meal_plan_id: string;
  user_id: string;
  user_email?: string;
  status: RSVPStatus;
  servings?: number;
  note?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Meal assignment - assigns cooking responsibility to a member
 */
export interface MealAssignment {
  id: string;
  meal_plan_id: string;
  user_id: string;
  user_email?: string;
  assigned_by: string;
  created_at: string;
}

export interface HouseholdWithMembers extends Household {
  members: HouseholdMember[];
  member_count: number;
  current_user_role: HouseholdRole;
}

/**
 * Permission configuration for household roles
 */
export const ROLE_PERMISSIONS: Record<HouseholdRole, {
  canManageMembers: boolean;
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canDeleteHousehold: boolean;
  canTransferOwnership: boolean;
  canEditSettings: boolean;
  canEditPantry: boolean;
  canEditMeals: boolean;
  canViewAll: boolean;
}> = {
  owner: {
    canManageMembers: true,
    canInviteMembers: true,
    canRemoveMembers: true,
    canDeleteHousehold: true,
    canTransferOwnership: true,
    canEditSettings: true,
    canEditPantry: true,
    canEditMeals: true,
    canViewAll: true,
  },
  admin: {
    canManageMembers: true,
    canInviteMembers: true,
    canRemoveMembers: false,
    canDeleteHousehold: false,
    canTransferOwnership: false,
    canEditSettings: true,
    canEditPantry: true,
    canEditMeals: true,
    canViewAll: true,
  },
  member: {
    canManageMembers: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canDeleteHousehold: false,
    canTransferOwnership: false,
    canEditSettings: false,
    canEditPantry: true,
    canEditMeals: false,
    canViewAll: true,
  },
} as const;

// ============================================
// MEAL VOTING TYPES (Flow Rework)
// ============================================

export const VOTE_STATUSES = ['voting', 'accepted', 'rejected', 'expired'] as const;
export type VoteStatus = (typeof VOTE_STATUSES)[number];

export const VOTE_RESPONSES = ['yes', 'maybe', 'no'] as const;
export type VoteResponse = (typeof VOTE_RESPONSES)[number];

/**
 * Meal vote - proposed meal for household voting
 */
export interface MealVote {
  id: string;
  household_id: string;
  proposed_by: string;
  recipe_id: string;
  recipe_name: string;
  recipe_thumbnail: string | null;
  proposed_date: string;
  meal_type: MealType;
  status: VoteStatus;
  voting_ends_at: string | null;
  created_at: string;
  updated_at: string;
  // Virtual fields
  responses?: MealVoteResponse[];
  yes_count?: number;
  no_count?: number;
  maybe_count?: number;
}

/**
 * Individual vote response
 */
export interface MealVoteResponse {
  id: string;
  vote_id: string;
  user_id: string;
  user_email?: string;
  response: VoteResponse;
  created_at: string;
}
