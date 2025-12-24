# Pantry Pal - Product Requirements Document

## Executive Summary

**Pantry Pal** is a mobile app that helps users manage their food inventory through barcode scanning, track expiration dates, and discover recipes based on available ingredients. The goal is to reduce food waste and save money by making better use of what's already in your pantry.

---

## Project Overview

| Attribute | Details |
|-----------|---------|
| **Project Name** | Pantry Pal |
| **Developer** | Shane (Christmas Break 2024 Project) |
| **Tech Stack** | React Native + Expo, Supabase, TypeScript |
| **Target Platforms** | iOS, Android |
| **Development Approach** | MVP-first, iterative |

---

## Tech Stack Decisions

### Frontend
- **React Native + Expo** (managed workflow with dev client for native modules)
- **Expo Router** for navigation
- **expo-camera** for barcode scanning (expo-barcode-scanner is deprecated as of SDK 51)

### Backend
- **Supabase** for auth, database, and real-time sync
- Row Level Security for multi-device support

### External APIs
| API | Purpose | Cost | Notes |
|-----|---------|------|-------|
| **Open Food Facts** | Barcode → Product lookup | Free | 3M+ food products, open source, includes nutrition |
| **TheMealDB** | Recipe search | Free | 593 recipes, filter by ingredient, simple API |
| **Spoonacular** (optional upgrade) | Advanced recipe search | Freemium | 365K recipes, "what's in your fridge" search |

---

## Data Model

### Supabase Schema

```sql
-- Users table (managed by Supabase Auth)

-- Pantry Items
CREATE TABLE pantry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  barcode TEXT,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  quantity INTEGER DEFAULT 1,
  unit TEXT, -- 'item', 'oz', 'lb', 'g', 'ml', 'l'
  expiration_date DATE,
  image_url TEXT,
  nutrition_json JSONB, -- Store Open Food Facts nutrition data
  location TEXT, -- 'pantry', 'fridge', 'freezer'
  added_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own items" ON pantry_items
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert own items" ON pantry_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update own items" ON pantry_items
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete own items" ON pantry_items
  FOR DELETE USING (auth.uid() = user_id);

-- Saved Recipes (optional for v1.1)
CREATE TABLE saved_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL, -- External API recipe ID
  recipe_name TEXT NOT NULL,
  recipe_image_url TEXT,
  recipe_source TEXT, -- 'themealdb' or 'spoonacular'
  saved_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Cache (reduce API calls)
CREATE TABLE product_cache (
  barcode TEXT PRIMARY KEY,
  product_data JSONB NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Feature Breakdown by Phase

### Phase 1: MVP (Christmas Break Target)
1. **User Authentication** - Email/password via Supabase
2. **Barcode Scanning** - Scan UPC codes using expo-camera
3. **Product Lookup** - Fetch product info from Open Food Facts
4. **Pantry CRUD** - Add, view, edit, delete pantry items
5. **Manual Entry** - Add items without barcode
6. **Basic Recipe Search** - Search TheMealDB by ingredient

### Phase 2: Enhanced (Post-MVP)
1. **Expiration Tracking** - Push notifications for expiring items
2. **Shopping List** - Generate list from recipes or low stock
3. **Recipe Matching** - "What can I make?" based on pantry
4. **Nutrition Dashboard** - Visualize pantry nutrition data
5. **Family Sharing** - Multiple users per household

### Phase 3: Premium Features (Future)
1. **Spoonacular Integration** - Advanced recipe matching
2. **Meal Planning** - Weekly meal plans
3. **Waste Tracking** - Analytics on food waste
4. **Smart Categories** - AI-powered organization

---

## API Integration Details

### Open Food Facts API

**Base URL:** `https://world.openfoodfacts.org/api/v2`

**Get Product by Barcode:**
```typescript
const getProductByBarcode = async (barcode: string) => {
  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,brands,image_url,nutriments,categories_tags`
  );
  const data = await response.json();
  
  if (data.status === 1) {
    return {
      name: data.product.product_name,
      brand: data.product.brands,
      imageUrl: data.product.image_url,
      nutrition: data.product.nutriments,
      categories: data.product.categories_tags
    };
  }
  return null; // Product not found
};
```

**Rate Limits:** 100 requests/minute for product queries

### TheMealDB API

**Base URL:** `https://www.themealdb.com/api/json/v1/1`

