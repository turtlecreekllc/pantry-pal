import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useHousehold } from '../../hooks/useHousehold';

// Mock the household service functions
jest.mock('../../lib/householdService', () => ({
  createInvite: jest.fn(),
  acceptInvite: jest.fn(),
  declineInvite: jest.fn(),
  revokeInvite: jest.fn(),
  getHouseholdInvites: jest.fn(),
  updateMemberRole: jest.fn(),
  removeMember: jest.fn(),
  transferOwnership: jest.fn(),
  updateHousehold: jest.fn(),
  getHouseholdActivity: jest.fn(),
  generateInviteLink: jest.fn(),
  acceptInviteByToken: jest.fn(),
}));

// Mock contexts
const mockActiveHousehold = { id: 'hh-1', name: 'Test Household' };
const mockRefreshHouseholds = jest.fn();
const mockRefreshInvites = jest.fn();

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'test@test.com' } }),
}));

jest.mock('../../context/HouseholdContext', () => ({
  useHouseholdContext: () => ({
    activeHousehold: mockActiveHousehold,
    refreshHouseholds: mockRefreshHouseholds,
    refreshInvites: mockRefreshInvites,
  }),
}));

import {
  createInvite,
  acceptInvite,
  declineInvite,
  revokeInvite,
  getHouseholdInvites,
  updateMemberRole,
  removeMember,
  updateHousehold,
  getHouseholdActivity,
  generateInviteLink,
  acceptInviteByToken,
} from '../../lib/householdService';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useHousehold', () => {
  it('initializes with operationLoading=false and no error', () => {
    const { result } = renderHook(() => useHousehold());
    expect(result.current.operationLoading).toBe(false);
    expect(result.current.operationError).toBeNull();
  });

  describe('inviteMember', () => {
    it('calls createInvite with household id and email', async () => {
      const mockInvite = { id: 'invite-1', email: 'friend@test.com', household_id: 'hh-1' };
      (createInvite as jest.Mock).mockResolvedValue(mockInvite);

      const { result } = renderHook(() => useHousehold());
      let invite: any;
      await act(async () => {
        invite = await result.current.inviteMember('friend@test.com');
      });

      expect(createInvite).toHaveBeenCalledWith({ householdId: 'hh-1', email: 'friend@test.com' });
      expect(invite).toEqual(mockInvite);
    });

    it('sets operationError on failure', async () => {
      (createInvite as jest.Mock).mockRejectedValue(new Error('Already invited'));

      const { result } = renderHook(() => useHousehold());
      await act(async () => {
        try {
          await result.current.inviteMember('bad@test.com');
        } catch {}
      });

      expect(result.current.operationError).toBe('Already invited');
    });

    it('sets loading during operation', async () => {
      let resolveInvite: any;
      (createInvite as jest.Mock).mockReturnValue(
        new Promise((resolve) => (resolveInvite = resolve))
      );

      const { result } = renderHook(() => useHousehold());
      act(() => {
        result.current.inviteMember('test@test.com').catch(() => {});
      });

      // Should be loading while promise is pending
      await waitFor(() => expect(result.current.operationLoading).toBe(true));

      // Resolve the promise
      await act(async () => {
        resolveInvite({ id: 'invite-1' });
      });
    });
  });

  describe('clearError', () => {
    it('clears the operationError', async () => {
      (createInvite as jest.Mock).mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useHousehold());
      await act(async () => {
        try {
          await result.current.inviteMember('x@test.com');
        } catch {}
      });

      expect(result.current.operationError).toBe('Test error');

      act(() => {
        result.current.clearError();
      });
      expect(result.current.operationError).toBeNull();
    });
  });

  describe('fetchPendingInvites', () => {
    it('fetches invites for active household', async () => {
      const mockInvites = [{ id: 'inv-1', email: 'a@b.com', household_id: 'hh-1' }];
      (getHouseholdInvites as jest.Mock).mockResolvedValue(mockInvites);

      const { result } = renderHook(() => useHousehold());
      let invites: any;
      await act(async () => {
        invites = await result.current.fetchPendingInvites();
      });

      expect(getHouseholdInvites).toHaveBeenCalledWith('hh-1');
      expect(invites).toEqual(mockInvites);
    });
  });

  describe('changeMemberRole', () => {
    it('calls updateMemberRole with correct params', async () => {
      (updateMemberRole as jest.Mock).mockResolvedValue({ id: 'mem-1', role: 'admin' });

      const { result } = renderHook(() => useHousehold());
      await act(async () => {
        await result.current.changeMemberRole('mem-1', 'admin');
      });

      expect(updateMemberRole).toHaveBeenCalledWith({ memberId: 'mem-1', role: 'admin' });
    });
  });

  describe('removeMemberFromHousehold', () => {
    it('calls removeMember and refreshes households', async () => {
      (removeMember as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useHousehold());
      await act(async () => {
        await result.current.removeMemberFromHousehold('mem-1');
      });

      expect(removeMember).toHaveBeenCalledWith('mem-1');
      expect(mockRefreshHouseholds).toHaveBeenCalled();
    });
  });

  describe('updateHouseholdName', () => {
    it('calls updateHousehold and refreshes households', async () => {
      (updateHousehold as jest.Mock).mockResolvedValue({ id: 'hh-1', name: 'New Name' });

      const { result } = renderHook(() => useHousehold());
      await act(async () => {
        await result.current.updateHouseholdName('New Name');
      });

      expect(updateHousehold).toHaveBeenCalledWith({ householdId: 'hh-1', name: 'New Name' });
      expect(mockRefreshHouseholds).toHaveBeenCalled();
    });
  });

  describe('fetchActivity', () => {
    it('fetches household activity', async () => {
      const mockActivity = [{ id: 'act-1', action_type: 'member_joined' }];
      (getHouseholdActivity as jest.Mock).mockResolvedValue(mockActivity);

      const { result } = renderHook(() => useHousehold());
      let activity: any;
      await act(async () => {
        activity = await result.current.fetchActivity(10);
      });

      expect(getHouseholdActivity).toHaveBeenCalledWith({ householdId: 'hh-1', limit: 10 });
      expect(activity).toEqual(mockActivity);
    });
  });

  describe('getInviteLink', () => {
    it('calls generateInviteLink with token', () => {
      (generateInviteLink as jest.Mock).mockReturnValue('https://app.example.com/invite/abc123');

      const { result } = renderHook(() => useHousehold());
      const link = result.current.getInviteLink('abc123');

      expect(generateInviteLink).toHaveBeenCalledWith('abc123');
      expect(link).toBe('https://app.example.com/invite/abc123');
    });
  });

  describe('declineInvitation', () => {
    it('calls declineInvite with invite id', async () => {
      (declineInvite as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useHousehold());
      await act(async () => {
        await result.current.declineInvitation('invite-1');
      });

      expect(declineInvite).toHaveBeenCalledWith('invite-1');
    });
  });

  describe('revokeInvitation', () => {
    it('calls revokeInvite with invite id', async () => {
      (revokeInvite as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useHousehold());
      await act(async () => {
        await result.current.revokeInvitation('invite-2');
      });

      expect(revokeInvite).toHaveBeenCalledWith('invite-2');
    });
  });
});
