# Voice-Guided Pantry Review
## Product Requirements Document

**Version:** 1.1  
**Date:** December 28, 2025  
**Author:** Shane Portman  
**Status:** Implemented

---

## Executive Summary

This PRD defines the Voice-Guided Pantry Review feature for Dinner Plans, enabling users to efficiently validate and manage pantry items detected from photo scans using a hands-free, conversational voice interface. The feature combines AI-powered image recognition with natural language processing to create a seamless, interactive review experience where users can validate, correct, or skip items one-by-one while the system automatically updates the pantry inventory.

The core value proposition is reducing friction in the pantry management workflow. After capturing a photo of their pantry or groceries, users can review detected items without touching their phone—particularly valuable when hands are full, dirty from cooking, or when users want a faster validation flow than manual tapping.

---

## Problem Statement

Current pantry scanning solutions require significant manual intervention to validate AI-detected items. Users must tap through each item, manually correct misidentifications, and confirm entries one screen at a time. This creates several pain points:

- **High friction:** Users abandon the review process when it requires too many taps, leading to incomplete or inaccurate inventories.
- **Context switching:** Moving between physical pantry organization and phone interaction disrupts the natural flow of stocking groceries.
- **Hands-occupied scenarios:** Users often scan items while unpacking groceries or cooking, when their hands are full or dirty.
- **AI uncertainty:** Users don't always trust AI detection and want a quick way to verify what the system thinks it sees before committing to inventory.

---

## Goals & Success Metrics

### Primary Goals

1. Enable completely hands-free pantry item validation through voice commands
2. Reduce time-to-complete for pantry review by 50% compared to tap-based validation
3. Increase inventory accuracy through AI-guided validation prompts
4. Create a natural, conversational experience that feels intuitive rather than command-driven

### Success Metrics

| Metric | Target |
|--------|--------|
| Voice review completion rate | > 80% of started sessions |
| Average review time per item | < 5 seconds |
| Voice command recognition accuracy | > 95% |
| User satisfaction (voice vs tap) | > 4.0/5.0 rating |
| Inventory accuracy post-review | > 90% correct items |

---

## User Stories

### Primary User Stories

1. **As a user** who just photographed my pantry, **I want to** review detected items using only my voice, **so that** I can validate my inventory while my hands are busy putting away groceries.

2. **As a user** reviewing a detected item, **I want to** ask AI to describe what it sees, **so that** I can understand why it identified the item a certain way before approving.

3. **As a user** who notices an incorrectly identified item, **I want to** verbally correct the item name or details, **so that** my inventory stays accurate without typing.

4. **As a user** who approves an item, **I want** the list to update automatically and move to the next item, **so that** the review process feels continuous and efficient.

5. **As a user** with items I don't want to track, **I want to** skip items verbally, **so that** I can quickly move through the list without adding unwanted items.

### Additional User Stories (Implemented)

6. **As a user**, **I want to** see detailed quantity information (count, volume per unit, fill level) at a glance, **so that** I can quickly verify if the AI detected amounts correctly.

7. **As a user**, **I want to** change storage location via voice ("put in fridge"), **so that** items are organized correctly without manual selection.

8. **As a user**, **I want to** set expiration dates verbally ("expires January 15th"), **so that** I can track freshness without typing.

9. **As a user**, **I want to** set fill levels for opened containers ("it's about half full"), **so that** my inventory reflects actual amounts.

10. **As a user**, **I want to** see a conversation history with the AI, **so that** I can track what changes were made during the session.

---

## User Flow

### Entry Point

After completing a photo scan of the pantry (single image or multi-image capture), the user is presented with detected items. A prominent **"Voice Edit"** button initiates the voice-guided review mode from each item's review card.

### Voice Review Session Flow

1. **Session Initialization:** System activates microphone, displays the first detected item with visual highlight, and AI greets user with confidence-based prompt: "This looks like [Item Name]. Ready to add it?" (high confidence) or "I think this is [Item Name], but I'm not certain. Would you like me to describe it?" (medium confidence).

2. **Item Presentation:** Each item shows:
   - AI-detected name and brand
   - **Prominent quantity display** showing:
     - Unit count (number of packages/cans/bottles)
     - Volume per unit (e.g., 12 oz per can)
     - Fill level for opened containers
     - Total quantity calculation
   - Confidence badge with color-coded indicator
   - Storage location and expiration date
   - Category assignment

