# Pantry Pal - Claude Code Prompts

These prompts are designed to be used sequentially with Claude Code to build the Pantry Pal app. Each prompt builds on the previous work. Copy and paste each prompt into Claude Code as you progress through development.

---

## Prompt 1: Project Initialization

```
Initialize a new React Native Expo project called "pantry-pal" with the following specifications:

1. Use the Expo managed workflow with TypeScript template
2. Install these dependencies:
   - expo-router for navigation
   - expo-camera (for barcode scanning)
   - @supabase/supabase-js
   - expo-secure-store (for token storage)
   - react-native-safe-area-context
   - expo-status-bar

3. Set up the project structure:
   - app/ directory with (auth), (tabs), item, and recipe route groups
   - components/ directory with ui/ subdirectory
   - lib/ directory for API clients and types
   - hooks/ directory for custom hooks
   - context/ directory for React Context providers

4. Configure app.json with:
   - App name: "Pantry Pal"
   - Bundle identifier: com.yourname.pantrypal
   - Camera permission description: "Pantry Pal needs camera access to scan product barcodes"

5. Create a basic _layout.tsx with a root navigation structure

Run `npx expo install` to ensure all dependencies are compatible with the current Expo SDK.
```

---

## Prompt 2: Supabase Setup

```
Set up Supabase integration for the pantry-pal project:

1. Create lib/supabase.ts with:
   - Supabase client initialization using environment variables
   - Custom storage adapter using expo-secure-store for auth tokens
   - Export the supabase client

2. Create lib/types.ts with TypeScript interfaces for:
   - PantryItem (id, user_id, barcode, name, brand, category, quantity, unit, expiration_date, image_url, nutrition_json, location, added_at, updated_at)
   - ProductInfo (from Open Food Facts response)
   - Recipe (from TheMealDB response)
   - User (from Supabase auth)

3. Create context/AuthContext.tsx with:
   - AuthProvider component that wraps the app
   - useAuth hook exposing: user, session, signIn, signUp, signOut, loading
   - Handle auth state changes with supabase.auth.onAuthStateChange
   - Persist session using expo-secure-store

4. Create an .env.example file with placeholders for:
   - EXPO_PUBLIC_SUPABASE_URL
   - EXPO_PUBLIC_SUPABASE_ANON_KEY

5. Update app/_layout.tsx to wrap the app with AuthProvider

Note: I'll provide my actual Supabase credentials separately - just use placeholders for now.
```

---

## Prompt 3: Authentication Screens

```
Create the authentication flow for pantry-pal:

1. Create app/(auth)/_layout.tsx:
   - Simple stack navigator for auth screens
   - Redirect to main app if user is already authenticated

2. Create app/(auth)/login.tsx:
   - Email and password input fields
   - "Sign In" button that calls signIn from useAuth
   - Link to signup screen
   - Loading state while authenticating
   - Error handling with user-friendly messages
   - Clean, minimal UI design

3. Create app/(auth)/signup.tsx:
   - Email and password input fields
   - Confirm password field with validation
   - "Create Account" button that calls signUp from useAuth
   - Link back to login screen
   - Loading state and error handling

4. Update app/_layout.tsx to:
   - Check authentication state
   - Show auth screens if not logged in
   - Show main tabs if logged in
   - Show a loading screen while checking auth state

5. Create components/ui/Button.tsx:
   - Reusable button component with loading state
   - Primary and secondary variants

6. Create components/ui/Input.tsx:
   - Reusable text input with label
   - Error state styling
   - Secure text entry option for passwords

Keep the UI simple and functional - we'll polish it later.
```

---

## Prompt 4: Tab Navigation & Pantry List

