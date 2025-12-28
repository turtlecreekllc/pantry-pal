import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useHouseholdContext } from '../context/HouseholdContext';
import {
  HouseholdMember,
  HouseholdInvite,
  HouseholdActivity,
  HouseholdRole,
} from '../lib/types';
import {
  createInvite,
  acceptInvite,
  declineInvite,
  revokeInvite,
  getHouseholdInvites,
  updateMemberRole,
  removeMember,
  transferOwnership,
  updateHousehold,
  getHouseholdActivity,
  generateInviteLink,
  acceptInviteByToken,
} from '../lib/householdService';

interface UseHouseholdReturn {
  /** Invite a new member by email */
  inviteMember: (email: string) => Promise<HouseholdInvite>;
  /** Accept an invite */
  acceptInvitation: (inviteId: string) => Promise<void>;
  /** Accept invite by token (from link) */
  acceptInvitationByToken: (token: string) => Promise<void>;
  /** Decline an invite */
  declineInvitation: (inviteId: string) => Promise<void>;
  /** Revoke a pending invite */
  revokeInvitation: (inviteId: string) => Promise<void>;
  /** Get pending invites for current household */
  fetchPendingInvites: () => Promise<HouseholdInvite[]>;
  /** Update a member's role */
  changeMemberRole: (memberId: string, role: HouseholdRole) => Promise<void>;
  /** Remove a member from household */
  removeMemberFromHousehold: (memberId: string) => Promise<void>;
  /** Transfer ownership to another member */
  transferHouseholdOwnership: (newOwnerId: string) => Promise<void>;
  /** Update household name */
  updateHouseholdName: (name: string) => Promise<void>;
  /** Get recent activity */
  fetchActivity: (limit?: number) => Promise<HouseholdActivity[]>;
  /** Generate shareable invite link */
  getInviteLink: (token: string) => string;
  /** Loading state for operations */
  operationLoading: boolean;
  /** Error from operations */
  operationError: string | null;
  /** Clear operation error */
  clearError: () => void;
}

export function useHousehold(): UseHouseholdReturn {
  const { user } = useAuth();
  const { activeHousehold, refreshHouseholds, refreshInvites } = useHouseholdContext();
  const [operationLoading, setOperationLoading] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setOperationError(null);
  }, []);

  const inviteMember = useCallback(
    async (email: string): Promise<HouseholdInvite> => {
      if (!activeHousehold) {
        throw new Error('No active household');
      }
      setOperationLoading(true);
      setOperationError(null);
      try {
        const invite = await createInvite({
          householdId: activeHousehold.id,
          email,
        });
        return invite;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to send invite';
        setOperationError(message);
        throw err;
      } finally {
        setOperationLoading(false);
      }
    },
    [activeHousehold]
  );

  const acceptInvitation = useCallback(
    async (inviteId: string): Promise<void> => {
      if (!user) throw new Error('Not authenticated');
      setOperationLoading(true);
      setOperationError(null);
      try {
        await acceptInvite({ inviteId, userId: user.id });
        await refreshHouseholds();
        await refreshInvites();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to accept invite';
        setOperationError(message);
        throw err;
      } finally {
        setOperationLoading(false);
      }
    },
    [user, refreshHouseholds, refreshInvites]
  );

  const acceptInvitationByToken = useCallback(
    async (token: string): Promise<void> => {
      if (!user) throw new Error('Not authenticated');
      setOperationLoading(true);
      setOperationError(null);
      try {
        await acceptInviteByToken({ token, userId: user.id });
        await refreshHouseholds();
        await refreshInvites();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to accept invite';
        setOperationError(message);
        throw err;
      } finally {
        setOperationLoading(false);
      }
    },
    [user, refreshHouseholds, refreshInvites]
  );

  const declineInvitation = useCallback(
    async (inviteId: string): Promise<void> => {
      setOperationLoading(true);
      setOperationError(null);
      try {
        await declineInvite(inviteId);
        await refreshInvites();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to decline invite';
        setOperationError(message);
        throw err;
      } finally {
        setOperationLoading(false);
      }
    },
    [refreshInvites]
  );

  const revokeInvitation = useCallback(
    async (inviteId: string): Promise<void> => {
      setOperationLoading(true);
      setOperationError(null);
      try {
        await revokeInvite(inviteId);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to revoke invite';
        setOperationError(message);
        throw err;
      } finally {
        setOperationLoading(false);
      }
    },
    []
  );

  const fetchPendingInvites = useCallback(async (): Promise<HouseholdInvite[]> => {
    if (!activeHousehold) return [];
    try {
      return await getHouseholdInvites(activeHousehold.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch invites';
      setOperationError(message);
      return [];
    }
  }, [activeHousehold]);

  const changeMemberRole = useCallback(
    async (memberId: string, role: HouseholdRole): Promise<void> => {
      setOperationLoading(true);
      setOperationError(null);
      try {
        await updateMemberRole({ memberId, role });
        await refreshHouseholds();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update role';
        setOperationError(message);
        throw err;
      } finally {
        setOperationLoading(false);
      }
    },
    [refreshHouseholds]
  );

  const removeMemberFromHousehold = useCallback(
    async (memberId: string): Promise<void> => {
      setOperationLoading(true);
      setOperationError(null);
      try {
        await removeMember(memberId);
        await refreshHouseholds();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to remove member';
        setOperationError(message);
        throw err;
      } finally {
        setOperationLoading(false);
      }
    },
    [refreshHouseholds]
  );

  const transferHouseholdOwnership = useCallback(
    async (newOwnerId: string): Promise<void> => {
      if (!user || !activeHousehold) {
        throw new Error('No active household or user');
      }
      setOperationLoading(true);
      setOperationError(null);
      try {
        await transferOwnership({
          householdId: activeHousehold.id,
          currentOwnerId: user.id,
          newOwnerId,
        });
        await refreshHouseholds();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to transfer ownership';
        setOperationError(message);
        throw err;
      } finally {
        setOperationLoading(false);
      }
    },
    [user, activeHousehold, refreshHouseholds]
  );

  const updateHouseholdName = useCallback(
    async (name: string): Promise<void> => {
      if (!activeHousehold) throw new Error('No active household');
      setOperationLoading(true);
      setOperationError(null);
      try {
        await updateHousehold({ householdId: activeHousehold.id, name });
        await refreshHouseholds();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update household';
        setOperationError(message);
        throw err;
      } finally {
        setOperationLoading(false);
      }
    },
    [activeHousehold, refreshHouseholds]
  );

  const fetchActivity = useCallback(
    async (limit = 20): Promise<HouseholdActivity[]> => {
      if (!activeHousehold) return [];
      try {
        return await getHouseholdActivity({ householdId: activeHousehold.id, limit });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch activity';
        setOperationError(message);
        return [];
      }
    },
    [activeHousehold]
  );

  const getInviteLink = useCallback((token: string): string => {
    return generateInviteLink(token);
  }, []);

  return {
    inviteMember,
    acceptInvitation,
    acceptInvitationByToken,
    declineInvitation,
    revokeInvitation,
    fetchPendingInvites,
    changeMemberRole,
    removeMemberFromHousehold,
    transferHouseholdOwnership,
    updateHouseholdName,
    fetchActivity,
    getInviteLink,
    operationLoading,
    operationError,
    clearError,
  };
}

