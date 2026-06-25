# Welcome Tour — Design Spec

**Date:** 2026-06-25
**Status:** Draft

## Overview

A 5-step animated onboarding tour for first-time users of the Audiobook Converter. Apple-style full-screen overlay with dim background, highlighting key UI elements with premium tooltip cards.

## Architecture

- **Pure frontend** — no backend changes needed
- **LocalStorage** `welcomeTourSeen: "true"` flag to show once
- **CSS-only animations** — no library dependencies
- **Framework:** Next.js client component with React state

## Component: `WelcomeTour`

### Props
None — reads LocalStorage on mount, manages its own state.

### State
- `step: 0-5` (0 = hidden, 1-5 = active steps)
- `visible: boolean`

### Flow
```
User visits app → LocalStorage check → 
  if !seen → show Step 1 (welcome) → 
  Step 2 (upload button) → 
  Step 3 (TTS provider) → 
  Step 4 (player controls) → 
  Step 5 (completion) → 
  mark seen → redirect to dashboard
```

### Step Definitions

| Step | Target Element | Tooltip Content |
|------|---------------|-----------------|
| 1 | Center screen (no target) | Full-screen welcome with "Start Quick Tour" or "Skip" |
| 2 | Upload button in header | "Upload your EPUB, PDF, or TXT file. Chapters extracted automatically." |
| 3 | TTS provider selector | "Choose from 8 engines — Free Kokoro or premium AI voices." |
| 4 | Audio player area | "Space to play/pause, ← → to skip, ? for shortcuts, 🌙 sleep timer." |
| 5 | Center screen (no target) | Green checkmark "You're all set!" with "Upload a Book →" CTA |

### Visual Design

**Welcome (Step 1, 5):**
- Full-screen dark gradient (`#0f0f1a` → `#1a1a2e`)
- Glowing gradient icon box (indigo → violet)
- Gradient CTA button with shadow glow
- "Skip" as secondary text link

**Highlight (Steps 2-4):**
- Dim overlay (`rgba(0,0,0,0.5)`) over everything except target
- Target element at full opacity, rest blurred
- Tooltip card: white, rounded, shadow, positioned near target
- Step number badge (gradient circle)
- Title + description text
- Arrow pointer pointing to target element
- Bottom bar: progress dots (5 dots, active highlighted) + "Skip" + "Next →"

**Completion (Step 5):**
- Same dark gradient as welcome
- Green checkmark with glow
- CTA: "Upload a Book →"

### States

| State | Behavior |
|-------|----------|
| **First visit** | Tour auto-shows on dashboard load |
| **Skipped mid-tour** | LocalStorage set to "skipped", never shown again |
| **Completed** | LocalStorage set to "done", never shown again |
| **Replay** | Settings page has "Show Welcome Tour" button that resets flag |
| **Mobile** | Tour works responsively, tooltips centered instead of positioned near elements |

## Data Model (LocalStorage)

```typescript
localStorage.setItem("welcomeTourSeen", "done" | "skipped");
```

## Files to Create

- `frontend/components/WelcomeTour.tsx` — Main tour component (~300 lines)
- `frontend/components/WelcomeTour.css` — Tour-specific styles (or inline in component)

## Files to Modify

- `frontend/app/dashboard/DashboardClient.tsx` — Mount `<WelcomeTour />` on dashboard
- `frontend/app/settings/page.tsx` — Add "Show Welcome Tour" button (future)

## Edge Cases

- **User navigates away during tour** — tour resumes on next dashboard visit
- **User refreshes mid-tour** — step resets to 1 (acceptable for MVP)
- **Keyboard navigation** — Escape dismisses, Enter clicks Next
- **Target element not found** — tour shows centered tooltip as fallback
- **Multiple tabs** — each tab independently tracks tour state (acceptable)

## Testing

- Set `localStorage.removeItem("welcomeTourSeen")` → reload → tour appears
- Click "Skip" → tour disappears, flag set
- Complete all 5 steps → flag set, redirect to dashboard
- Set `localStorage.setItem("welcomeTourSeen", "done")` → reload → no tour
