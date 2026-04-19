# Product Requirements Document
## Recipe Management & Meal Planning System

**DinnerPlans**  
Version 1.0 | December 2024

---

| Field | Value |
|-------|-------|
| **Document Owner** | Shane (Product Lead) |
| **Product** | DinnerPlans |
| **Feature** | Recipe Management & Meal Planning |
| **Status** | Draft |
| **Target Release** | Q2 2025 |

---

## Executive Summary

This PRD outlines the integration of comprehensive recipe management and meal planning functionality into DinnerPlans. Drawing inspiration from successful applications like ReciMe (4.8 stars, 161K+ ratings), this feature set will transform DinnerPlans from a pantry tracking tool into a complete kitchen management ecosystem that actively reduces food waste through intelligent recipe suggestions and meal planning.

The core innovation lies in connecting DinnerPlans's existing barcode-scanning inventory system with recipe management, enabling AI-powered suggestions that prioritize ingredients nearing expiration. This creates a unique value proposition:

> ***"Use what you have, waste nothing, eat well."***

---

## Problem Statement

### Current User Pain Points

- **Recipe Fragmentation:** Users save recipes across Instagram, TikTok, Pinterest, YouTube, and cooking blogs with no unified system to access them
- **Disconnected Planning:** Existing pantry contents aren't considered when users plan meals, leading to duplicate purchases and waste
- **Expiration Blindness:** Users don't know which items to prioritize cooking before they spoil
- **Manual Grocery Lists:** Creating shopping lists from recipes is time-consuming and error-prone
- **Recipe Format Chaos:** Social media recipes are often buried in long captions, videos, or audio without structured ingredient lists

### Market Opportunity

The recipe management app market is validated by ReciMe's success (161K ratings, $30-60/year subscription). However, no current solution integrates real-time pantry inventory with recipe management. This gap represents DinnerPlans's competitive moat.

---

## Goals & Success Metrics

### Primary Goals

1. Reduce household food waste by 30% through intelligent recipe suggestions
2. Become the single source of truth for users' recipe collections
3. Increase weekly active usage to 5+ sessions per user
4. Achieve premium conversion rate of 15% within 6 months of launch

### Key Performance Indicators

| Metric | Target (6 months) | Target (12 months) |
|--------|-------------------|---------------------|
| Recipes saved per user | 25+ | 75+ |
| Meal plans created weekly | 2+ | 4+ |
| Food waste reduction | 20% | 30% |
| Weekly active users | 60% | 75% |
| Premium conversion | 10% | 15% |

---

## Feature Requirements

### 1. Universal Recipe Import System

**Priority:** P0 (Critical) | **Effort:** High

Enable users to import recipes from any source into a unified, structured format that integrates with their pantry inventory.

#### 1.1 Social Media Import

- **Instagram:** Extract recipes from posts, reels, and stories via share extension
- **TikTok:** Parse video captions and audio transcription for ingredient lists
- **YouTube:** Extract from video descriptions and auto-generated captions
- **Pinterest:** Follow pin links and extract structured recipe data
- **Facebook:** Support public recipe posts and shared links

#### 1.2 Website & Blog Import

- Automatic JSON-LD schema detection for structured recipe data
- AI-powered extraction for unstructured recipe content
- Skip lengthy blog intros—extract only ingredients and instructions
- Preserve original source URL for attribution

#### 1.3 Manual Entry & Import

- Paste text with AI parsing of ingredients and steps
- Voice-to-recipe: Dictate recipes hands-free
- Import from Notes, Google Docs, Paprika, Notion

#### 1.4 Recipe Card Scanning (Differentiator)

> 🧡 **EMOTIONAL HOOK:** "Digitize grandma's recipes before they're lost forever." Physical recipe cards carry sentimental value that digital-native recipes don't. This feature preserves family culinary heritage while making it searchable and usable.

**Capture & Recognition**

- Camera capture with automatic edge detection and cropping
- Support for standard 3x5 and 4x6 recipe cards
- Magazine/cookbook page scanning with multi-column detection
- Low-light enhancement for faded or aged cards

**OCR & Handwriting Recognition**

- Printed text extraction via Google Cloud Vision
- Handwriting recognition for cursive and print handwriting
- Multi-language support (English, Spanish, Italian, French, German)
- Confidence scoring with manual correction prompts for unclear text

**AI-Powered Parsing**

- Automatic separation of ingredients vs. instructions
- Quantity and unit extraction ("2 cups flour" → 2, cups, flour)
- Cooking time inference from instructions ("bake for 45 minutes")
- Serving size detection when present

**Preservation & Organization**

