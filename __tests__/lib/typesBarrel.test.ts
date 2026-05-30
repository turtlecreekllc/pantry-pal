/**
 * lib/types barrel + per-domain split regression tests
 *
 * After QUAL-005 decomposed lib/types.ts into per-domain files under
 * lib/types/, the public API must stay byte-compatible: every consumer
 * imports from '../lib/types' and expects the same constants, helpers,
 * and runtime values to resolve.
 *
 * These tests pin the contract:
 *   1. The barrel re-exports the subscription tier helpers (only runtime
 *      functions in the file — types are erased so they can't be tested).
 *   2. The same identity is reachable through the direct domain path,
 *      proving the barrel forwards rather than redeclares.
 */

import * as Barrel from '../../lib/types';
import {
  getTierCategory,
  isPaidTier,
  isTrialTier,
  hasIndividualAccess,
  hasFamilyAccess,
} from '../../lib/types/subscription';

describe('lib/types barrel re-exports', () => {
  it('exposes subscription tier helpers from the root barrel', () => {
    expect(typeof Barrel.getTierCategory).toBe('function');
    expect(typeof Barrel.isPaidTier).toBe('function');
    expect(typeof Barrel.isTrialTier).toBe('function');
  });

  it('barrel and domain module return the same function reference', () => {
    expect(Barrel.getTierCategory).toBe(getTierCategory);
    expect(Barrel.isPaidTier).toBe(isPaidTier);
    expect(Barrel.isTrialTier).toBe(isTrialTier);
  });

  it('exposes runtime constants from multiple domains', () => {
    // pantry domain
    expect(Barrel.FILL_LEVELS).toContain('full');
    expect(Barrel.AISLES).toContain('Produce');
    expect(Barrel.UNITS).toContain('oz');
    // meal-plan domain
    expect(Barrel.MEAL_TYPES).toContain('dinner');
    // household domain
    expect(Barrel.HOUSEHOLD_ROLES).toContain('owner');
    // subscription domain
    expect(Barrel.SUBSCRIPTION_TIERS).toContain('free');
    expect(Barrel.PLAN_PRICING.free.price).toBe(0);
    // apple-iap domain
    expect(Barrel.PAYMENT_PROVIDERS).toContain('apple');
  });
});

describe('subscription tier helpers', () => {
  it('getTierCategory maps tiers correctly', () => {
    expect(getTierCategory('free')).toBe('free');
    expect(getTierCategory('individual_monthly')).toBe('individual');
    expect(getTierCategory('individual_annual')).toBe('individual');
    expect(getTierCategory('family_monthly')).toBe('family');
    expect(getTierCategory('family_annual')).toBe('family');
    // trial tiers contain their category name in the slug
    expect(getTierCategory('trial_individual')).toBe('individual');
    expect(getTierCategory('trial_family')).toBe('family');
  });

  it('isPaidTier returns true only for non-free, non-trial tiers', () => {
    expect(isPaidTier('free')).toBe(false);
    expect(isPaidTier('trial_individual')).toBe(false);
    expect(isPaidTier('trial_family')).toBe(false);
    expect(isPaidTier('individual_monthly')).toBe(true);
    expect(isPaidTier('individual_annual')).toBe(true);
    expect(isPaidTier('family_monthly')).toBe(true);
    expect(isPaidTier('family_annual')).toBe(true);
  });

  it('isTrialTier identifies trial tiers', () => {
    expect(isTrialTier('trial_individual')).toBe(true);
    expect(isTrialTier('trial_family')).toBe(true);
    expect(isTrialTier('free')).toBe(false);
    expect(isTrialTier('individual_monthly')).toBe(false);
  });

  it('hasIndividualAccess is true for everything except free', () => {
    expect(hasIndividualAccess('free')).toBe(false);
    expect(hasIndividualAccess('individual_monthly')).toBe(true);
    expect(hasIndividualAccess('family_monthly')).toBe(true);
    expect(hasIndividualAccess('trial_individual')).toBe(true);
    expect(hasIndividualAccess('trial_family')).toBe(true);
  });

  it('hasFamilyAccess is true only for family tiers', () => {
    expect(hasFamilyAccess('free')).toBe(false);
    expect(hasFamilyAccess('individual_monthly')).toBe(false);
    expect(hasFamilyAccess('individual_annual')).toBe(false);
    expect(hasFamilyAccess('trial_individual')).toBe(false);
    expect(hasFamilyAccess('family_monthly')).toBe(true);
    expect(hasFamilyAccess('family_annual')).toBe(true);
    expect(hasFamilyAccess('trial_family')).toBe(true);
  });
});
