# API Changes: Per-Session Timing Configuration

**Date:** January 22, 2026  
**Version:** 2.0.0  
**Type:** Non-Breaking Enhancement

---

## Overview

This update introduces **per-session timing configuration**, allowing administrators to customize auto-open timing, late check-in thresholds, and auto-end grace periods on a per-session basis. All new fields are **optional** and fall back to system-wide defaults configured via environment variables.

---

## Summary of Changes

### 1. Session Schema Changes

Three new **optional** fields have been added to the Session model:

| Field | Type | Range | Default | Description |
|-------|------|-------|---------|-------------|
| `autoOpenMinutesBefore` | `number \| null` | 0-1440 | `null` (uses system default) | Minutes before session start to auto-open check-in |
| `autoEndGraceMinutes` | `number \| null` | 0-1440 | `null` (uses system default) | Grace period after session end before auto-ending |
| `lateThresholdMinutes` | `number \| null` | 0-1440 | `null` (uses system default) | Minutes after start when check-ins are marked late |

### 2. New Settings API Endpoint

A new `/settings` endpoint exposes the current system-wide defaults:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /settings` | GET | Returns complete application settings |
| `GET /settings/timing` | GET | Returns only timing configuration |

---

## API Schema Changes

### Session Object (Response)

```typescript
interface Session {
  _id: string;
  name: string;
  description?: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  location?: string;
  isOpen: boolean;
  status: 'scheduled' | 'open' | 'ended' | 'closed' | 'cancelled';
  capacity?: number;
  capacityEnforced: boolean;
  requiresRegistration: boolean;
  checkInsCount: number;
  day: number;
  
  // NEW FIELDS (v2.0.0)
  autoOpenMinutesBefore?: number | null;  // null = use system default
  autoEndGraceMinutes?: number | null;    // null = use system default
  lateThresholdMinutes?: number | null;   // null = use system default
  
  createdAt: string;
  updatedAt: string;
}
```

### CreateSession DTO (Request)

```typescript
interface CreateSessionDto {
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  isOpen?: boolean;
  capacity?: number;
  capacityEnforced?: boolean;
  requiresRegistration?: boolean;
  day?: number;
  
  // NEW FIELDS (v2.0.0) - All optional
  autoOpenMinutesBefore?: number;  // 0-1440, omit to use system default
  autoEndGraceMinutes?: number;    // 0-1440, omit to use system default
  lateThresholdMinutes?: number;   // 0-1440, omit to use system default
}
```

### UpdateSession DTO (Request)

Same as CreateSessionDto - all fields optional. Set to `null` to clear custom override and revert to system default.

---

## New Endpoints

### GET /settings

Returns complete application settings.

**Response:**
```json
{
  "timing": {
    "autoOpenMinutesBefore": 10,
    "autoEndEnabled": true,
    "autoEndGraceMinutes": 0,
    "lateThresholdMinutes": 10,
    "schedulerIntervalMs": 30000
  },
  "version": "1.0.0",
  "environment": "production"
}
```

### GET /settings/timing

Returns only timing configuration.

**Response:**
```json
{
  "autoOpenMinutesBefore": 10,
  "autoEndEnabled": true,
  "autoEndGraceMinutes": 0,
  "lateThresholdMinutes": 10,
  "schedulerIntervalMs": 30000
}
```

---

## Behavior Changes

### Session Auto-Open Logic

**Previous Behavior:**
- All sessions used the global `AUTO_OPEN_MINUTES_BEFORE` value (default: 10 minutes)

**New Behavior:**
- If `session.autoOpenMinutesBefore` is set, use that value
- Otherwise, fall back to global `AUTO_OPEN_MINUTES_BEFORE` (default: 10 minutes)

### Session Auto-End Logic

**Previous Behavior:**
- All sessions used the global `AUTO_END_GRACE_MINUTES` value (default: 0 minutes)

**New Behavior:**
- If `session.autoEndGraceMinutes` is set, use that value
- Otherwise, fall back to global `AUTO_END_GRACE_MINUTES` (default: 0 minutes)

### Late Check-in Detection

**Previous Behavior:**
- All check-ins used the global `CHECKIN_LATE_THRESHOLD_MINUTES` value (default: 10 minutes)

**New Behavior:**
- If `session.lateThresholdMinutes` is set, use that value
- Otherwise, fall back to global `CHECKIN_LATE_THRESHOLD_MINUTES` (default: 10 minutes)

---

## Mobile App Integration Guide

### 1. Update Session Model

Add the three new optional fields to your Session model/class:

```dart
// Flutter/Dart example
class Session {
  // ... existing fields ...
  
