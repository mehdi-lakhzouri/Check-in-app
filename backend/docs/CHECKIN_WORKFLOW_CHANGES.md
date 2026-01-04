# Check-in Workflow Enhancement - Backend API Documentation

## Overview

This document describes the backend changes for the enhanced check-in workflow that allows officers to verify participant registration status before check-in and provide Accept/Decline actions.

---

## New Workflow

### QR Code Scan Flow

```
Officer scans QR code
        │
        ▼
POST /checkin/verify-qr
        │
        ▼
[Is participant registered for this session?]
        │
   ┌────┴────┬──────────────────┐
   │         │                  │
  YES       NO            ALREADY_CHECKED_IN
   │         │                  │
   ▼         ▼                  ▼
AUTO-ACCEPT  Show UI         Show Info
   │         │                  │
   ▼    ┌────┴────┐             │
POST    │         │             │
/accept Accept   Decline        │
   │      │         │           │
   ▼      ▼         ▼           │
Create  Create   Create         │
CheckIn CheckIn  Attempt        │
(badge: (badge:  (DECLINED)     │
ACCEPTED) ACCEPTED_             │
         UNREGISTERED)          │
   │      │         │           │
   └──────┴─────────┴───────────┘
                │
                ▼
        Real-time update
        to dashboard
```

### Workflow Summary

| Registration Status | Action | UI Flow |
|---------------------|--------|---------|
| **REGISTERED** | Auto-Accept | Scan → Check-in created → Success screen |
| **NOT_REGISTERED** | Manual Decision | Scan → Accept/Decline buttons → Action |
| **ALREADY_CHECKED_IN** | Info Only | Scan → Info message → Continue scanning |

---

## Database Schema Changes

### 1. CheckIn Schema Enhancement

```typescript
// New fields in CheckIn schema
export enum CheckInBadge {
  ACCEPTED = 'accepted',           // Standard check-in (registered participant)
  ACCEPTED_UNREGISTERED = 'accepted_unregistered',  // Override check-in (not registered)
}

// Add to CheckIn schema:
@Prop({ 
  type: String, 
  enum: CheckInBadge, 
  default: CheckInBadge.ACCEPTED,
  index: true 
})
badge: CheckInBadge;

@Prop({ type: Boolean, default: false })
wasRegistered: boolean;  // Was participant registered at time of check-in
```

### 2. New CheckInAttempt Schema

```typescript
// New schema for logging declined/attempted check-ins
export enum AttemptStatus {
  DECLINED = 'declined',
  FAILED = 'failed',
}

@Schema({ timestamps: true, collection: 'checkin_attempts' })
export class CheckInAttempt {
  _id: Types.ObjectId;
  
  @Prop({ type: Types.ObjectId, ref: 'Participant', required: true, index: true })
  participantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Session', required: true, index: true })
  sessionId: Types.ObjectId;

  @Prop({ type: Date, default: Date.now, index: true })
  attemptTime: Date;

  @Prop({ type: String, enum: AttemptStatus, required: true, index: true })
  status: AttemptStatus;

  @Prop({ trim: true })
  declinedBy?: string;

  @Prop({ trim: true })
  reason?: string;

  @Prop({ type: Boolean, default: false })
  wasRegistered: boolean;

  createdAt: Date;
  updatedAt: Date;
}
```

---

## New API Endpoints

### 1. POST `/checkin/verify-qr`

**Purpose:** Verify participant registration status for a session before check-in.

**Request Body:**
```json
{
  "qrCode": "QR-ABC123XYZ",
  "sessionId": "507f1f77bcf86cd799439011"
}
```

**Response (Success - Registered):**
```json
{
  "status": "success",
  "message": "Participant verification complete",
  "data": {
    "participant": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "John Doe",
      "email": "john@example.com",
      "organization": "ACME Corp",
      "qrCode": "QR-ABC123XYZ"
    },
    "session": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Workshop A",
      "isOpen": true
    },
    "verification": {
      "isRegistered": true,
      "registrationStatus": "confirmed",
      "isAlreadyCheckedIn": false,
      "badge": "REGISTERED"
    },
    "actions": {
      "canAccept": true,
      "canDecline": true,
      "acceptLabel": "Check In",
      "declineLabel": "Decline"
    }
  }
}
```

