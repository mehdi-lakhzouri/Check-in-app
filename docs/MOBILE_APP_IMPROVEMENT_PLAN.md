# Mobile App Improvement Plan

## Issue Analysis Date: January 8, 2026

---

## ✅ COMPLETED CHANGES

### Backend Bug Fix
**File:** `backend/src/modules/sessions/processors/session-scheduler.processor.ts`

**Problem:** Sessions in `SCHEDULED` lifecycle were never transitioned to `ENDED` even after their `endTime` passed.

**Fix:** Modified the auto-end query to include both `OPEN` and `SCHEDULED` sessions:
```typescript
// Before (problematic)
lifecycle: SessionLifecycle.OPEN

// After (fixed)
lifecycle: { $in: [SessionLifecycle.OPEN, SessionLifecycle.SCHEDULED] }
```

### Mobile App Improvements

#### 1. Session Status Badge (`session_status_badge.dart`)
- ✅ Added time-aware fallback logic - shows "Ended" if `endTime` has passed
- ✅ Added `SessionLifecycleBadge.fromSession()` factory constructor
- ✅ Added animated pulsating dot for open sessions
- ✅ WCAG AA compliant colors (4.5:1 contrast ratio)
- ✅ Added semantic accessibility labels
- ✅ Added icons for ended/cancelled states

#### 2. Session Card (`session_card.dart`)
- ✅ Minimum 44x44px touch targets
- ✅ Tap feedback with scale animation
- ✅ Improved visual hierarchy and spacing
- ✅ WCAG AA compliant colors
- ✅ Semantic accessibility labels
- ✅ Enhanced capacity indicator with color-coded states
- ✅ Better shadow and border styling
- ✅ Subtle pressed state feedback

#### 3. Sessions Screen (`sessions_screen.dart`)
- ✅ Tab counts showing number of sessions
- ✅ Staggered list item animations
- ✅ Shimmer loading placeholders
- ✅ Improved search bar with focus states
- ✅ Haptic feedback on interactions
- ✅ Smooth page transitions
- ✅ Better empty states with descriptive subtitles
- ✅ Accessibility labels on all interactive elements

#### 4. Capacity Indicator (`capacity_indicator.dart`)
- ✅ WCAG AA compliant colors
- ✅ Improved spacing and typography
- ✅ Better badge styling with borders
- ✅ Semantic accessibility labels
- ✅ Minimum 28px height for touch targets

#### 5. Connection Indicator (`connection_indicator.dart`)
- ✅ Minimum 44x44px touch targets
- ✅ WCAG AA compliant colors
- ✅ Animated pulse for connected state
- ✅ Semantic accessibility labels
- ✅ Improved banner styling

---

## 🐛 Bug Fix: Session Status Mismatch

### Problem
Session shows "Scheduled" in mobile app but "Ended" in web dashboard.

### Root Cause
The backend `session-scheduler.processor.ts` only auto-ends sessions that are in `OPEN` lifecycle. Sessions that remain in `SCHEDULED` state and their `endTime` has passed are **never automatically transitioned to ENDED**.

```typescript
// Current logic (problematic)
const sessionsToEnd = await this.sessionModel.find({
  lifecycle: SessionLifecycle.OPEN,  // ❌ Only looks for OPEN sessions
  endTime: { $lte: endThreshold },
}).exec();
```

### Fix Required
Modify the auto-end query to also include `SCHEDULED` sessions that have passed their end time.

---

## 📋 Backend Todo List

### Priority 1: Critical Bug Fixes
- [ ] **BUG-001**: Fix auto-end scheduler to include SCHEDULED sessions
  - File: `backend/src/modules/sessions/processors/session-scheduler.processor.ts`
  - Change: Include `SCHEDULED` lifecycle in auto-end query
  - Impact: Sessions will correctly show "Ended" when their endTime has passed

### Priority 2: API Enhancements
- [ ] **API-001**: Add computed status field to session responses
  - Return both `lifecycle` and a computed `displayStatus` based on time
  - Helps mobile app show accurate time-based status

---

## 📱 Mobile App Todo List

### Priority 1: Critical UX Fixes
- [ ] **MOB-001**: Add fallback time-based status display
  - Use `session.hasEnded` property for display when lifecycle doesn't match reality
  - Show "Ended" if `endTime < now` regardless of lifecycle

### Priority 2: Accessibility Improvements (WCAG AA Compliance)
- [ ] **ACC-001**: Improve text contrast ratios
  - Ensure all text meets 4.5:1 contrast ratio for normal text
  - Ensure all text meets 3:1 contrast ratio for large text (18pt+)
  - Files: `session_card.dart`, `session_status_badge.dart`, `capacity_indicator.dart`

