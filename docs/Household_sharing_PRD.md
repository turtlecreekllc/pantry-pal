# Household Sharing Feature

## Product Requirements Document

| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Date** | December 27, 2025 |
| **Author** | Pantry Pal Development Team |
| **Status** | Draft |

---

## 1. Executive Summary

This PRD outlines the implementation of household sharing functionality for Pantry Pal, enabling families and households to collaboratively manage their pantry inventory, meal plans, and shopping lists. The feature leverages Supabase's Row Level Security (RLS) and a multi-tenant architecture pattern to ensure secure data isolation while enabling seamless collaboration.

---

## 2. Problem Statement

Households typically share food resources, yet current pantry management solutions treat users as individuals. This leads to duplicated entries, conflicting meal plans, and inefficient grocery shopping. Families need a unified view of their shared pantry with appropriate access controls for different family members.

---

## 3. Goals & Objectives

### 3.1 Primary Goals

- Enable multiple users to access and manage a shared household pantry
- Provide role-based permissions for household management
- Synchronize meal plans and calendars across household members
- Enable real-time updates visible to all household members

### 3.2 Success Metrics

- 70% of active users create or join a household within 30 days
- Average household size of 2.5+ members
- 25% reduction in duplicate pantry entries for household users
- User retention increase of 15% for household members vs. solo users

---

## 4. Technical Architecture

### 4.1 Multi-Tenant Architecture with Supabase

The household sharing feature will implement a single-database, tenant-id-based multi-tenancy pattern using Supabase's Row Level Security (RLS). This approach stores all data in shared tables while isolating households by a household_id column, providing an optimal balance of simplicity, performance, and security.

#### Key Architecture Decisions

- **Tenant ID in app_metadata:** Store household_id in user's app_metadata (not user_metadata) for security - app_metadata cannot be modified by users directly
- **RLS Policies:** Implement row-level security policies that check household_id for all data access operations
- **Custom Claims Function:** Create a PostgreSQL function to extract household_id from JWT claims for use in RLS policies
- **Real-time Subscriptions:** Leverage Supabase's real-time capabilities for instant sync across household devices

### 4.2 Database Schema Extensions

The following new tables will be added to support household functionality:

| Table | Columns | Description |
|-------|---------|-------------|
| **households** | id, name, created_at, owner_id | Core household entity with owner reference |
| **household_members** | id, household_id, user_id, role, joined_at | Many-to-many join table with role support |
| **household_invites** | id, household_id, email, token, expires_at, status | Pending invitations with expiration |

**Modified Tables:** pantry_items, meal_plans, calendar_events, shopping_lists will all receive a household_id foreign key column.

---

## 5. Functional Requirements

### 5.1 Household Management

1. Users can create a new household and become the owner
2. Owners can invite members via email or shareable invite link
3. Invites expire after 7 days and can be revoked
4. Users can accept/decline household invitations
5. Members can leave a household at any time
6. Owners can transfer ownership to another member
7. Owners can remove members from the household
8. Users can belong to multiple households with easy switching

### 5.2 Role-Based Permissions

Three permission levels will be implemented:

| Role | Permissions | Use Case |
|------|-------------|----------|
| **Owner** | Full control: manage members, delete household, all Admin permissions | Primary account holder, household creator |
| **Admin** | Invite members, manage pantry/meals/calendar, edit settings | Spouse/partner, adult family members |
| **Member** | View all data, add/edit pantry items, view meal plans | Children, roommates, temporary guests |

### 5.3 Shared Pantry Features

1. All household members see the same unified pantry inventory
2. Real-time sync when items are added, consumed, or removed
3. Activity log showing who added/modified items with timestamps
4. Conflict resolution for simultaneous edits (last-write-wins with notification)
5. Optional item "claims" to mark food reserved for specific members

### 5.4 Shared Meal Planning & Calendar

1. Unified meal calendar visible to all household members
2. Members can create personal or household-wide meal events
3. RSVP functionality for planned meals (attending/not attending)
4. Automatic serving size adjustment based on attendees
5. Assign cooking responsibilities to specific members
6. Push notifications for upcoming meals and reminders

---

## 6. User Experience

### 6.1 Onboarding Flow

1. New users prompted to create or join a household during signup
2. "Skip for now" option allows individual use initially
3. Existing solo users can convert their pantry to a household
4. Clear explanation of sharing implications before household creation

### 6.2 UI Components

- **Household Switcher:** Dropdown in header for users with multiple households
- **Member Avatars:** Show profile pictures next to items/events indicating creator
- **Activity Feed:** Timeline of recent household activity on dashboard
- **Invite Modal:** Share via email, SMS, or copy invite link
- **Settings Panel:** Manage household name, members, and permissions

---

## 7. Security Considerations

1. **RLS Policy Enforcement:** All database queries automatically filtered by household_id
2. **JWT Claims Validation:** Household access verified on every API request
3. **Invite Token Security:** Cryptographically secure tokens with expiration
4. **Audit Logging:** Track membership changes and permission modifications
5. **Data Isolation:** Complete separation between households at database level

---

## 8. Implementation Plan

### 8.1 Phase 1: Foundation (Week 1)

1. Create household database schema and migrations
2. Implement RLS policies with household_id filtering
3. Build JWT claims extraction function
4. Create household CRUD API endpoints

### 8.2 Phase 2: Membership (Week 2)

5. Build invitation system with email/link sharing
6. Implement role assignment and permission checks
7. Create member management UI screens
8. Add household switching functionality

### 8.3 Phase 3: Shared Features (Week 3)

9. Migrate existing tables to include household_id
10. Enable real-time subscriptions for household data
11. Build activity feed and attribution UI
12. Implement meal RSVP and assignment features

### 8.4 Phase 4: Polish (Week 4)

13. Comprehensive testing of RLS policies
14. Edge case handling and conflict resolution
15. Performance optimization for real-time sync
16. Documentation and user onboarding tutorials

---

## 9. Future Considerations

- **Guest Access:** Temporary view-only access for visiting family
- **Household Analytics:** Track consumption patterns and spending across the household
- **Smart Notifications:** "Mom added milk" type updates with configurable frequency
- **Chore Integration:** Assign grocery shopping and cooking tasks to members
- **Budget Sharing:** Track grocery expenses at household level

---

## 10. Appendix: SQL Schema

```sql
-- Households table
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Household members join table
CREATE TABLE household_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(household_id, user_id)
);

-- Household invitations
CREATE TABLE household_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS helper function
CREATE FUNCTION get_household_id() RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'household_id')::UUID;
$$ LANGUAGE SQL STABLE;

-- Example RLS policy for pantry_items
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view household items"
  ON pantry_items FOR SELECT
  USING (household_id = get_household_id());

CREATE POLICY "Users can insert household items"
  ON pantry_items FOR INSERT
  WITH CHECK (household_id = get_household_id());

CREATE POLICY "Users can update household items"
  ON pantry_items FOR UPDATE
  USING (household_id = get_household_id());

CREATE POLICY "Users can delete household items"
  ON pantry_items FOR DELETE
  USING (household_id = get_household_id());
```