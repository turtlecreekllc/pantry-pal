-- Migration: Add cooking preferences (high altitude and equipment)
-- Date: 2024-12-30

-- Add high_altitude_cooking column to user_preferences
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS high_altitude_cooking BOOLEAN DEFAULT FALSE;

-- Add cooking_equipment column to user_preferences (array of equipment IDs)
-- Default to common household equipment: stovetop, oven, microwave
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS cooking_equipment TEXT[] DEFAULT ARRAY['stovetop', 'oven', 'microwave'];

-- Add comment for documentation
COMMENT ON COLUMN user_preferences.high_altitude_cooking IS 'Whether user cooks at high altitude (3000+ ft) requiring recipe adjustments';
COMMENT ON COLUMN user_preferences.cooking_equipment IS 'Array of cooking equipment IDs: stovetop, oven, microwave, air_fryer, grill, smoker, instant_pot, slow_cooker';