```
Create the main tab navigation and pantry list screen:

1. Create app/(tabs)/_layout.tsx:
   - Bottom tab navigator with 3 tabs: Pantry (home icon), Scan (camera icon), Recipes (book icon)
   - Use @expo/vector-icons for icons
   - Clean tab bar styling

2. Create hooks/usePantry.ts:
   - Custom hook that provides:
     - pantryItems: PantryItem[] - current user's items
     - loading: boolean
     - error: string | null
     - addItem(item): Promise<void>
     - updateItem(id, updates): Promise<void>
     - deleteItem(id): Promise<void>
     - refreshPantry(): Promise<void>
   - Use Supabase queries with RLS (user_id = auth.uid())
   - Handle real-time updates optionally

3. Create components/PantryItemCard.tsx:
   - Display item image (or placeholder), name, brand
   - Show quantity and location badge
   - Show expiration date with color coding (green/yellow/red based on days remaining)
   - Swipe to delete functionality (optional for MVP)
   - Tap to navigate to item details

4. Create app/(tabs)/index.tsx (Pantry screen):
   - FlatList of PantryItemCard components
   - Pull-to-refresh functionality
   - Empty state with message "Your pantry is empty. Scan items to get started!"
   - Floating action button to manually add item (optional)
   - Search/filter bar (stretch goal)

5. Create a simple loading skeleton for the list items while data loads
```

---

## Prompt 5: Barcode Scanner

```
Implement barcode scanning functionality:

1. Create components/BarcodeScanner.tsx:
   - Use expo-camera's CameraView with barcode scanning enabled
   - Set barcodeScannerSettings to detect UPC-A, UPC-E, EAN-8, EAN-13 codes
   - Add a viewfinder overlay (transparent box in center)
   - Add torch/flash toggle button
   - Handle camera permissions with clear UI for denied state
   - Debounce scanning to prevent duplicate reads (500ms cooldown)
   - onBarcodeScanned callback prop

2. Create app/(tabs)/scan.tsx:
   - Full-screen BarcodeScanner component
   - When barcode detected:
     - Show brief "Scanning..." feedback
     - Call Open Food Facts API to lookup product
     - If found: navigate to product details/add screen
     - If not found: prompt for manual entry with barcode pre-filled
   - Cancel button to return to pantry

3. Create lib/openFoodFacts.ts:
   - getProductByBarcode(barcode: string): Promise<ProductInfo | null>
   - Transform API response to our ProductInfo type
   - Handle API errors gracefully
   - Add basic request timeout (5 seconds)

4. Create app/item/add.tsx:
   - Show product info from API (image, name, brand, nutrition)
   - Allow editing name if needed
   - Quantity selector (default 1)
   - Location picker (Pantry, Fridge, Freezer)
   - Optional expiration date picker
   - "Add to Pantry" button
   - "Not the right product? Enter manually" link

The scanner should feel responsive - immediate feedback when a barcode is detected.
```

---

## Prompt 6: Manual Entry & Item Details

```
Create manual entry and item details screens:

1. Create app/item/manual.tsx:
   - Form with fields:
     - Name (required)
     - Brand (optional)
     - Category dropdown (Produce, Dairy, Meat, Pantry, Frozen, Beverages, Snacks, Other)
     - Quantity with unit selector
     - Location (Pantry, Fridge, Freezer)
     - Expiration date (optional date picker)
     - Barcode (optional, pre-filled if coming from failed scan)
   - Form validation
   - "Add to Pantry" button
   - Cancel button to go back

2. Create app/item/[id].tsx:
   - Display full item details
   - Editable fields (tap to edit)
   - Quantity increment/decrement buttons
   - Nutrition info section (if available from API)
   - "Find Recipes" button that searches for recipes with this ingredient
   - Delete button with confirmation
   - Save changes on blur or explicit save button

3. Create components/ui/DatePicker.tsx:
   - Simple date picker for expiration dates
   - Show "No expiration" option
   - Display friendly date format

4. Create components/ui/QuantitySelector.tsx:
   - Plus/minus buttons with quantity display
   - Long-press for rapid increment
   - Unit display (items, oz, lb, etc.)

5. Update usePantry hook if needed to support these operations

Add proper keyboard handling - dismiss keyboard on scroll, next field focus, etc.
```

---

## Prompt 7: Recipe Integration

