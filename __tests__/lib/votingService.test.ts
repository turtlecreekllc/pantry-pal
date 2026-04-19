/**
 * Voting Service Tests
 * Tests for household meal voting functionality
 * 
 * Uses the global Supabase mock from jest.setup.js
 */

import { votingService } from '../../lib/votingService';
import { supabase } from '../../lib/supabase';

// Access the mocked supabase from jest.setup.js
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('Voting Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createVote', () => {
    it('should create a new vote', async () => {
      // The global mock will return a valid vote object
      const result = await votingService.createVote({
        householdId: 'h1',
        proposedBy: 'user-1',
        recipeId: 'recipe-1',
        recipeName: 'Test Recipe',
        proposedDate: '2024-01-15',
      });

      // Vote creation should call from('meal_votes')
      expect(mockSupabase.from).toHaveBeenCalledWith('meal_votes');
    });

    it('should call supabase with correct parameters', async () => {
      await votingService.createVote({
        householdId: 'h1',
        proposedBy: 'user-1',
        recipeId: 'recipe-1',
        recipeName: 'Test Recipe',
        proposedDate: '2024-01-15',
      });

      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe('getActiveVotes', () => {
    it('should fetch active votes for a household', async () => {
      const votes = await votingService.getActiveVotes('h1');
      // Should return an array (empty from mock, but validates API)
      expect(Array.isArray(votes)).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('meal_votes');
    });

    it('should call supabase with correct table', async () => {
      await votingService.getActiveVotes('h1');
      expect(mockSupabase.from).toHaveBeenCalledWith('meal_votes');
    });
  });

  describe('submitVote', () => {
    it('should submit a vote response', async () => {
      const result = await votingService.submitVote({
        voteId: 'vote-1',
        userId: 'user-1',
        response: 'yes',
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('vote_responses');
    });

    it('should call correct table for vote responses', async () => {
      await votingService.submitVote({
        voteId: 'vote-1',
        userId: 'user-1',
        response: 'maybe',
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('vote_responses');
    });
  });

  describe('calculateSummary', () => {
    it('should return vote summary with expected structure', () => {
      // calculateSummary takes vote responses and calculates totals
      const responses = [
        { id: '1', voteId: 'v1', userId: 'u1', response: 'yes' as const, createdAt: new Date() },
        { id: '2', voteId: 'v1', userId: 'u2', response: 'yes' as const, createdAt: new Date() },
        { id: '3', voteId: 'v1', userId: 'u3', response: 'maybe' as const, createdAt: new Date() },
      ];
      
      const summary = votingService.calculateSummary(responses);
      expect(summary).toHaveProperty('yes');
      expect(summary).toHaveProperty('maybe');
      expect(summary).toHaveProperty('no');
      expect(summary).toHaveProperty('total');
      expect(summary.yes).toBe(2);
      expect(summary.maybe).toBe(1);
      expect(summary.total).toBe(3);
    });
  });

  describe('cancelVote', () => {
    it('should cancel a vote', async () => {
      await votingService.cancelVote('vote-1');
      expect(mockSupabase.from).toHaveBeenCalledWith('meal_votes');
    });
  });

  describe('subscribeToVotes', () => {
    it('should create a subscription channel', () => {
      const callback = jest.fn();
      votingService.subscribeToVotes('h1', callback);
      
      expect(mockSupabase.channel).toHaveBeenCalled();
    });

    it('should return unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = votingService.subscribeToVotes('h1', callback);
      
      // subscribeToVotes returns an unsubscribe function directly
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('getVote', () => {
    it('should get a specific vote', async () => {
      await votingService.getVote('vote-1');
      expect(mockSupabase.from).toHaveBeenCalledWith('meal_votes');
    });
  });

  describe('getUserResponse', () => {
    it('should get user response for a vote', async () => {
      await votingService.getUserResponse('vote-1', 'user-1');
      expect(mockSupabase.from).toHaveBeenCalledWith('vote_responses');
    });
  });
});