3. **User Interaction:** User can:
   - Approve ("yes", "correct", "next", "add", "confirm", "accept")
   - Request description ("describe this", "what do you see")
   - Correct name ("it's actually [name]", "change to [name]")
   - Adjust quantity ("there are 3", "change quantity to 5")
   - Change location ("put in fridge", "move to freezer")
   - Set expiration ("expires January 15th", "expires next week")
   - Set fill level ("it's half full", "almost empty")
   - Update brand ("it's the Heinz brand")
   - Skip ("skip", "remove this", "reject", "no")
   - Navigate ("go back", "previous")
   - Get help ("help", "what can I say")
   - Exit ("stop", "pause", "exit", "done")

4. **Real-time Updates:** Upon approval, item is added to inventory with haptic confirmation. Visual conversation history shows all interactions and field updates with badges.

5. **Session Completion:** After final item, AI summarizes: "All done! I added [X] items to your pantry. [Y] items were skipped." User sees summary screen with option to review or edit.

6. **Exit Options:** User can say "stop", "pause", or "finish later" at any time. Progress indicator shows current position in review.

---

## Voice Command Specifications

### Core Commands

| Intent | Example Phrases | System Response |
|--------|-----------------|-----------------|
| **Approve** | "Yes" / "Correct" / "That's right" / "Approve" / "Next" / "Looks good" / "Add" / "Confirm" / "Accept" | Adds item to inventory, advances to next item with haptic confirmation |
| **Describe** | "Describe this" / "What do you see" / "Tell me more" / "Explain" / "What is this" | AI provides detailed description of detected item, brand if visible, size/quantity, fill level |
| **Correct Name** | "It's actually [name]" / "Change to [name]" / "That's [name]" / "Rename to [name]" | Updates item name, confirms change verbally |
| **Adjust Quantity** | "There are [X]" / "Change quantity to [X]" / "I have [X] of these" / "[X] cans" | Updates quantity, confirms, item card updates in real-time |
| **Change Location** | "Put in [fridge/freezer/pantry]" / "Move to [location]" / "This goes in the [location]" | Updates storage location, confirms change |
| **Set Expiration** | "Expires [date]" / "Expires January 15th" / "Expires next week" | Sets expiration date, confirms with formatted date |
| **Set Fill Level** | "It's half full" / "Almost empty" / "Three quarters full" / "It's full" | Updates fill level indicator for containers |
| **Update Brand** | "It's [brand name]" / "The brand is [name]" / "It's the Heinz brand" | Updates brand field |
| **Skip** | "Skip" / "Remove" / "Don't add" / "Delete" / "Ignore this" / "No" / "Reject" | Removes from pending list, advances to next item |
| **Go Back** | "Go back" / "Previous" / "Undo" / "Wait, go back" | Returns to previous item, allows re-review |
| **Exit/Pause** | "Stop" / "Pause" / "Finish later" / "Exit" / "Done" / "Close" / "Cancel" | Saves progress, exits voice mode |
| **Help** | "Help" / "What can I say" / "Commands" | Lists available commands via TTS |

---

## AI Guidance System

### Conversational AI Behavior

The AI assistant guides users through the review process with natural, helpful dialogue. The tone is friendly, efficient, and non-intrusive—providing just enough guidance without over-explaining. Responses are kept to 1-2 sentences maximum for efficiency.

### Contextual Prompts (Implemented)

- **High confidence (≥90%):** "This looks like [Brand] [Item Name]. Ready to add it?"
- **Medium confidence (70-89%):** "I think this is [Item Name], but I'm not certain. Would you like me to describe what I see?"
- **Low confidence (<70%):** "I'm having trouble identifying this item. Can you tell me what it is?"

### Description Response Format (Implemented)

When user asks "Describe this item," AI provides structured description:

"I'm [confidence level] this is [Brand] [Item Name]. I see [count] [container type], each containing [volume] [unit]. [Fill level description if applicable]. [Category information]. Would you like to make any changes, or should I add it to your [location]?"

### Proactive Assistance (Implemented)

- **Inactivity timeout (8 seconds):** "Still there? Say 'yes' to approve, 'skip' to remove, or 'help' for more options."
- **Session timeout (2 minutes):** "It's been a while. I'll save your progress. Say 'continue' to keep reviewing or you can close this screen."
- After field update: "Got it, [confirmation of change]."

---

## Functional Requirements

### Voice Recognition (FR-VR)