**Response (Success - Not Registered):**
```json
{
  "status": "success",
  "message": "Participant verification complete",
  "data": {
    "participant": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "organization": "Other Corp",
      "qrCode": "QR-DEF456ABC"
    },
    "session": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Workshop A",
      "isOpen": true
    },
    "verification": {
      "isRegistered": false,
      "registrationStatus": null,
      "isAlreadyCheckedIn": false,
      "badge": "NOT_REGISTERED"
    },
    "actions": {
      "canAccept": true,
      "canDecline": true,
      "acceptLabel": "Accept Anyway",
      "declineLabel": "Decline Entry"
    }
  }
}
```

**Response (Already Checked In):**
```json
{
  "status": "success",
  "message": "Participant already checked in",
  "data": {
    "participant": { ... },
    "session": { ... },
    "verification": {
      "isRegistered": true,
      "registrationStatus": "confirmed",
      "isAlreadyCheckedIn": true,
      "existingCheckIn": {
        "_id": "...",
        "checkInTime": "2024-01-01T09:30:00.000Z",
        "method": "qr"
      },
      "badge": "ALREADY_CHECKED_IN"
    },
    "actions": {
      "canAccept": false,
      "canDecline": false
    }
  }
}
```

---

### 2. POST `/checkin/accept`

**Purpose:** Accept and create a check-in after verification.

**Request Body:**
```json
{
  "participantId": "507f1f77bcf86cd799439012",
  "sessionId": "507f1f77bcf86cd799439011",
  "checkedInBy": "Officer Name",
  "notes": "Optional notes"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Check-in accepted successfully",
  "data": {
    "_id": "...",
    "participantId": { ... },
    "sessionId": { ... },
    "checkInTime": "2024-01-01T09:30:00.000Z",
    "method": "qr",
    "badge": "accepted",
    "wasRegistered": true,
    "isLate": false
  },
  "capacityInfo": {
    "capacity": 50,
    "checkInsCount": 25,
    "remaining": 25,
    "percentFull": 50.0,
    "isNearCapacity": false
  }
}
```

---

### 3. POST `/checkin/decline`

**Purpose:** Decline entry and log the attempt.

**Request Body:**
```json
{
  "participantId": "507f1f77bcf86cd799439012",
  "sessionId": "507f1f77bcf86cd799439011",
  "declinedBy": "Officer Name",
  "reason": "Not registered for this session"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Check-in declined and logged",
  "data": {
    "_id": "...",
    "participantId": { ... },
    "sessionId": { ... },
    "attemptTime": "2024-01-01T09:30:00.000Z",
    "status": "declined",
    "declinedBy": "Officer Name",
    "reason": "Not registered for this session",
    "wasRegistered": false
  }
}
```

---

### 4. GET `/checkin/attempts`

**Purpose:** Get check-in attempts (declined/failed) for audit.

**Query Parameters:**
- `sessionId` (optional): Filter by session
- `participantId` (optional): Filter by participant
- `status` (optional): Filter by status (`declined`, `failed`)
- `page`, `limit`: Pagination

