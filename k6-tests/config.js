// K6 Test Configuration
// ============================================================================
// Central configuration for all K6 performance tests
// ============================================================================

export const CONFIG = {
  // Base URL - Change this to your server
  BASE_URL: __ENV.BASE_URL || 'http://localhost:3000/api/v1',
  
  // WebSocket URL for real-time tests
  WS_URL: __ENV.WS_URL || 'ws://localhost:3000/realtime',
  
  // Default headers
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

// ============================================================================
// LOAD TEST SCENARIOS
// ============================================================================

export const SCENARIOS = {
  // Smoke Test - Minimal load to verify system works
  smoke: {
    executor: 'constant-vus',
    vus: 1,
    duration: '30s',
  },

  // Load Test - Average expected load
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 50 },   // Ramp up to 50 users
      { duration: '5m', target: 50 },   // Stay at 50 users
      { duration: '2m', target: 0 },    // Ramp down
    ],
  },

  // Stress Test - Push system to limits
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 100 },  // Ramp up
      { duration: '5m', target: 100 },  // Stay at 100
      { duration: '2m', target: 200 },  // Push to 200
      { duration: '5m', target: 200 },  // Stay at 200
      { duration: '2m', target: 300 },  // Push to 300
      { duration: '5m', target: 300 },  // Stay at 300
      { duration: '5m', target: 0 },    // Ramp down
    ],
  },

  // Spike Test - Sudden traffic spikes
  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 10 },   // Normal load
      { duration: '1m', target: 10 },    // Maintain
      { duration: '10s', target: 200 },  // Spike!
      { duration: '3m', target: 200 },   // Stay at spike
      { duration: '10s', target: 10 },   // Back to normal
      { duration: '1m', target: 10 },    // Maintain
      { duration: '10s', target: 0 },    // Ramp down
    ],
  },

  // Soak Test - Extended duration for memory leaks
  soak: {
    executor: 'constant-vus',
    vus: 50,
    duration: '30m',
  },

  // Event Simulation - 300 attendees checking in
  event_300: {
    executor: 'ramping-arrival-rate',
    startRate: 0,
    timeUnit: '1s',
    preAllocatedVUs: 50,
    maxVUs: 100,
    stages: [
      { duration: '1m', target: 5 },    // 5 check-ins/second
      { duration: '5m', target: 10 },   // Peak: 10 check-ins/second
      { duration: '2m', target: 2 },    // Slow down
      { duration: '1m', target: 0 },    // End
    ],
  },

  // Concurrent Officers - Multiple officers scanning
  concurrent_officers: {
    executor: 'per-vu-iterations',
    vus: 10,           // 10 officers
    iterations: 30,    // Each scans 30 participants
    maxDuration: '10m',
  },
};

// ============================================================================
// THRESHOLDS - Performance requirements
// ============================================================================

export const THRESHOLDS = {
  // HTTP request duration thresholds
  http_req_duration: ['p(95)<500', 'p(99)<1000'],  // 95% < 500ms, 99% < 1s
  
  // Check-in specific thresholds
  'http_req_duration{endpoint:checkin}': ['p(95)<300'],
  'http_req_duration{endpoint:sessions}': ['p(95)<200'],
  'http_req_duration{endpoint:participants}': ['p(95)<200'],
  'http_req_duration{endpoint:health}': ['p(95)<100'],
  
  // Error rate thresholds
  http_req_failed: ['rate<0.01'],  // Less than 1% errors
  
  // Custom metrics thresholds
  'checkin_success_rate': ['rate>0.99'],  // 99% check-ins succeed
  'qr_scan_duration': ['p(95)<200'],       // QR scans < 200ms
};

// ============================================================================
// TEST DATA
// ============================================================================

export const TEST_DATA = {
  // Sample QR codes for testing (generate these from your DB)
  qrCodes: [
    'QR-TEST001',
    'QR-TEST002',
    'QR-TEST003',
    'QR-TEST004',
    'QR-TEST005',
  ],
  
  // Sample participant IDs (ObjectId format)
  participantIds: [
    '507f1f77bcf86cd799439011',
    '507f1f77bcf86cd799439012',
    '507f1f77bcf86cd799439013',
  ],
  
  // Sample session IDs
  sessionIds: [
    '507f1f77bcf86cd799439001',
    '507f1f77bcf86cd799439002',
  ],
  
  // Officer names for check-in attribution
  officers: [
    'Officer Alpha',
    'Officer Beta',
    'Officer Gamma',
    'Officer Delta',
  ],
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function generateQrCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'QR-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function sleep(min, max) {
  const duration = Math.random() * (max - min) + min;
  return duration;
}
