import { supabase } from './supabase';
import {
  Household,
  HouseholdMember,
  HouseholdInvite,
  HouseholdActivity,
  HouseholdWithMembers,
  HouseholdRole,
} from './types';

const INVITE_EXPIRY_DAYS = 7;

/**
 * Generate a cryptographically secure invite token
 */
function generateInviteToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Creates a new household and sets the current user as owner
 */
export async function createHousehold({
  name,
  userId,
}: {
  name: string;
  userId: string;
}): Promise<Household> {
  const { data: household, error: householdError } = await supabase
    .from('households')
    .insert({ name, owner_id: userId })
    .select()
    .single();
  if (householdError) throw new Error(householdError.message);
  const { error: memberError } = await supabase.from('household_members').insert({
    household_id: household.id,
    user_id: userId,
    role: 'owner',
  });
  if (memberError) {
    await supabase.from('households').delete().eq('id', household.id);
    throw new Error(memberError.message);
  }
  await updateUserHouseholdMetadata(userId, household.id);
  return household;
}

/**
 * Updates user's app_metadata with current household_id
 * NOTE: This cannot be done from client side with public key.
 * We will handle active household persistence on the client side via AsyncStorage
 * or a user_settings table in the future.
 */
async function updateUserHouseholdMetadata(
  userId: string,
  householdId: string | null
): Promise<void> {
  // Client-side only implementation cannot update app_metadata directly.
  // This would require an Edge Function.
  // For now, we'll rely on local state/AsyncStorage in the Context.
  return; 
}

/**
 * Gets household members with their email addresses using a secure database function
 */
async function getHouseholdMembersWithEmail(householdId: string): Promise<HouseholdMember[]> {
  const { data, error } = await supabase.rpc('get_household_members_with_email', {
    p_household_id: householdId,
  });
  if (error) {
    console.warn('Failed to get members with email, falling back to basic query:', error.message);
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('household_members')
      .select('*')
      .eq('household_id', householdId);
    if (fallbackError) throw new Error(fallbackError.message);
    return fallbackData || [];
  }
  return data || [];
}

/**
 * Gets all households the user belongs to
 */
export async function getUserHouseholds(userId: string): Promise<HouseholdWithMembers[]> {
  const { data: memberships, error: memberError } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', userId);
  if (memberError) throw new Error(memberError.message);
  if (!memberships || memberships.length === 0) return [];
  const householdIds = memberships.map((m) => m.household_id);
  const { data: households, error: householdError } = await supabase
    .from('households')
    .select('*')
    .in('id', householdIds);
  if (householdError) throw new Error(householdError.message);
  const householdsWithMembers: HouseholdWithMembers[] = [];
  for (const household of households || []) {
    const members = await getHouseholdMembersWithEmail(household.id);
    const currentMembership = memberships.find((m) => m.household_id === household.id);
    householdsWithMembers.push({
      ...household,
      members,
      member_count: members.length,
      current_user_role: currentMembership?.role || 'member',
    });
  }
  return householdsWithMembers;
}

/**
 * Gets a specific household with full details
 */
export async function getHousehold(householdId: string): Promise<HouseholdWithMembers | null> {
  const { data: household, error: householdError } = await supabase
    .from('households')
    .select('*')
    .eq('id', householdId)
    .single();
  if (householdError) {
    if (householdError.code === 'PGRST116') return null;
    throw new Error(householdError.message);
  }
  const { data: members, error: membersError } = await supabase
    .from('household_members')
    .select('*')
    .eq('household_id', householdId);
  if (membersError) throw new Error(membersError.message);
  return {
    ...household,
    members: members || [],
    member_count: members?.length || 0,
    current_user_role: 'member',
  };
}

/**
 * Updates household name or settings
 */
