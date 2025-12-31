# IASTAM Conference Check-in System

A complete conference attendance system with QR code scanning, session management, and real-time check-ins.

## System Overview

This system consists of three main components:

1. **Backend API** (Express.js + MongoDB) - REST API for managing sessions, participants, registrations, and check-ins
2. **Mobile App** (Flutter) - QR code scanner for staff to check-in participants
3. **Admin Dashboard** (Next.js) - Web interface for managing all conference data

## Features

### Backend API
- RESTful API with Express.js and MongoDB
- Zod validation for all requests
- Session management (open/closed sessions)
- Participant management with QR codes
- Registration system for closed sessions
- Smart check-in logic (open sessions = direct check-in, closed sessions = verify registration first)
- Sample data seeding script

### Mobile App (Flutter)
- Session list with real-time data
- QR code scanner using mobile_scanner
- Offline-first design with Riverpod state management
- Success/error feedback for check-ins
- Clean Material Design interface

### Admin Dashboard (Next.js)
- Dashboard with key metrics and insights
- Session management (CRUD operations)
- Participant management
- Registration tracking
- Check-in monitoring
- Modern UI with Tailwind CSS and shadcn/ui components

## Project Structure

```
iastam-checkin-system/
├── iastam-checkin-api/          # Express.js Backend
│   ├── src/
│   │   ├── config/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── validators/
│   │   └── server.js
│   ├── scripts/seed.js
│   └── package.json
├── iastam_checkin_mobile/       # Flutter Mobile App
│   ├── lib/
│   │   ├── config/
│   │   ├── models/
│   │   ├── providers/
│   │   ├── screens/
│   │   ├── services/
│   │   └── main.dart
│   └── pubspec.yaml
└── iastam-checkin-admin/        # Next.js Admin Dashboard
    ├── src/
    │   ├── app/
    │   ├── components/
    │   ├── config/
    │   ├── lib/
    │   └── types/
    └── package.json
```

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- MongoDB (local or cloud instance)
- Flutter SDK 3.9+
- Git

### 1. Backend API Setup

```bash
cd iastam-checkin-api

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI and other settings

# Start the server
npm run dev

# Seed sample data (optional)
npm run seed
```

Environment variables (`.env`):
```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/iastam_checkin
CORS_ORIGIN=http://localhost:3000
```

### 2. Mobile App Setup

```bash
cd iastam_checkin_mobile

# Get Flutter dependencies
flutter pub get

# Generate code (for Freezed models)
flutter packages pub run build_runner build

# Update API base URL in lib/config/api_config.dart
# Change to your backend server IP address

# Run the app
flutter run
```

**Important**: Update the API base URL in `lib/config/api_config.dart` to point to your backend server's IP address for device testing.

### 3. Admin Dashboard Setup

```bash
cd iastam-checkin-admin

# Install dependencies
npm install

# Configure environment
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api" > .env.local

# Start the development server
npm run dev
```

## API Endpoints

### Sessions
- `GET /api/sessions` - List all sessions
- `POST /api/sessions` - Create session
- `PUT /api/sessions/:id` - Update session
- `DELETE /api/sessions/:id` - Delete session
- `GET /api/sessions/:id/checkins` - Get session attendance

### Participants
- `GET /api/participants` - List all participants
- `POST /api/participants` - Create participant
- `GET /api/participants/qr/:qrCode` - Get participant by QR code

### Check-ins
- `POST /api/checkin/qr` - Check-in with QR code and session ID
- `POST /api/checkin` - Check-in with participant and session ID

## Usage Flow

1. **Admin Setup**:
   - Use the admin dashboard to create sessions
   - Add participants with unique QR codes
   - For closed sessions, create registrations

2. **Mobile Check-in**:
   - Staff opens mobile app and selects a session
   - Scans participant's QR code
   - System automatically handles open/closed session logic
   - Shows success/error feedback

3. **Admin Monitoring**:
   - View real-time attendance statistics
   - Monitor check-ins and registrations
   - Manage participants and sessions

## Sample Data

The system includes a seed script that creates:
- 6 sample sessions (mix of open/closed, different types)
- 8 sample participants with QR codes (QR001-QR008)
- Sample registrations for closed sessions

## Development Notes

### Mobile App
- Uses Riverpod for state management
- Dio for HTTP client
- Freezed + json_serializable for type-safe models
- Mobile Scanner for QR code scanning

### Backend
- Mongoose for MongoDB ODM
- Zod for request validation
- CORS enabled for cross-origin requests
- Morgan for request logging

### Frontend
- Next.js 15 with App Router
- TanStack Query for data fetching
- Tailwind CSS for styling
- TypeScript for type safety

## Troubleshooting

### Common Issues

1. **Mobile app can't connect to API**:
   - Ensure the API base URL in `api_config.dart` uses your computer's IP address, not localhost
   - Check that the backend server is running on port 3001

2. **MongoDB connection issues**:
   - Verify MongoDB is running
   - Check the MONGODB_URI in your .env file

3. **CORS errors**:
   - Update CORS_ORIGIN in backend .env file
   - Ensure it matches your frontend URL

4. **Flutter build errors**:
   - Run `flutter clean` then `flutter pub get`
   - Run the build runner: `flutter packages pub run build_runner build --delete-conflicting-outputs`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.