| ID | Requirement | Description | Status |
|----|-------------|-------------|--------|
| FR-VR-01 | Push-to-Talk Recording | Tap microphone to start/stop recording for clear command boundaries | ✅ Implemented |
| FR-VR-02 | Intent Classification | GPT-4o classifies user speech into defined intents with action extraction | ✅ Implemented |
| FR-VR-03 | Entity Extraction | System extracts item names, quantities, dates, locations from natural speech | ✅ Implemented |
| FR-VR-04 | Whisper Transcription | OpenAI Whisper API for accurate speech-to-text conversion | ✅ Implemented |

### Item Review (FR-IR)

| ID | Requirement | Description | Status |
|----|-------------|-------------|--------|
| FR-IR-01 | Sequential Review | Items presented one at a time with clear visual focus indicator | ✅ Implemented |
| FR-IR-02 | Real-time Updates | Item card updates immediately upon voice changes | ✅ Implemented |
| FR-IR-03 | Edit Before Approve | Users can correct name/quantity/location before approval | ✅ Implemented |
| FR-IR-04 | Navigation | Forward, backward, and skip navigation via voice | ✅ Implemented |
| FR-IR-05 | Progress Tracking | Progress bar and stats (approved/skipped counts) visible in modal | ✅ Implemented |

---

## UI/UX Requirements

### Visual Design (Implemented)

- **Active Item Card:** Large, prominent display showing:
  - Confidence badge with color coding (green/yellow/red)
  - Item name and brand
  - **Prominent quantity section** with:
    - Unit count with icon
    - Volume per unit (when applicable)
    - Fill level indicator
    - Total calculation row
  - Storage location badge
  - Expiration date badge
  - Category badge

- **Progress Indicator:** 
  - Horizontal progress bar showing completion percentage
  - Stats row showing "X added" and "Y skipped"
  - Current position indicator ("Item 3 of 8")

- **Listening Indicator:** 
  - Animated waveform visualization during active recording
  - Pulsing microphone button with color change (green → red)
  - Real-time status text ("Listening...", "Processing...", "Speaking...")

- **Conversation History:**
  - Chat-style bubbles (user messages right-aligned, AI left-aligned)
  - AI messages include sparkle icon
  - Update badges showing "Updated X fields" for changes
  - Scrollable conversation area

- **Suggestion Chips:** Horizontal scrollable row with quick commands:
  - "Yes, add it"
  - "Skip"
  - "Describe this"
  - "Help"
  - "Go back" (when applicable)

- **Voice Edit Entry Point:** Prominent button in review card with:
  - Microphone icon
  - "Voice Edit" title
  - "Tap to speak your changes" subtitle
  - Dashed border accent

### Audio/Haptic Feedback (Implemented)

- **Approval confirmation:** Haptic vibration (50ms)
- **Skip/Remove:** Double haptic pattern
- **Error/Unrecognized:** Triple haptic pattern with longer duration
- **Text-to-Speech:** expo-speech for all AI responses

### Accessibility

- High contrast confidence indicators
- VoiceOver/TalkBack compatible for fallback interaction
- TTS speech rate optimized for clarity (0.95 rate)
- Hybrid mode: tap gestures always available alongside voice

---

## Technical Architecture (Implemented)

### Components

1. **VoiceAssistantModal** (`components/VoiceAssistantModal.tsx`)
   - Full-screen modal for voice interaction
   - Manages recording, transcription, and conversation state
   - Handles all voice commands and visual feedback

2. **VoiceAssistantService** (`lib/voiceAssistantService.ts`)
   - AI intent classification using GPT-4o
   - Item description generation
   - Confidence-based prompt generation
   - Help text and voice prompt utilities
   - Item update application

3. **Enhanced ScanReviewCard** (`components/ScanReviewCard.tsx`)
   - Prominent quantity display with count/volume/fill blocks
   - Voice Edit button integration
   - Progress data passthrough

4. **Enhanced AI Scanner** (`lib/aiScanner.ts`)
   - Detailed quantity extraction (unitCount, volumeQuantity, volumeUnit)
   - Fill level detection for opened containers
   - Improved shelf photo analysis prompt

### API Integrations

| Service | Purpose | Endpoint |
|---------|---------|----------|
| OpenAI Whisper | Speech-to-text | `/v1/audio/transcriptions` |
| OpenAI GPT-4o | Intent classification & responses | `/v1/chat/completions` |
| Expo Speech | Text-to-speech | Native TTS |
| Expo AV | Audio recording | Native recording |