- Original photo saved alongside structured recipe (view the actual card)
- "Family Recipes" default cookbook for scanned cards
- Attribution field: "From Grandma Rose's recipe box"
- Date/era tagging: "1960s", "Mom's college years"

**Batch Digitization Mode**

- Rapid-fire scanning for digitizing entire recipe boxes
- Queue management: scan now, process later
- Progress tracking: "47 of 120 recipes digitized"
- Export option: Create a shareable family cookbook PDF

#### 1.5 Audio/Video Intelligence (Differentiator)

- Transcribe cooking videos to extract verbal instructions
- AI identifies ingredients mentioned in audio even without written captions
- Timestamp linking for step-by-step video playback

---

### 2. Recipe Organization & Discovery

**Priority:** P0 (Critical) | **Effort:** Medium

#### 2.1 Cookbook Collections

- Create unlimited custom cookbooks
- Smart collections: "Quick Meals (<30 min)", "Kid-Friendly", "Date Night"
- Auto-categorization by cuisine, meal type, dietary restrictions
- Shareable cookbooks with friends and family

#### 2.2 Tagging & Filtering

- **Meal type:** Breakfast, Lunch, Dinner, Snack, Dessert
- **Cuisine:** Italian, Mexican, Asian, Mediterranean, American, etc.
- **Diet:** Vegetarian, Vegan, Keto, Gluten-Free, Dairy-Free
- **Difficulty:** Easy, Medium, Advanced
- **Time:** Prep time, Cook time, Total time
- Custom user tags

#### 2.3 Recipe Ratings & Notes

- 5-star rating system with personal notes
- "Made it" counter to track cooking history
- Photo gallery for each recipe (your results)
- Modification notes: "Used chicken instead of tofu"

---

### 3. Pantry-Aware Recipe Intelligence

**Priority:** P0 (Critical) — Core Differentiator | **Effort:** High

> 💡 **KEY DIFFERENTIATOR:** This is DinnerPlans's competitive moat. No other recipe app connects real-time pantry inventory with recipe suggestions. This feature alone justifies the premium subscription.

#### 3.1 "What Can I Make?" Engine

- Real-time matching of pantry inventory against recipe ingredients
- Percentage match indicator: "You have 8 of 10 ingredients"
- Missing ingredients highlighted with "Add to grocery list" option
- Substitution suggestions for missing items

#### 3.2 Expiration-Priority Suggestions

- **"Use It Soon" recipes:** Prioritize items expiring within 3 days
- Daily push notifications: "Your chicken expires tomorrow—here are 5 recipes"
- Weekly "Waste Prevention" report with recipe suggestions
- Gamification: Track food saved from waste

#### 3.3 AI Recipe Generation

- Generate custom recipes based on available pantry items
- Respect dietary preferences and restrictions
- "Chef mode": Creative suggestions using unusual ingredient combinations
- Leftover transformation: Turn last night's dinner into something new

---

### 4. Meal Planning System

**Priority:** P1 (High) | **Effort:** Medium

#### 4.1 Weekly Meal Calendar

- Drag-and-drop recipe scheduling
- Breakfast, Lunch, Dinner, and Snack slots
- Family/household support: Plan for multiple people
- Calendar sync (Google Calendar, Apple Calendar)
- Copy previous week's plan as template

#### 4.2 Smart Plan Generation

- AI-generated weekly plans based on preferences and pantry
- Budget-conscious meal planning
- Nutritional balancing across the week
- Variety optimization (avoid repetitive meals)

---

### 5. Smart Grocery Lists

**Priority:** P1 (High) | **Effort:** Medium

#### 5.1 Automatic List Generation

- Generate list from meal plan with one tap
- Automatically exclude items already in pantry
- Consolidate quantities across multiple recipes
- Add individual recipe ingredients to existing list

#### 5.2 Shopping Optimization

- Sort by supermarket aisle (Produce, Dairy, Meat, etc.)
- Sort by recipe (shop one dish at a time)
- Check off items while shopping
- Share list with family members

#### 5.3 Store Integration (Future)

- Connect to Walmart, Kroger, Instacart for online ordering
- Price comparison across stores
- Automatic cart population

---

### 6. Cooking Experience

**Priority:** P1 (High) | **Effort:** Low-Medium

#### 6.1 Cook Mode

- Keep screen awake while cooking
- Large, readable text for instructions
- Step-by-step progression with swipe navigation
- Voice control: "Hey Siri, next step"
- Built-in timers per step

#### 6.2 Serving Adjustments

- Scale ingredients up or down (2 servings → 8 servings)
- Smart rounding for practical measurements
- Metric/Imperial conversion toggle