- [ ] **ACC-002**: Increase minimum touch target sizes
  - All tappable elements must be at least 44x44 pixels
  - Add padding to small buttons and icons
  - Files: `session_card.dart`, `connection_indicator.dart`

- [ ] **ACC-003**: Add semantic labels for screen readers
  - Add `Semantics` widgets for meaningful accessibility descriptions
  - Ensure status badges have descriptive labels

### Priority 3: Typography & Readability
- [ ] **TYP-001**: Standardize font sizes and line heights
  - Headings: 18-20pt, weight 600-700
  - Body text: 14-16pt, weight 400-500
  - Caption/Secondary: 12-13pt, weight 400
  - Line height: 1.4-1.6x font size

- [ ] **TYP-002**: Improve spacing consistency
  - Use consistent padding: 16px (standard), 12px (compact), 8px (tight)
  - Card padding: 16px
  - List item spacing: 8-12px vertical

### Priority 4: Visual Design & Hierarchy
- [ ] **VIS-001**: Improve card design
  - Add subtle elevation/shadows
  - Improve border radius consistency (12px standard)
  - Better visual separation between elements

- [ ] **VIS-002**: Status badge redesign
  - More prominent visual distinction between states
  - Better color coding with accessibility in mind
  - Add icons for quick recognition

- [ ] **VIS-003**: Capacity indicator improvements
  - Better visual progress indication
  - Color-coded states (green/yellow/red)
  - Clearer labels

### Priority 5: Animations & Micro-interactions
- [ ] **ANI-001**: Add smooth transitions
  - Card tap feedback (scale/ripple)
  - List item appear animations
  - Status change animations

- [ ] **ANI-002**: Loading states
  - Shimmer loading placeholders
  - Smooth refresh indicator
  - Skeleton screens

- [ ] **ANI-003**: Feedback animations
  - Success/error toast animations
  - Badge pulse on status change
  - Capacity indicator progress animation

### Priority 6: Responsive Layout
- [ ] **RES-001**: Adaptive layouts
  - Test on various screen sizes (320px - 428px width)
  - Ensure text doesn't overflow
  - Flexible card widths

---

## 🎨 Design System Specifications

### Color Palette (Accessible)
```
Primary: #1976D2 (Blue 700) - Passes WCAG AA
Success: #2E7D32 (Green 800) - Passes WCAG AA  
Warning: #F57C00 (Orange 700) - Needs white text
Error: #C62828 (Red 800) - Passes WCAG AA
Neutral: #424242 (Grey 800) - Passes WCAG AA

Background colors (light theme):
- Surface: #FFFFFF
- Background: #FAFAFA
- Card: #FFFFFF with elevation 2
```

### Typography Scale
```
Heading 1: 24px, FontWeight.w700, letterSpacing: -0.5
Heading 2: 20px, FontWeight.w600, letterSpacing: -0.25
Heading 3: 18px, FontWeight.w600
Body Large: 16px, FontWeight.w400, lineHeight: 1.5
Body Medium: 14px, FontWeight.w400, lineHeight: 1.5
Caption: 12px, FontWeight.w400, lineHeight: 1.4
```

### Spacing Scale
```
xs: 4px
sm: 8px
md: 12px
lg: 16px
xl: 24px
xxl: 32px
```

### Touch Target Standards
```
Minimum: 44x44 pixels
Recommended: 48x48 pixels
Icon buttons: Add 12px padding minimum
```

---

## 📁 Files to Modify

### Backend
1. `backend/src/modules/sessions/processors/session-scheduler.processor.ts`

### Mobile App
1. `checkin_mobile/lib/widgets/session_card.dart`
2. `checkin_mobile/lib/widgets/session_status_badge.dart`
3. `checkin_mobile/lib/widgets/capacity_indicator.dart`
4. `checkin_mobile/lib/widgets/connection_indicator.dart`
5. `checkin_mobile/lib/screens/sessions_screen.dart`
6. `checkin_mobile/lib/screens/session_detail_screen.dart`
7. `checkin_mobile/lib/models/session.dart`

---

## Implementation Order

1. **Phase 1**: Fix critical bug (Backend + Mobile fallback)
2. **Phase 2**: Accessibility improvements
3. **Phase 3**: Typography and spacing
4. **Phase 4**: Visual design updates
5. **Phase 5**: Animations and micro-interactions