export async function updateHousehold({
  householdId,
  name,
}: {
  householdId: string;
  name: string;
}): Promise<Household> {
  const { data, error } = await supabase
    .from('households')
    .update({ name })
    .eq('id', householdId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Deletes a household (owner only)
 */
export async function deleteHousehold(householdId: string): Promise<void> {
  const { error } = await supabase.from('households').delete().eq('id', householdId);
  if (error) throw new Error(error.message);
}

/**
 * Creates an invite for a new member
 */
export async function createInvite({
  householdId,
  email,
}: {
  householdId: string;
  email: string;
}): Promise<HouseholdInvite> {
  const token = generateInviteToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);
  const { data, error } = await supabase
    .from('household_invites')
    .insert({
      household_id: householdId,
      email: email.toLowerCase(),
      token,
      expires_at: expiresAt.toISOString(),
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Gets all pending invites for a household
 */
export async function getHouseholdInvites(householdId: string): Promise<HouseholdInvite[]> {
  const { data, error } = await supabase
    .from('household_invites')
    .select('*')
    .eq('household_id', householdId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString());
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Gets pending invites for a user by email
 * Returns empty array gracefully if there are permission issues
 */
export async function getUserPendingInvites(email: string): Promise<HouseholdInvite[]> {
  try {
    const { data, error } = await supabase
      .from('household_invites')
      .select('*, households(name)')
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString());
    
    if (error) {
      // Handle RLS permission errors gracefully
      if (error.message.includes('permission denied')) {
        console.warn('[Household] Unable to fetch invites - RLS policy needs update. Run the migration in supabase/migrations/20241230_fix_invite_rls.sql');
        return [];
      }
      console.warn('[Household] Error fetching invites:', error.message);
      return [];
    }
    
    return (data || []).map((invite) => ({
      ...invite,
      household_name: (invite.households as { name: string })?.name,
    }));
  } catch (err) {
    console.warn('[Household] Failed to fetch invites:', err);
    return [];
  }
}

/**
 * Accepts an invite and adds user to household
 */
export async function acceptInvite({
  inviteId,
  userId,
}: {
  inviteId: string;
  userId: string;
}): Promise<HouseholdMember> {
  const { data: invite, error: inviteError } = await supabase
    .from('household_invites')
    .select('*')
    .eq('id', inviteId)
    .single();
  if (inviteError) throw new Error(inviteError.message);
  if (invite.status !== 'pending') {
    throw new Error('This invite is no longer valid');
  }
  if (new Date(invite.expires_at) < new Date()) {
    await supabase
      .from('household_invites')
      .update({ status: 'expired' })
      .eq('id', inviteId);
    throw new Error('This invite has expired');
  }
  const { data: member, error: memberError } = await supabase
    .from('household_members')
    .insert({
      household_id: invite.household_id,
      user_id: userId,
      role: 'member',
    })
    .select()
    .single();
  if (memberError) throw new Error(memberError.message);
  await supabase.from('household_invites').update({ status: 'accepted' }).eq('id', inviteId);
  await logActivity({
    householdId: invite.household_id,
    userId,
    actionType: 'member_joined',
    actionData: { invite_id: inviteId },
  });
  return member;
}

/**
 * Declines an invite
 */
export async function declineInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from('household_invites')
    .update({ status: 'declined' })
    .eq('id', inviteId);
  if (error) throw new Error(error.message);
}

/**
 * Revokes a pending invite
 */
export async function revokeInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.from('household_invites').delete().eq('id', inviteId);
  if (error) throw new Error(error.message);
}

/**
 * Updates a member's role
 */
export async function updateMemberRole({
  memberId,
  role,
}: {
  memberId: string;
  role: HouseholdRole;
}): Promise<HouseholdMember> {
  const { data, error } = await supabase
    .from('household_members')
    .update({ role })
    .eq('id', memberId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Removes a member from household
 */
export async function removeMember(memberId: string): Promise<void> {
  const { data: member, error: fetchError } = await supabase
    .from('household_members')
    .select('household_id, user_id')
    .eq('id', memberId)
    .single();
  if (fetchError) throw new Error(fetchError.message);
  const { error } = await supabase.from('household_members').delete().eq('id', memberId);
  if (error) throw new Error(error.message);
  await logActivity({
    householdId: member.household_id,
    userId: member.user_id,
    actionType: 'member_left',
    actionData: { member_id: memberId },
  });
}

/**
 * Leave a household (user removes themselves)
 */
export async function leaveHousehold({
  householdId,
  userId,
}: {
  householdId: string;
  userId: string;
}): Promise<void> {
  const { data: member, error: fetchError } = await supabase
    .from('household_members')
    .select('id, role')
    .eq('household_id', householdId)
    .eq('user_id', userId)
    .single();
  if (fetchError) throw new Error(fetchError.message);
  if (member.role === 'owner') {
    throw new Error('Owners cannot leave. Transfer ownership first or delete the household.');
  }
  const { error } = await supabase.from('household_members').delete().eq('id', member.id);
  if (error) throw new Error(error.message);
  await logActivity({
    householdId,
    userId,
    actionType: 'member_left',
    actionData: { voluntary: true },
  });
}

/**
 * Transfer ownership to another member
 */
export async function transferOwnership({
  householdId,
  currentOwnerId,
  newOwnerId,
}: {
  householdId: string;
  currentOwnerId: string;
  newOwnerId: string;
}): Promise<void> {
  const { error: updateHouseholdError } = await supabase
    .from('households')
    .update({ owner_id: newOwnerId })
    .eq('id', householdId);
  if (updateHouseholdError) throw new Error(updateHouseholdError.message);
  const { error: newOwnerError } = await supabase
    .from('household_members')
    .update({ role: 'owner' })
    .eq('household_id', householdId)
    .eq('user_id', newOwnerId);
  if (newOwnerError) throw new Error(newOwnerError.message);
  const { error: oldOwnerError } = await supabase
    .from('household_members')
    .update({ role: 'admin' })
    .eq('household_id', householdId)
    .eq('user_id', currentOwnerId);
  if (oldOwnerError) throw new Error(oldOwnerError.message);
}

/**
 * Log activity for household activity feed and send push notifications
 */
export async function logActivity({
  householdId,
  userId,
  actionType,
  actionData,
}: {
  householdId: string;
  userId: string;
  actionType: HouseholdActivity['action_type'];
  actionData: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase.from('household_activities').insert({
    household_id: householdId,
    user_id: userId,
    action_type: actionType,
    action_data: actionData,
  });
  if (error) {
    console.warn('Failed to log activity:', error.message);
  }
  sendHouseholdNotification({
    householdId,
    actorUserId: userId,
    actionType,
    actionData,
  });
}

/**
 * Send push notifications to household members (fire-and-forget)
 */
async function sendHouseholdNotification({
  householdId,
  actorUserId,
  actionType,
  actionData,
}: {
  householdId: string;
  actorUserId: string;
  actionType: string;
  actionData: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    fetch(`${supabaseUrl}/functions/v1/send-household-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        householdId,
        actorUserId,
        actionType,
        actionData,
      }),
    }).catch((err) => {
      console.warn('Failed to send household notification:', err);
    });
  } catch (err) {
    console.warn('Error sending household notification:', err);
  }
}

/**
 * Get recent activity for a household
 */
export async function getHouseholdActivity({
  householdId,
  limit = 20,
}: {
  householdId: string;
  limit?: number;
}): Promise<HouseholdActivity[]> {
  const { data, error } = await supabase
    .from('household_activities')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Get invite by token (for accepting via link)
 */
export async function getInviteByToken(token: string): Promise<HouseholdInvite | null> {
  const { data, error } = await supabase
    .from('household_invites')
    .select('*, households(name)')
    .eq('token', token)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message);
  }
  return {
    ...data,
    household_name: (data.households as { name: string })?.name,
  };
}

/**
 * Accept invite by token
 */
export async function acceptInviteByToken({
  token,
  userId,
}: {
  token: string;
  userId: string;
}): Promise<HouseholdMember> {
  const invite = await getInviteByToken(token);
  if (!invite) throw new Error('Invite not found');
  return acceptInvite({ inviteId: invite.id, userId });
}

/**
 * Generate shareable invite link
 */
export function generateInviteLink(token: string): string {
  const baseUrl = process.env.EXPO_PUBLIC_APP_URL || 'dinner-plans://';
  return `${baseUrl}invite/${token}`;
}

/**
 * Switch user's active household
 */
export async function switchActiveHousehold({
  userId,
  householdId,
}: {
  userId: string;
  householdId: string;
}): Promise<void> {
  const { data: membership, error } = await supabase
    .from('household_members')
    .select('id')
    .eq('user_id', userId)
    .eq('household_id', householdId)
    .single();
  if (error || !membership) {
    throw new Error('You are not a member of this household');
  }
  await updateUserHouseholdMetadata(userId, householdId);
}

