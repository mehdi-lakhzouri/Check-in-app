# Backend API Documentation

## Overview
This document outlines all the API endpoints available in the IASTAM Check-in API backend. The API is built with Express.js and uses MongoDB as the database.

## Base URL
All endpoints are prefixed with `/api`

## Authentication
Currently, the API does not implement authentication. All endpoints are publicly accessible.

## Response Format
All responses follow a consistent format:
```json
{
  "status": "success|error",
  "message": "Description of the response",
  "data": { ... } // Present only on success
}
```

---

## Sessions API (`/api/sessions`)

### List Sessions
- **Method**: `GET`
- **Path**: `/api/sessions`
- **Description**: Retrieve all sessions with check-in counts
- **Response**: Array of session objects

### Get Single Session
- **Method**: `GET`
- **Path**: `/api/sessions/:id`
- **Description**: Retrieve a specific session by ID
- **Parameters**: `id` (session ID)
- **Response**: Single session object

### Create Session
- **Method**: `POST`
- **Path**: `/api/sessions`
- **Description**: Create a new session
- **Body**: Session data (name, startTime, endTime, isOpen)
- **Validation**: Zod schema validation
- **Response**: Created session object

### Update Session
- **Method**: `PUT`
- **Path**: `/api/sessions/:id`
- **Description**: Update an existing session
- **Parameters**: `id` (session ID)
- **Body**: Updated session data
- **Validation**: Zod schema validation
- **Response**: Updated session object

### Delete Session
- **Method**: `DELETE`
- **Path**: `/api/sessions/:id`
- **Description**: Delete a session and all related registrations/check-ins
- **Parameters**: `id` (session ID)
- **Response**: Deleted session data

### Get Session Check-ins
- **Method**: `GET`
- **Path**: `/api/sessions/:id/checkins`
- **Description**: Get all check-ins for a specific session
- **Parameters**: `id` (session ID)
- **Response**: Array of check-in objects with participant details

### Assign Participants to Session
- **Method**: `POST`
- **Path**: `/api/sessions/:id/assign-participants`
- **Description**: Bulk assign participants to a session
- **Parameters**: `id` (session ID)
- **Body**: `{ participantIds: string[] }`
- **Response**: Assignment results with success/error counts

### Get Session Participants
- **Method**: `GET`
- **Path**: `/api/sessions/:id/participants`
- **Description**: Get all participants assigned to a session
- **Parameters**: `id` (session ID)
- **Response**: Array of participant objects

---

## Participants API (`/api/participants`)

### List Participants
- **Method**: `GET`
- **Path**: `/api/participants`
- **Description**: Retrieve all participants with optional search
- **Query Parameters**: `search` (optional search term)
- **Response**: Array of participant objects

### Generate QR Code
- **Method**: `GET`
- **Path**: `/api/participants/generate-qr`
- **Description**: Generate a new unique QR code
- **Response**: QR code string and data URL

### Get Participant by QR Code
- **Method**: `GET`
- **Path**: `/api/participants/qr/:qrCode`
- **Description**: Find participant by QR code
- **Parameters**: `qrCode` (QR code string)
- **Response**: Participant object

### Get Participant Details
- **Method**: `GET`
- **Path**: `/api/participants/:id/details`
- **Description**: Get detailed participant information including registrations, check-ins, and referrals
- **Parameters**: `id` (participant ID)
- **Response**: Detailed participant object with related data

### Get Single Participant
- **Method**: `GET`
- **Path**: `/api/participants/:id`
- **Description**: Retrieve a specific participant by ID
- **Parameters**: `id` (participant ID)
- **Response**: Single participant object

### Create Participant
- **Method**: `POST`
- **Path**: `/api/participants`
- **Description**: Create a new participant
- **Body**: Participant data (name, email, organization, status)
- **Validation**: Zod schema validation
- **Response**: Created participant object

### Update Participant
- **Method**: `PUT`
- **Path**: `/api/participants/:id`
- **Description**: Update an existing participant
- **Parameters**: `id` (participant ID)
- **Body**: Updated participant data
- **Validation**: Zod schema validation
- **Response**: Updated participant object

### Delete Participant
- **Method**: `DELETE`
- **Path**: `/api/participants/:id`
- **Description**: Delete a participant and related data
- **Parameters**: `id` (participant ID)
- **Response**: Deletion confirmation

### Get Participant Registrations
- **Method**: `GET`
- **Path**: `/api/participants/:id/registrations`
- **Description**: Get all registrations for a participant
- **Parameters**: `id` (participant ID)
- **Response**: Array of registration objects

### Get Participant Check-ins
- **Method**: `GET`
- **Path**: `/api/participants/:id/checkins`
- **Description**: Get all check-ins for a participant
- **Parameters**: `id` (participant ID)
- **Response**: Array of check-in objects