  final int? autoOpenMinutesBefore;
  final int? autoEndGraceMinutes;
  final int? lateThresholdMinutes;
  
  Session.fromJson(Map<String, dynamic> json)
      : // ... existing fields ...
        autoOpenMinutesBefore = json['autoOpenMinutesBefore'],
        autoEndGraceMinutes = json['autoEndGraceMinutes'],
        lateThresholdMinutes = json['lateThresholdMinutes'];
}
```

### 2. Display Timing Info (Optional)

You can show users when a session will open or when check-ins become late:

```dart
String getAutoOpenMessage(Session session, GlobalTimingConfig defaults) {
  final minutes = session.autoOpenMinutesBefore ?? defaults.autoOpenMinutesBefore;
  final openTime = session.startTime.subtract(Duration(minutes: minutes));
  return 'Check-in opens at ${formatTime(openTime)}';
}

String getLateWarning(Session session, GlobalTimingConfig defaults) {
  final minutes = session.lateThresholdMinutes ?? defaults.lateThresholdMinutes;
  return 'Check-ins after ${formatTime(session.startTime.add(Duration(minutes: minutes)))} will be marked as late';
}
```

### 3. Fetch System Defaults

Call the settings endpoint to get current system defaults:

```dart
Future<GlobalTimingConfig> fetchTimingConfig() async {
  final response = await http.get(Uri.parse('$baseUrl/settings/timing'));
  return GlobalTimingConfig.fromJson(jsonDecode(response.body));
}
```

### 4. Admin Session Creation (if applicable)

If your mobile app supports admin session creation, add optional fields to the creation form:

- **Auto-Open Before Start** - Number input (0-1440 minutes)
- **Late Check-in Threshold** - Number input (0-1440 minutes)  
- **Auto-End Grace Period** - Number input (0-1440 minutes)

All fields should show placeholder text like "Use default (10)" when empty.

---

## Backward Compatibility

✅ **Fully backward compatible** - All new fields are optional

- Existing sessions without these fields will continue to work
- Existing API clients don't need to be updated immediately
- The scheduler and check-in logic gracefully falls back to global defaults

---

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTO_OPEN_MINUTES_BEFORE` | 10 | Default minutes before start to auto-open |
| `AUTO_END_ENABLED` | true | Enable/disable automatic session ending |
| `AUTO_END_GRACE_MINUTES` | 0 | Default grace period after end time |
| `CHECKIN_LATE_THRESHOLD_MINUTES` | 10 | Default late threshold |
| `SESSION_CHECK_INTERVAL_MS` | 30000 | Scheduler check interval |

---

## Timeline Visualization

For a session starting at **9:00 AM** with:
- `autoOpenMinutesBefore: 15`
- `lateThresholdMinutes: 5`
- `autoEndGraceMinutes: 10`
- Session ends at **10:00 AM**

```
8:45 AM  ─────> Auto-opens (15 min before start)
9:00 AM  ─────> Session officially starts
9:05 AM  ─────> Late threshold (check-ins after this are "late")
10:00 AM ─────> Session scheduled end time
10:10 AM ─────> Auto-ends (10 min grace period)
```

---

## Questions?

Contact the backend team for any questions about these API changes.
