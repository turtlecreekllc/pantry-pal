import {
  createHousehold,
  getUserHouseholds,
  getHousehold,
  updateHousehold,
  createInvite,
  getUserPendingInvites,
  leaveHousehold,
  removeMember,
  generateInviteLink,
} from '../../lib/householdService';

const { supabase } = require('../../lib/supabase');

beforeEach(() => {
  jest.clearAllMocks();
});

const makeQueryChain = (data: any, error: any = null) => {
  const builder: any = {};
  const methods = ['select', 'eq', 'neq', 'in', 'order', 'gt', 'match', 'not'];
  methods.forEach((m) => (builder[m] = jest.fn().mockReturnThis()));
  builder.single = jest.fn().mockResolvedValue({ data, error });
  builder.maybeSingle = jest.fn().mockResolvedValue({ data, error });
  builder.then = (resolve: any) => Promise.resolve({ data, error }).then(resolve);
  builder.catch = (reject: any) => Promise.resolve({ data, error }).catch(reject);
  return builder;
};

describe('householdService', () => {
  describe('createHousehold', () => {
    it('creates household and returns it', async () => {
      const mockHousehold = { id: 'hh-1', name: 'Smith Family', owner_id: 'user-1' };

      supabase.from.mockImplementation((table: string) => {
        if (table === 'households') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockHousehold, error: null }),
              }),
            }),
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'household_members') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return makeQueryChain(null);
      });

      const result = await createHousehold({ name: 'Smith Family', userId: 'user-1' });
      expect(result.name).toBe('Smith Family');
      expect(result.id).toBe('hh-1');
    });

    it('throws when household insert fails', async () => {
      supabase.from.mockImplementation((table: string) => {
        if (table === 'households') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Duplicate name' },
                }),
              }),
            }),
          };
        }
        return makeQueryChain(null);
      });

      await expect(createHousehold({ name: 'Test', userId: 'user-1' })).rejects.toThrow('Duplicate name');
    });

    it('rolls back household on member insert failure', async () => {
      const mockHousehold = { id: 'hh-1', name: 'Test', owner_id: 'user-1' };
      const eqMock = jest.fn().mockResolvedValue({ data: null, error: null });
      const deleteMock = jest.fn().mockReturnValue({ eq: eqMock });

      supabase.from.mockImplementation((table: string) => {
        if (table === 'households') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockHousehold, error: null }),
              }),
            }),
            delete: deleteMock,
          };
        }
        if (table === 'household_members') {
          return {
            insert: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Member insert failed' },
            }),
          };
        }
        return makeQueryChain(null);
      });

      await expect(createHousehold({ name: 'Test', userId: 'user-1' })).rejects.toThrow();
      expect(deleteMock).toHaveBeenCalled();
    });
  });

  describe('getUserHouseholds', () => {
    it('returns empty array when user has no memberships', async () => {
      supabase.from.mockImplementation(() => {
        const b = makeQueryChain([]);
        return b;
      });

      const result = await getUserHouseholds('user-1');
      expect(result).toEqual([]);
    });

    it('throws on membership query error', async () => {
      supabase.from.mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'Permission denied' } }),
      }));

      await expect(getUserHouseholds('user-1')).rejects.toThrow('Permission denied');
    });
  });

  describe('getHousehold', () => {
    it('returns null when household has PGRST116 error code', async () => {
      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        }),
      });

      const result = await getHousehold('hh-missing');
      expect(result).toBeNull();
    });

    it('throws on other errors', async () => {
      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'DB_ERROR', message: 'Connection failed' },
        }),
      });

      await expect(getHousehold('hh-1')).rejects.toThrow('Connection failed');
    });

    it('returns household with members when found', async () => {
      const mockHousehold = { id: 'hh-1', name: 'Smith Family' };
      const mockMembers = [{ id: 'mem-1', user_id: 'user-1', role: 'owner' }];

      let callCount = 0;
      supabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockHousehold, error: null }),
          };
        }
        return makeQueryChain(mockMembers);
      });

      const result = await getHousehold('hh-1');
      expect(result?.id).toBe('hh-1');
      expect(result?.members).toHaveLength(1);
    });
  });

  describe('updateHousehold', () => {
    it('updates household name', async () => {
      const updated = { id: 'hh-1', name: 'New Name' };
      supabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: updated, error: null }),
      });

      const result = await updateHousehold({ householdId: 'hh-1', name: 'New Name' });
      expect(result.name).toBe('New Name');
    });

    it('throws on update error', async () => {
      supabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not authorized' },
        }),
      });

      await expect(updateHousehold({ householdId: 'hh-1', name: 'X' })).rejects.toThrow('Not authorized');
    });
  });

  describe('createInvite', () => {
    it('creates invite with generated token', async () => {
      const mockInvite = {
        id: 'invite-1',
        household_id: 'hh-1',
        email: 'friend@example.com',
        token: 'abc123',
        status: 'pending',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      };

      supabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockInvite, error: null }),
      });

      const result = await createInvite({
        householdId: 'hh-1',
        email: 'Friend@Example.com',
      });

      expect(result.household_id).toBe('hh-1');
    });

    it('throws on invite creation failure', async () => {
      supabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Email already invited' },
        }),
      });

      await expect(
        createInvite({ householdId: 'hh-1', email: 'test@test.com' })
      ).rejects.toThrow('Email already invited');
    });
  });

  describe('getUserPendingInvites', () => {
    it('returns pending invites for email', async () => {
      const mockInvites = [
        {
          id: 'invite-1',
          household_id: 'hh-1',
          email: 'test@example.com',
          households: { name: 'Smith Family' },
        },
      ];

      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockResolvedValue({ data: mockInvites, error: null }),
      });

      const result = await getUserPendingInvites('test@example.com');
      expect(result).toHaveLength(1);
      expect(result[0].household_name).toBe('Smith Family');
    });

    it('returns empty array when no invites', async () => {
      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      const result = await getUserPendingInvites('new@example.com');
      expect(result).toEqual([]);
    });

    it('returns empty array on permission error', async () => {
      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'permission denied for table household_invites' },
        }),
      });

      const result = await getUserPendingInvites('user@example.com');
      expect(result).toEqual([]);
    });
  });

  describe('generateInviteLink', () => {
    it('generates invite URL with token', () => {
      const link = generateInviteLink('abc123token');
      expect(link).toContain('abc123token');
    });

    it('returns a string', () => {
      expect(typeof generateInviteLink('token')).toBe('string');
    });
  });

  describe('leaveHousehold', () => {
    it('prevents owners from leaving', async () => {
      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'mem-1', role: 'owner' },
          error: null,
        }),
      });

      await expect(leaveHousehold({ householdId: 'hh-1', userId: 'user-1' })).rejects.toThrow(
        'Owners cannot leave'
      );
    });

    it('allows non-owners to leave', async () => {
      let callCount = 0;
      supabase.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          // First call: fetch member
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'mem-2', role: 'member' },
              error: null,
            }),
          };
        }
        if (callCount === 2) {
          // Second call: delete member
          return {
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        // Third call: logActivity insert
        return {
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      await expect(
        leaveHousehold({ householdId: 'hh-1', userId: 'user-2' })
      ).resolves.toBeUndefined();
    });
  });
});