**Filter by Ingredient:**
```typescript
const getRecipesByIngredient = async (ingredient: string) => {
  const response = await fetch(
    `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ingredient)}`
  );
  const data = await response.json();
  return data.meals || [];
};
```

**Get Recipe Details:**
```typescript
const getRecipeById = async (id: string) => {
  const response = await fetch(
    `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`
  );
  const data = await response.json();
  return data.meals?.[0] || null;
};
```

---

## Screen Flow

```
┌─────────────────┐
│   Auth Flow     │
│  (Login/Signup) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Home/Pantry   │◄──────────────────┐
│   (Item List)   │                   │
└────────┬────────┘                   │
         │                            │
    ┌────┴────┐                       │
    │         │                       │
    ▼         ▼                       │
┌───────┐ ┌────────┐                  │
│ Scan  │ │ Manual │                  │
│ Item  │ │ Entry  │                  │
└───┬───┘ └───┬────┘                  │
    │         │                       │
    └────┬────┘                       │
         │                            │
         ▼                            │
┌─────────────────┐                   │
│ Product Details │───────────────────┘
│ (Add to Pantry) │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│    Recipes      │
│ (By Ingredient) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Recipe Details  │
└─────────────────┘
```

---

## Project Structure

```
pantry-pal/
├── app/                          # Expo Router screens
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx            # Pantry list
│   │   ├── scan.tsx             # Barcode scanner
│   │   └── recipes.tsx          # Recipe search
│   ├── item/
│   │   └── [id].tsx             # Item details
│   ├── recipe/
│   │   └── [id].tsx             # Recipe details
│   ├── _layout.tsx
│   └── +not-found.tsx
├── components/
│   ├── ui/                      # Reusable UI components
│   ├── PantryItemCard.tsx
│   ├── RecipeCard.tsx
│   └── BarcodeScanner.tsx
├── lib/
│   ├── supabase.ts              # Supabase client
│   ├── openFoodFacts.ts         # Open Food Facts API
│   ├── mealDb.ts                # TheMealDB API
│   └── types.ts                 # TypeScript types
├── hooks/
│   ├── usePantry.ts             # Pantry CRUD operations
│   ├── useAuth.ts               # Auth state
│   └── useRecipes.ts            # Recipe fetching
├── context/
│   └── AuthContext.tsx
├── assets/
├── app.json
├── package.json
└── tsconfig.json
```

---

## Development Milestones

### Day 1: Project Setup & Auth
- [ ] Initialize Expo project with TypeScript
- [ ] Set up Supabase project and schema
- [ ] Implement auth flow (login/signup/logout)
- [ ] Configure Expo Router navigation

### Day 2: Barcode Scanning
- [ ] Integrate expo-camera with barcode scanning
- [ ] Create scanner UI with viewfinder
- [ ] Handle camera permissions
- [ ] Test barcode detection

### Day 3: Product Lookup & Pantry
- [ ] Integrate Open Food Facts API
- [ ] Create product details screen
- [ ] Implement "Add to Pantry" flow
- [ ] Build pantry list view with CRUD

### Day 4: Manual Entry & Polish
- [ ] Create manual item entry form
- [ ] Add quantity/expiration tracking
- [ ] Implement edit/delete functionality
- [ ] Add loading states and error handling

### Day 5: Recipe Integration
- [ ] Integrate TheMealDB API
- [ ] Build recipe search by ingredient
- [ ] Create recipe details screen
- [ ] Connect recipes to pantry items

### Day 6: Polish & Deploy
- [ ] Add empty states and onboarding
- [ ] Implement pull-to-refresh
- [ ] Performance optimization
- [ ] Build and test on device

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Barcode recognition rate | >90% of common groceries |
| Time to add item (scan) | <5 seconds |
| Time to add item (manual) | <15 seconds |
| Recipe results per search | >3 recipes |
| App crashes | 0 during demo |

---

## Known Limitations (MVP)

1. **Open Food Facts coverage** - Not all products are in the database; manual entry fallback required
2. **TheMealDB recipes** - Limited to ~600 recipes; Spoonacular upgrade available later
3. **Single user only** - No household sharing in MVP
4. **No push notifications** - Expiration reminders require background tasks (Phase 2)
5. **No offline mode** - Requires internet for API calls

---

## Notes for Development

- Use `expo-secure-store` for auth token persistence
- Cache product lookups in Supabase to reduce API calls
- Debounce barcode scanning to prevent duplicate scans
- Use Supabase realtime for potential multi-device sync later
- Consider Zustand or Jotai for client state if Context gets complex