#### 6.3 Nutritional Information

- Calculate calories, protein, carbs, fat per serving
- Allergen identification
- Integration with MyFitnessPal (stretch goal)

---

### 7. Social & Sharing

**Priority:** P2 (Medium) | **Effort:** Medium

- Share individual recipes via SMS, Email, WhatsApp, AirDrop
- Share entire cookbooks with family/friends
- Collaborative meal planning for households
- User profiles with bio and recipe collection links
- Recipe export to PDF for printing

---

## Technical Requirements

### Architecture

- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI/ML:** OpenAI GPT-4o for recipe extraction and generation
- **Transcription:** Whisper API for video/audio recipe extraction
- **OCR:** Google Cloud Vision for printed recipe scanning
- **Nutrition:** USDA FoodData Central API
- **Analytics:** PostHog for product analytics

### Data Model (Key Entities)

| Entity | Key Fields |
|--------|------------|
| `recipes` | id, user_id, title, description, ingredients[], instructions[], source_url, image_url, prep_time, cook_time, servings, nutrition{}, tags[], created_at |
| `cookbooks` | id, user_id, name, description, is_public, recipe_ids[], cover_image |
| `meal_plans` | id, user_id, week_start, meals[{day, slot, recipe_id}] |
| `grocery_lists` | id, user_id, name, items[{name, quantity, unit, checked, aisle}], shared_with[] |
| `recipe_ratings` | id, user_id, recipe_id, rating, notes, photos[], made_count |

### Platform Requirements

- **iOS:** iOS 16+ (required for Share Extension improvements)
- **Android:** API 28+ (Android 9.0+)
- **Cloud sync:** Required for cross-device access
- **Offline mode:** Read-only access to saved recipes

---

## Monetization Strategy

### Subscription Tiers

| Feature | Free | Premium ($4.99/mo) |
|---------|------|---------------------|
| Manual recipe entry | Unlimited | Unlimited |
| Social media import | 5/month | Unlimited |
| Cookbooks | 3 | Unlimited |
| Pantry matching | Basic | Advanced + AI |
| AI recipe generation | — | ✓ |
| Meal planning | Current week | Unlimited + AI |
| Nutrition info | Calories only | Full macros |
| Cloud sync | — | ✓ |

**Annual pricing:** $39.99/year (33% discount) — aligns with ReciMe's proven pricing model

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Social media API changes | High — could break import | Use share extensions; fallback to paste+AI |
| AI extraction accuracy | Medium — user frustration | Easy manual editing; continuous model tuning |
| Pantry data quality | Medium — bad suggestions | Fuzzy matching; synonym database |
| Feature bloat | Medium — complex UX | Progressive disclosure; phased rollout |
| Copyright concerns | Low — personal use | Link back to source; no public sharing |

---

## Development Timeline

### Phase 1: Foundation (Weeks 1-6)

1. Recipe data model and database schema
2. Manual recipe entry UI
3. Basic cookbook organization
4. Recipe detail view and editing

### Phase 2: Import Engine (Weeks 7-12)

1. URL import with AI extraction
2. iOS/Android share extension
3. Social media platform support
4. Paste-and-parse functionality

### Phase 3: Pantry Integration (Weeks 13-18)

1. Ingredient-to-pantry matching algorithm
2. "What Can I Make?" feature
3. Expiration-priority suggestions
4. AI recipe generation MVP

### Phase 4: Planning & Lists (Weeks 19-24)

1. Meal planning calendar
2. Smart grocery list generation
3. Aisle sorting and list sharing
4. Cook mode implementation

### Phase 5: Polish & Launch (Weeks 25-28)

1. Nutrition calculation
2. Social sharing features
3. Premium subscription implementation
4. Beta testing and refinement

---

## Success Criteria for Launch

1. Recipe import success rate > 85%
2. Pantry-to-recipe match accuracy > 90%
3. App Store rating ≥ 4.5 stars
4. User-reported food waste reduction ≥ 20%
5. Premium conversion ≥ 8% in first 90 days

---

## Appendix

### Competitive Reference

This PRD draws inspiration from [ReciMe](https://apps.apple.com/us/app/recime-recipes-meal-planner/id1593779280), which has achieved 161K+ ratings with a 4.8-star average. Key learnings from user reviews include the importance of reliable import functionality, easy-to-read recipe format, and intuitive organization.

### Related Documents

- DinnerPlans Core PRD
- Barcode Scanning Technical Specification
- AI Integration Architecture
- Competitive Analysis: Cooklist, Paprika, Mealime