**Response:**
```json
{
  "status": "success",
  "message": "Check-in attempts retrieved",
  "data": [ ... ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

---

## WebSocket Events

### New Events

#### `checkin:verification`
Emitted when a QR code is scanned for verification.

```typescript
{
  type: 'verification',
  data: {
    participantId: string,
    participantName: string,
    sessionId: string,
    sessionName: string,
    badge: 'REGISTERED' | 'NOT_REGISTERED' | 'ALREADY_CHECKED_IN',
    isRegistered: boolean,
    timestamp: Date
  }
}
```

#### `checkin:accepted`
Emitted when a check-in is accepted.

```typescript
{
  type: 'accepted',
  data: {
    checkInId: string,
    participantId: string,
    participantName: string,
    sessionId: string,
    sessionName: string,
    badge: 'accepted' | 'accepted_unregistered',
    wasRegistered: boolean,
    isLate: boolean,
    timestamp: Date
  }
}
```

#### `checkin:declined`
Emitted when a check-in is declined.

```typescript
{
  type: 'declined',
  data: {
    attemptId: string,
    participantId: string,
    participantName: string,
    sessionId: string,
    sessionName: string,
    reason: string,
    wasRegistered: boolean,
    timestamp: Date
  }
}
```

---

## Dashboard Display

### Badge/Indicator System

| Badge | Color | Icon | Description |
|-------|-------|------|-------------|
| `REGISTERED` | Green | ✓ | Participant is registered for session |
| `NOT_REGISTERED` | Orange | ⚠ | Participant is NOT registered |
| `ALREADY_CHECKED_IN` | Blue | ℹ | Already checked in |
| `accepted` | Green | ✓ | Check-in was accepted |
| `accepted_unregistered` | Yellow | ⚡ | Accepted despite no registration |
| `declined` | Red | ✗ | Check-in was declined |

---

## Mobile App Integration

### API Calls Sequence

#### Registered Participant (Auto-Accept)
1. **Scan QR Code**
   ```dart
   POST /checkin/verify-qr
   Body: { qrCode, sessionId }
   ```
2. **Response badge = "REGISTERED"**
3. **Auto-accept**: `POST /checkin/accept` (immediate, no UI)
4. **Display Success Result**
   - Show check-in confirmation
   - Option to scan next

#### Unregistered Participant (Manual Decision)
1. **Scan QR Code**
   ```dart
   POST /checkin/verify-qr
   Body: { qrCode, sessionId }
   ```
2. **Response badge = "NOT_REGISTERED"**
3. **Display Verification Screen**
   - Show participant info
   - Show "NOT REGISTERED" warning badge
   - Show Accept/Decline buttons
4. **User Action**
   - **Accept**: `POST /checkin/accept` → Creates check-in with `accepted_unregistered` badge
   - **Decline**: `POST /checkin/decline` → Logs attempt with reason
5. **Display Final Result**

#### Already Checked In
1. **Scan QR Code**
   ```dart
   POST /checkin/verify-qr
   Body: { qrCode, sessionId }
   ```
2. **Response badge = "ALREADY_CHECKED_IN"**
3. **Display Info Screen**
   - Show "Already Checked In" info
   - No action buttons needed
   - Option to scan next

---

## Logging

All actions are logged with structured logging:

```typescript
logger.log('QR verification requested', {
  reqId: getCurrentRequestId(),
  qrCode: 'QR-***',  // Masked
  sessionId,
  participantId,
  isRegistered,
  badge
});

logger.log('Check-in accepted', {
  reqId: getCurrentRequestId(),
  checkInId,
  participantId,
  sessionId,
  badge,
  wasRegistered
});

logger.log('Check-in declined', {
  reqId: getCurrentRequestId(),
  attemptId,
  participantId,
  sessionId,
  reason,
  declinedBy
});
```

---

## File Changes Summary

### New Files
- `backend/src/modules/checkins/schemas/checkin-attempt.schema.ts`
- `backend/src/modules/checkins/repositories/checkin-attempt.repository.ts`
- `backend/src/modules/checkins/dto/verify-qr.dto.ts`
- `backend/src/modules/checkins/dto/accept-checkin.dto.ts`
- `backend/src/modules/checkins/dto/decline-checkin.dto.ts`

### Modified Files
- `backend/src/modules/checkins/schemas/checkin.schema.ts` - Add badge, wasRegistered
- `backend/src/modules/checkins/services/checkins.service.ts` - Add new methods
- `backend/src/modules/checkins/controllers/checkins.controller.ts` - Add new endpoints
- `backend/src/modules/checkins/dto/index.ts` - Export new DTOs
- `backend/src/modules/realtime/realtime.gateway.ts` - Add new events

---

## Migration Notes

1. Existing check-ins will have `badge: 'accepted'` and `wasRegistered: true` by default
2. The `CheckInAttempt` collection is new and starts empty
3. No breaking changes to existing API endpoints