### Download QR Codes
- **Method**: `GET`
- **Path**: `/api/participants/qrcodes/download`
- **Description**: Download all participant QR codes as ZIP
- **Response**: ZIP file download

### Bulk Upload Participants
- **Method**: `POST`
- **Path**: `/api/participants/bulk`
- **Description**: Bulk upload participants from CSV data
- **Body**: `{ participants: Array<{name, email, organization}> }`
- **Response**: Upload results with success/error counts

### Download Template
- **Method**: `GET`
- **Path**: `/api/participants/template/download`
- **Description**: Download CSV template for bulk upload
- **Response**: CSV file download

### Sync Referrals
- **Method**: `POST`
- **Path**: `/api/participants/sync-referrals`
- **Description**: Sync participant referrals with organization ambassadors
- **Response**: Sync results

### Delete Participant (Alternative)
- **Method**: `DELETE`
- **Path**: `/api/participants/:id`
- **Description**: Alternative delete endpoint (duplicate)
- **Parameters**: `id` (participant ID)
- **Response**: Deletion confirmation

### Ambassador Leaderboard
- **Method**: `GET`
- **Path**: `/api/participants/ambassadors/leaderboard`
- **Description**: Get ambassador leaderboard by points
- **Response**: Array of ambassadors with points

### Ambassador Activity
- **Method**: `GET`
- **Path**: `/api/participants/:id/ambassador/activity`
- **Description**: Get ambassador activity details
- **Parameters**: `id` (ambassador ID)
- **Response**: Ambassador activity data

### Calculate Ambassador Points
- **Method**: `POST`
- **Path**: `/api/participants/:id/ambassador/calculate-points`
- **Description**: Recalculate ambassador points
- **Parameters**: `id` (ambassador ID)
- **Response**: Updated points

### Add Referred Participant
- **Method**: `POST`
- **Path**: `/api/participants/:id/ambassador/add-referred`
- **Description**: Add a participant to ambassador's referrals
- **Parameters**: `id` (ambassador ID)
- **Body**: `{ participantId: string }`
- **Response**: Updated ambassador data

### Remove Referred Participant
- **Method**: `DELETE`
- **Path**: `/api/participants/:id/ambassador/remove-referred/:participantId`
- **Description**: Remove a participant from ambassador's referrals
- **Parameters**: `id` (ambassador ID), `participantId` (participant to remove)
- **Response**: Updated ambassador data

### Travel Grant Applications
- **Method**: `GET`
- **Path**: `/api/participants/travel-grants/applications`
- **Description**: Get travel grant applications with optional filtering
- **Query Parameters**: `status`, `organization`
- **Response**: Array of travel grant applications

### Travel Grant Statistics
- **Method**: `GET`
- **Path**: `/api/participants/travel-grants/stats`
- **Description**: Get travel grant statistics
- **Response**: Statistics object

### Check Travel Grant Qualification
- **Method**: `GET`
- **Path**: `/api/participants/:id/travel-grant/qualification`
- **Description**: Check if participant qualifies for travel grant
- **Parameters**: `id` (participant ID)
- **Response**: Qualification status

### Apply for Travel Grant
- **Method**: `POST`
- **Path**: `/api/participants/:id/travel-grant/apply`
- **Description**: Apply for travel grant
- **Parameters**: `id` (participant ID)
- **Response**: Application result

### Approve/Reject Travel Grant
- **Method**: `PUT`
- **Path**: `/api/participants/:id/travel-grant/approve`
- **Description**: Approve or reject travel grant application
- **Parameters**: `id` (participant ID)
- **Body**: `{ approved: boolean }`
- **Response**: Approval result

---

## Registrations API (`/api/registrations`)

### List Registrations
- **Method**: `GET`
- **Path**: `/api/registrations`
- **Description**: Retrieve all registrations
- **Response**: Array of registration objects

### Get Single Registration
- **Method**: `GET`
- **Path**: `/api/registrations/:id`
- **Description**: Retrieve a specific registration by ID
- **Parameters**: `id` (registration ID)
- **Response**: Single registration object

### Create Registration
- **Method**: `POST`
- **Path**: `/api/registrations`
- **Description**: Create a new registration
- **Body**: Registration data (participantId, sessionId, status)
- **Validation**: Zod schema validation
- **Response**: Created registration object

### Update Registration
- **Method**: `PUT`
- **Path**: `/api/registrations/:id`
- **Description**: Update an existing registration
- **Parameters**: `id` (registration ID)
- **Body**: Updated registration data
- **Validation**: Zod schema validation
- **Response**: Updated registration object

### Delete Registration
- **Method**: `DELETE`
- **Path**: `/api/registrations/:id`
- **Description**: Delete a registration
- **Parameters**: `id` (registration ID)
- **Response**: Deletion confirmation

---

## Check-in API (`/api/checkin`)