```
Integrate TheMealDB for recipe search:

1. Create lib/mealDb.ts:
   - searchByIngredient(ingredient: string): Promise<RecipePreview[]>
   - getRecipeById(id: string): Promise<Recipe>
   - Define RecipePreview type (id, name, thumbnail)
   - Define Recipe type (full details including ingredients array, instructions, video link)
   - Parse the weird TheMealDB ingredient format (strIngredient1, strMeasure1, etc.) into a clean array

2. Create hooks/useRecipes.ts:
   - recipes: RecipePreview[]
   - selectedRecipe: Recipe | null
   - loading: boolean
   - searchRecipes(ingredient: string): Promise<void>
   - fetchRecipeDetails(id: string): Promise<void>

3. Create components/RecipeCard.tsx:
   - Recipe thumbnail image
   - Recipe name
   - Category/area badge (if available)
   - Tap to view details

4. Create app/(tabs)/recipes.tsx:
   - Search bar at top
   - "Search by ingredient" placeholder text
   - Grid or list of RecipeCard results
   - Empty state: "Search for recipes by ingredient"
   - Quick suggestions based on pantry items (stretch goal)

5. Create app/recipe/[id].tsx:
   - Large hero image
   - Recipe name and category
   - Ingredients list with quantities
   - Step-by-step instructions
   - "Watch Video" button if YouTube link available
   - "Check Pantry" button showing which ingredients you have/need (stretch goal)

The recipe search should work standalone but also be accessible from item details to find recipes using that ingredient.
```

---

## Prompt 8: Polish & Error Handling

```
Add polish, error handling, and improve UX:

1. Create components/ui/Toast.tsx or integrate a toast library:
   - Success/error/info toast notifications
   - "Item added to pantry" success message
   - Error messages for API failures
   - Use for all async operations

2. Create components/EmptyState.tsx:
   - Reusable empty state component
   - Icon, title, description, optional action button
   - Use throughout app for empty lists

3. Create components/LoadingSkeleton.tsx:
   - Shimmer loading animation
   - Variants for list items, cards, details

4. Add error boundaries:
   - Create components/ErrorBoundary.tsx
   - Wrap main sections of the app
   - Show friendly error screen with retry button

5. Improve offline handling:
   - Detect network status
   - Show offline banner when disconnected
   - Queue operations for when back online (optional)

6. Add haptic feedback:
   - Use expo-haptics for button presses
   - Light haptic on barcode scan success
   - Medium haptic on item added

7. Improve accessibility:
   - Add accessibilityLabel to interactive elements
   - Ensure proper contrast ratios
   - Support dynamic text sizes

8. Add a simple onboarding screen:
   - Show on first launch
   - Brief explanation of app features
   - "Scan your first item" CTA
   - Store onboarding completion in AsyncStorage

Review the entire app for consistent styling, loading states, and error handling.
```

---

## Prompt 9: Product Caching & Performance

```
Optimize performance with caching and efficiency improvements:

1. Implement product caching in Supabase:
   - Before calling Open Food Facts, check product_cache table
   - If cached and less than 7 days old, use cached data
   - If not cached or stale, fetch from API and cache result
   - Create lib/productCache.ts with checkCache() and cacheProduct() functions

2. Optimize Supabase queries:
   - Add indexes to pantry_items table (user_id, barcode, expiration_date)
   - Use select() to only fetch needed fields
   - Implement pagination for large pantries (20 items per page)

3. Optimize images:
   - Use expo-image or react-native-fast-image for better caching
   - Add placeholder images while loading
   - Implement lazy loading for off-screen images

4. Reduce re-renders:
   - Memoize expensive components with React.memo
   - Use useCallback for handler functions
   - Use useMemo for computed values

5. Add splash screen:
   - Configure expo-splash-screen
   - Keep splash visible until auth state is determined
   - Smooth transition to app

6. Bundle size optimization:
   - Run `npx expo install --check` to verify compatible versions
   - Review and remove unused dependencies

7. Add analytics tracking (optional):
   - Set up basic event tracking for key actions
   - Track: items_added, items_scanned, recipes_viewed
   - Could use PostHog since you're familiar with it

The app should feel snappy - target <100ms response for local operations.
```

---

## Prompt 10: Testing & Deployment Prep