### Performance Characteristics

| Metric | Target | Implementation |
|--------|--------|----------------|
| Speech recognition latency | < 500ms | Whisper API streaming |
| Intent processing latency | < 300ms | GPT-4o with JSON response format |
| TTS response initiation | < 200ms | expo-speech native |
| Item card update | Instant | React state update |

---

## Data Model Considerations

### Voice Review Session Schema

**voice_review_sessions** - Tracks review session state for resumability

- session_id (UUID), user_id, scan_id (reference to photo scan)
- status (enum: in_progress, completed, abandoned)
- current_item_index, total_items, approved_count, skipped_count
- started_at, completed_at, last_activity_at

### Voice Interaction Log Schema

**voice_interactions** - Logs voice commands for analytics and model improvement

- interaction_id, session_id, item_id
- raw_transcript, classified_intent, confidence_score
- extracted_entities (JSON: item_name, quantity, etc.)
- action_taken, timestamp, processing_latency_ms

---

## Edge Cases & Error Handling

1. **Unrecognized Speech:** AI responds with "Sorry, I had trouble understanding. Could you repeat that?" and haptic error feedback.

2. **Transcription Failure:** Display "I couldn't hear that clearly. Could you try again?" with error haptic.

3. **Network Interruption:** Queue actions locally, sync when connection restored.

4. **Session Timeout (Implemented):** After 2 minutes of inactivity, prompt: "It's been a while. I'll save your progress."

5. **Inactivity Timeout (Implemented):** After 8 seconds, prompt with help: "Still there? Say 'yes' to approve, 'skip' to remove, or 'help' for more options."

6. **Empty Scan Results:** Skip voice review and prompt user to retake photo or add items manually.

7. **Microphone Permission Denied:** Display clear instructions to enable microphone in device settings.

8. **Go Back on First Item:** Respond "This is the first item. I can't go back further."

---

## Dependencies

- **Photo Scan Feature:** Voice review requires completed photo scan with detected items array
- **Pantry Inventory System:** Integration with existing inventory data model for add/update operations
- **OpenAI API Access:** Whisper for STT, GPT-4o for intent classification
- **Expo Packages:** expo-av (recording), expo-speech (TTS)

---

## Future Considerations

1. **Batch Approval:** "Approve all high-confidence items" voice command for faster review of reliable detections
2. **Continuous Listening Mode:** Option to listen continuously without push-to-talk
3. **Expiration Date Detection:** "When does this expire?" triggers OCR on detected date labels
4. **Recipe Context:** "What can I make with this?" triggers recipe suggestions during review
5. **Multi-language Support:** Extend voice recognition and TTS to Spanish, French, German
6. **Voice Personalization:** Learn user's speaking patterns and common corrections for improved accuracy
7. **Smart Home Integration:** "Add milk to my shopping list" via Alexa/Google Home during review
8. **Audio Sound Effects:** Add pleasant chimes for approval/skip instead of haptic-only feedback
9. **Session Persistence:** Save and resume incomplete voice review sessions across app restarts

---

## Implementation Status

| Feature | Status |
|---------|--------|
| Voice Assistant Modal | ✅ Complete |
| Whisper STT Integration | ✅ Complete |
| GPT-4o Intent Classification | ✅ Complete |
| Text-to-Speech | ✅ Complete |
| Confidence-based Prompts | ✅ Complete |
| Progress Indicator | ✅ Complete |
| Describe Command | ✅ Complete |
| Help Command | ✅ Complete |
| Go Back Navigation | ✅ Complete |
| Quantity/Volume/Fill Display | ✅ Complete |
| Location Change via Voice | ✅ Complete |
| Expiration Date via Voice | ✅ Complete |
| Fill Level via Voice | ✅ Complete |
| Brand Update via Voice | ✅ Complete |
| Haptic Feedback | ✅ Complete |
| Inactivity Timeout Prompts | ✅ Complete |
| Session Timeout Prompts | ✅ Complete |
| Suggestion Chips | ✅ Complete |
| Conversation History | ✅ Complete |
| Waveform Animation | ✅ Complete |

---

## Document Approval

| Role | Name | Date |
|------|------|------|
| Product Lead | Shane Portman | Dec 28, 2025 |
| Engineering Lead | | |
| Design Lead | | |