### List Check-ins
- **Method**: `GET`
- **Path**: `/api/checkin`
- **Description**: Retrieve all check-ins
- **Response**: Array of check-in objects

### Manual Check-in
- **Method**: `POST`
- **Path**: `/api/checkin`
- **Description**: Manually check in a participant to a session
- **Body**: Check-in data (participantId, sessionId)
- **Response**: Check-in result

### QR Code Check-in
- **Method**: `POST`
- **Path**: `/api/checkin/qr`
- **Description**: Check in participant using QR code
- **Body**: `{ qrCode: string, sessionId: string }`
- **Response**: Check-in result

---

## Bulk Operations API (`/api/bulk`)

### Download Participants Template
- **Method**: `GET`
- **Path**: `/api/bulk/participants-template`
- **Description**: Download CSV template for participants
- **Response**: CSV file download

### Download Template
- **Method**: `GET`
- **Path**: `/api/bulk/template`
- **Description**: Download general CSV template
- **Response**: CSV file download

### Bulk Upload Participants
- **Method**: `POST`
- **Path**: `/api/bulk/bulk-upload-participants`
- **Description**: Upload participants via CSV file
- **Content-Type**: `multipart/form-data`
- **File**: CSV file
- **Response**: Upload results

### Bulk Upload to Session
- **Method**: `POST`
- **Path**: `/api/bulk/bulk-upload/:sessionId`
- **Description**: Bulk upload and assign participants to a session
- **Parameters**: `sessionId` (session ID)
- **Content-Type**: `multipart/form-data`
- **File**: CSV file
- **Response**: Upload and assignment results

### Export Session Data
- **Method**: `GET`
- **Path**: `/api/bulk/session/:sessionId/export`
- **Description**: Export session attendance data
- **Parameters**: `sessionId` (session ID)
- **Response**: Excel file download

### Bulk Upload Participants Only
- **Method**: `POST`
- **Path**: `/api/bulk/participants-only`
- **Description**: Upload participants without session assignment
- **Content-Type**: `multipart/form-data`
- **File**: CSV file
- **Response**: Upload results

### Assign Participants to Session
- **Method**: `POST`
- **Path**: `/api/bulk/assign-session/:sessionId`
- **Description**: Assign existing participants to a session
- **Parameters**: `sessionId` (session ID)
- **Body**: `{ participantIds: string[] }`
- **Response**: Assignment results

---

## Reports API (`/api/reports`)

### Attendance Report
- **Method**: `GET`
- **Path**: `/api/reports/attendance`
- **Description**: Generate attendance report
- **Query Parameters**: Various filters
- **Response**: Attendance data

### Session Report
- **Method**: `GET`
- **Path**: `/api/reports/session/:sessionId`
- **Description**: Generate report for specific session
- **Parameters**: `sessionId` (session ID)
- **Query Parameters**: Various filters
- **Response**: Session report data

### Statistics Report
- **Method**: `GET`
- **Path**: `/api/reports/statistics`
- **Description**: Generate overall statistics report
- **Response**: Statistics data

### Sessions Sheets
- **Method**: `GET`
- **Path**: `/api/reports/sessions-sheets`
- **Description**: Generate sessions overview sheets
- **Response**: Sessions data

---

## Health Check API

### Health Check
- **Method**: `GET`
- **Path**: `/api/health`
- **Description**: Check API health status
- **Response**: Health status information

---

## Data Models

### Participant
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  organization: String,
  qrCode: String,
  isActive: Boolean,
  status: 'regular' | 'ambassador' | 'travel_grant',
  ambassadorPoints: Number,
  referredParticipantIds: [ObjectId],
  travelGrantApplied: Boolean,
  travelGrantApproved: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Session
```javascript
{
  _id: ObjectId,
  name: String,
  startTime: Date,
  endTime: Date,
  isOpen: Boolean,
  checkInsCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Registration
```javascript
{
  _id: ObjectId,
  participantId: ObjectId,
  sessionId: ObjectId,
  registrationDate: Date,
  status: 'confirmed' | 'pending' | 'cancelled',
  createdAt: Date,
  updatedAt: Date
}
```

### CheckIn
```javascript
{
  _id: ObjectId,
  participantId: ObjectId,
  sessionId: ObjectId,
  checkInTime: Date,
  method: 'qr' | 'manual',
  createdAt: Date,
  updatedAt: Date
}
```

---

## Error Handling

All endpoints return errors in the following format:
```json
{
  "status": "error",
  "message": "Error description",
  "error": "Detailed error message" // Only in development
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `404`: Not Found
- `500`: Internal Server Error

---

## Validation

The API uses Zod schemas for request validation. Validation errors return detailed field-level error messages in the response.</content>
<parameter name="filePath">c:\Users\medma\Desktop\checkin\backend-api-documentation.md