```
Prepare for testing and deployment:

1. Add basic testing setup:
   - Install jest and @testing-library/react-native
   - Create __tests__ directory structure
   - Write tests for critical functions:
     - Barcode parsing
     - Date expiration calculations
     - API response transformations

2. Create test fixtures:
   - Sample Open Food Facts API responses
   - Sample TheMealDB API responses
   - Mock Supabase client for testing

3. Update app.json for production:
   - Add proper app icons (use placeholder for now)
   - Configure splash screen
   - Set appropriate permissions
   - Add privacy policy URL (placeholder)

4. Create eas.json for EAS Build:
   - Development build profile
   - Preview/internal testing profile
   - Production profile
   - Configure environment variables

5. Document the setup process:
   - Create README.md with:
     - Project overview
     - Setup instructions
     - Environment variables needed
     - How to run locally
     - How to build for testing

6. Create a simple CHANGELOG.md:
   - Version 1.0.0 initial release notes

7. Verify the app works on both iOS and Android:
   - Test on iOS simulator
   - Test on Android emulator
   - Note any platform-specific issues

Run `npx expo doctor` to check for any configuration issues before building.
```

---

## Bonus Prompts (Post-MVP)

### Expiration Notifications
```
Add expiration date notifications using expo-notifications:
- Request notification permissions on first launch
- Schedule local notifications for items expiring in 3 days and 1 day
- Allow users to configure notification preferences
- Clear notifications when item is deleted or date is updated
```

### Shopping List Integration
```
Add a shopping list feature:
- New tab or section for shopping list
- "Add to shopping list" button on recipe details
- Auto-populate missing ingredients from a recipe
- Checkbox to mark items as purchased
- Option to add purchased items directly to pantry
```

### Advanced Recipe Matching
```
Upgrade to Spoonacular API for better recipe matching:
- Use their "findByIngredients" endpoint
- Show match percentage (you have X of Y ingredients)
- Filter by diet preferences
- Sort by minimal missing ingredients
- Show what ingredients you're missing
```

---

## Environment Variables Template

Create a `.env` file (don't commit to git):

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Supabase SQL Migration

Run this in your Supabase SQL editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Pantry Items table
CREATE TABLE IF NOT EXISTS pantry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  barcode TEXT,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  quantity INTEGER DEFAULT 1,
  unit TEXT DEFAULT 'item',
  expiration_date DATE,
  image_url TEXT,
  nutrition_json JSONB,
  location TEXT DEFAULT 'pantry',
  added_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Cache table
CREATE TABLE IF NOT EXISTS product_cache (
  barcode TEXT PRIMARY KEY,
  product_data JSONB NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved Recipes table (optional)
CREATE TABLE IF NOT EXISTS saved_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipe_id TEXT NOT NULL,
  recipe_name TEXT NOT NULL,
  recipe_image_url TEXT,
  recipe_source TEXT DEFAULT 'themealdb',
  saved_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_recipes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pantry_items
CREATE POLICY "Users can view own pantry items" ON pantry_items
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert own pantry items" ON pantry_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update own pantry items" ON pantry_items
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete own pantry items" ON pantry_items
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for saved_recipes
CREATE POLICY "Users can view own saved recipes" ON saved_recipes
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert own saved recipes" ON saved_recipes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can delete own saved recipes" ON saved_recipes
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pantry_items_user_id ON pantry_items(user_id);
CREATE INDEX IF NOT EXISTS idx_pantry_items_barcode ON pantry_items(barcode);
CREATE INDEX IF NOT EXISTS idx_pantry_items_expiration ON pantry_items(expiration_date);
CREATE INDEX IF NOT EXISTS idx_saved_recipes_user_id ON saved_recipes(user_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pantry_items_updated_at
  BEFORE UPDATE ON pantry_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Quick Reference: API Endpoints

### Open Food Facts
- **Get Product:** `GET https://world.openfoodfacts.org/api/v2/product/{barcode}`
- **Fields param:** `?fields=product_name,brands,image_url,nutriments,categories_tags`

### TheMealDB
- **Search by ingredient:** `GET https://www.themealdb.com/api/json/v1/1/filter.php?i={ingredient}`
- **Get recipe details:** `GET https://www.themealdb.com/api/json/v1/1/lookup.php?i={id}`
- **Search by name:** `GET https://www.themealdb.com/api/json/v1/1/search.php?s={name}`
- **Random recipe:** `GET https://www.themealdb.com/api/json/v1/1/random.php`
- **List categories:** `GET https://www.themealdb.com/api/json/v1/1/categories.php`
