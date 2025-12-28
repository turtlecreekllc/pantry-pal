import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import {
  HouseholdWithMembers,
  HouseholdInvite,
  HouseholdRole,
  ROLE_PERMISSIONS,
} from '../lib/types';
import {
  getUserHouseholds,
  createHousehold,
  getUserPendingInvites,
  switchActiveHousehold,
  leaveHousehold as leaveHouseholdService,
  deleteHousehold as deleteHouseholdService,
  removeMember as removeMemberService,
  transferOwnership as transferOwnershipService,
} from '../lib/householdService';
import { useAuth } from './AuthContext';

interface HouseholdContextType {
  /** Currently active household */
  activeHousehold: HouseholdWithMembers | null;
  /** All households user belongs to */
  households: HouseholdWithMembers[];
  /** Pending invites for the user */
  pendingInvites: HouseholdInvite[];
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;
  /** User's role in active household */
  currentRole: HouseholdRole | null;
  /** Whether user has any household */
  hasHousehold: boolean;
  /** Create a new household */
  createNewHousehold: (name: string) => Promise<void>;
  /** Switch to a different household */
  switchHousehold: (householdId: string) => Promise<void>;
  /** Leave current household */
  leaveCurrentHousehold: () => Promise<void>;
  /** Delete current household (owner only) */
  deleteCurrentHousehold: () => Promise<void>;
  /** Remove a member (admin/owner only) */
  removeMember: (memberId: string) => Promise<void>;
  /** Transfer ownership (owner only) */
  transferOwnership: (newOwnerId: string) => Promise<void>;
  /** Refresh household data */
  refreshHouseholds: () => Promise<void>;
  /** Refresh pending invites */
  refreshInvites: () => Promise<void>;
  /** Check if user has permission */
  hasPermission: (permission: keyof typeof ROLE_PERMISSIONS.owner) => boolean;
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeHousehold, setActiveHousehold] = useState<HouseholdWithMembers | null>(null);
  const [households, setHouseholds] = useState<HouseholdWithMembers[]>([]);
  const [pendingInvites, setPendingInvites] = useState<HouseholdInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHouseholds = useCallback(async () => {
    if (!user) {
      setHouseholds([]);
      setActiveHousehold(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const userHouseholds = await getUserHouseholds(user.id);
      setHouseholds(userHouseholds);
      if (userHouseholds.length > 0) {
        // Try to get stored active household from AsyncStorage
        const storedActiveId = await AsyncStorage.getItem(`pantry_pal_active_household_${user.id}`);
        
        let active = null;
        if (storedActiveId) {
            active = userHouseholds.find((h) => h.id === storedActiveId);
        }
        
        // Fallback to first household if stored not found or invalid
        if (!active) {
            active = userHouseholds[0];
        }
        
        setActiveHousehold(active);
      } else {
        setActiveHousehold(null);
      }
    } catch (err) {
      console.error('Error fetching households:', err);
      setError('Failed to load households');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchInvites = useCallback(async () => {
    if (!user?.email) {
      setPendingInvites([]);
      return;
    }
    try {
      const invites = await getUserPendingInvites(user.email);
      setPendingInvites(invites);
    } catch (err) {
      console.error('Error fetching invites:', err);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchHouseholds();
    fetchInvites();
  }, [fetchHouseholds, fetchInvites]);

  useEffect(() => {
    if (!activeHousehold) return;
    const channel = supabase
      .channel(`household:${activeHousehold.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'household_members',
          filter: `household_id=eq.${activeHousehold.id}`,
        },
        () => {
          fetchHouseholds();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeHousehold?.id, fetchHouseholds]);

  const createNewHousehold = async (name: string): Promise<void> => {
    if (!user) {
      setError('You must be logged in to create a household');
      return;
    }
    setError(null);
    try {
      const household = await createHousehold({ name, userId: user.id });
      await fetchHouseholds();
      const newHouseholds = await getUserHouseholds(user.id);
      const created = newHouseholds.find((h) => h.id === household.id);
      if (created) {
        setActiveHousehold(created);
        await AsyncStorage.setItem(`pantry_pal_active_household_${user.id}`, created.id);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create household';
      setError(message);
      throw err;
    }
  };

  const switchHousehold = async (householdId: string): Promise<void> => {
    if (!user) return;
    const household = households.find((h) => h.id === householdId);
    if (!household) {
      setError('Household not found');
      return;
    }
    try {
      // await switchActiveHousehold({ userId: user.id, householdId }); // No longer needed/working for auth metadata
      setActiveHousehold(household);
      await AsyncStorage.setItem(`pantry_pal_active_household_${user.id}`, household.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to switch household';
      setError(message);
    }
  };

  const leaveCurrentHousehold = async (): Promise<void> => {
    if (!user || !activeHousehold) return;
    try {
      await leaveHouseholdService({ householdId: activeHousehold.id, userId: user.id });
      await fetchHouseholds();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to leave household';
      setError(message);
      throw err;
    }
  };

  const deleteCurrentHousehold = async (): Promise<void> => {
    if (!activeHousehold) return;
    if (activeHousehold.current_user_role !== 'owner') {
      setError('Only the owner can delete the household');
      return;
    }
    try {
      await deleteHouseholdService(activeHousehold.id);
      await fetchHouseholds();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete household';
      setError(message);
      throw err;
    }
  };

  const removeMember = async (memberId: string): Promise<void> => {
    if (!activeHousehold) return;
    if (!hasPermission('canRemoveMembers')) {
        setError('You do not have permission to remove members');
        return;
    }
    try {
        await removeMemberService(memberId);
        await fetchHouseholds(); // Refresh list
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to remove member';
        setError(message);
        throw err;
    }
  };

  const transferOwnership = async (newOwnerId: string): Promise<void> => {
    if (!activeHousehold || !user) return;
    if (activeHousehold.current_user_role !== 'owner') {
        setError('Only the owner can transfer ownership');
        return;
    }
    try {
        await transferOwnershipService({
            householdId: activeHousehold.id,
            currentOwnerId: user.id,
            newOwnerId: newOwnerId
        });
        await fetchHouseholds();
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to transfer ownership';
        setError(message);
        throw err;
    }
  };

  const hasPermission = (permission: keyof typeof ROLE_PERMISSIONS.owner): boolean => {
    if (!activeHousehold) return false;
    const role = activeHousehold.current_user_role;
    return ROLE_PERMISSIONS[role][permission];
  };

  const currentRole = activeHousehold?.current_user_role || null;
  const hasHousehold = households.length > 0;

  return (
    <HouseholdContext.Provider
      value={{
        activeHousehold,
        households,
        pendingInvites,
        loading,
        error,
        currentRole,
        hasHousehold,
        createNewHousehold,
        switchHousehold,
        leaveCurrentHousehold,
        deleteCurrentHousehold,
        removeMember,
        transferOwnership,
        refreshHouseholds: fetchHouseholds,
        refreshInvites: fetchInvites,
        hasPermission,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHouseholdContext(): HouseholdContextType {
  const context = useContext(HouseholdContext);
  if (context === undefined) {
    throw new Error('useHouseholdContext must be used within a HouseholdProvider');
  }
  return context;
}

