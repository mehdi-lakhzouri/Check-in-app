// K6 Event Simulation Test - 300 Attendees Check-in
// ============================================================================
// Realistic simulation of a conference check-in scenario
// Run: k6 run k6-tests/scenarios/event-checkin.js
// ============================================================================

import { sleep, check, group } from 'k6';
import http from 'k6/http';
import { SharedArray } from 'k6/data';
import { CONFIG, getRandomItem, generateQrCode, TEST_DATA } from '../config.js';
import * as api from '../helpers/api.js';
import { metrics } from '../helpers/api.js';

export const options = {
  scenarios: {
    // Scenario 1: Officers at registration desk (continuous)
    registration_desk: {
      executor: 'constant-vus',
      vus: 5,                    // 5 registration officers
      duration: '10m',
      exec: 'registrationDesk',
    },
    
    // Scenario 2: Peak check-in rush (ramping)
    checkin_rush: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 50,
      stages: [
        { duration: '1m', target: 2 },    // Slow start: 2 check-ins/sec
        { duration: '3m', target: 10 },   // Peak: 10 check-ins/sec
        { duration: '2m', target: 5 },    // Settling: 5 check-ins/sec
        { duration: '2m', target: 1 },    // Ending: 1 check-in/sec
        { duration: '2m', target: 0 },    // Cool down
      ],
      exec: 'qrCheckin',
    },
    
    // Scenario 3: Dashboard viewers (event staff)
    dashboard_viewers: {
      executor: 'constant-vus',
      vus: 3,                    // 3 staff watching dashboard
      duration: '10m',
      exec: 'dashboardView',
    },
  },
  
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.02'],
    'http_req_duration{endpoint:checkin}': ['p(95)<300'],
    checkin_success_rate: ['rate>0.95'],
    qr_scan_duration: ['p(95)<200'],
  },
};

// Pre-setup: Get session and participant data
export function setup() {
  console.log('🚀 Setting up Event Check-in Test...');
  
  // Get open sessions
  const sessionsRes = api.getOpenSessions();
  let sessions = [];
  
  if (sessionsRes.status === 200) {
    const body = JSON.parse(sessionsRes.body);
    sessions = body.data || [];
    console.log(`📋 Found ${sessions.length} open sessions`);
  }
  
  // Get participants
  const participantsRes = api.getParticipants({ limit: 100 });
  let participants = [];
  
  if (participantsRes.status === 200) {
    const body = JSON.parse(participantsRes.body);
    participants = body.data || [];
    console.log(`👥 Found ${participants.length} participants`);
  }
  
  return {
    sessions: sessions.length > 0 ? sessions : [{ _id: TEST_DATA.sessionIds[0], name: 'Test Session' }],
    participants: participants.length > 0 ? participants : [],
    officers: TEST_DATA.officers,
  };
}

// Scenario: Registration Desk (manual check-ins + search)
export function registrationDesk(data) {
  const session = getRandomItem(data.sessions);
  const officer = getRandomItem(data.officers);
  
  group('Registration Desk Flow', () => {
    // 1. Search for participant (simulating name lookup)
    const searchTerms = ['John', 'Sarah', 'Dr.', 'Prof', 'Mohamed', 'Emma'];
    const searchResult = api.searchParticipants(getRandomItem(searchTerms));
    
    check(searchResult, {
      'search returned results': (r) => r.status === 200,
    });
    
    sleep(1); // Officer reviewing results
    
    // 2. If participants found, attempt manual check-in
    if (searchResult.status === 200) {
      const body = JSON.parse(searchResult.body);
      const participants = body.data || [];
      
      if (participants.length > 0) {
        const participant = getRandomItem(participants);
        
        // Verify if already checked in
        api.verifyCheckIn(participant._id, session._id);
        sleep(0.5);
        
        // Attempt check-in (may fail if already checked in)
        const checkInResult = api.checkInManual(participant._id, session._id, officer);
        
        if (checkInResult.response.status === 201 || checkInResult.response.status === 200) {
          console.log(`✓ Manual check-in: ${participant.name}`);
        }
      }
    }
    
    sleep(2); // Time between check-ins
  });
}

// Scenario: QR Code Check-in (high volume)
export function qrCheckin(data) {
  const session = getRandomItem(data.sessions);
  const officer = getRandomItem(data.officers);
  
  group('QR Check-in Flow', () => {
    // Simulate QR scan
    let qrCode;
    
    // Use real participant QR if available
    if (data.participants.length > 0) {
      const participant = getRandomItem(data.participants);
      qrCode = participant.qrCode;
    } else {
      // Generate fake QR for testing (will fail but tests endpoint)
      qrCode = generateQrCode();
    }
    
    // 1. Verify QR first (new workflow)
    const verifyResult = api.verifyQr(qrCode, session._id);
    
    if (verifyResult.status === 200) {
      const verifyBody = JSON.parse(verifyResult.body);
      
      // 2. If verification successful and not already checked in
      if (verifyBody.data && !verifyBody.data.isAlreadyCheckedIn) {
        sleep(0.3); // Officer confirmation time
        
        // 3. Perform actual check-in
        const checkInResult = api.checkInByQr(qrCode, session._id, officer);
        
        check(checkInResult.response, {
          'QR check-in successful or expected error': (r) => 
            r.status === 200 || r.status === 201 || r.status === 404 || r.status === 409,
        });
      }
    }
    
    sleep(0.5); // Time for next scan
  });
}

// Scenario: Dashboard/Stats Viewing
export function dashboardView(data) {
  group('Dashboard View', () => {
    // 1. Get session statistics
    api.getSessionStats();
    sleep(1);
    
    // 2. Get check-in statistics
    api.getCheckInStats();
    sleep(1);
    
    // 3. Get recent check-ins
    api.getRecentCheckIns(20);
    sleep(1);
    
    // 4. Get specific session check-ins
    if (data.sessions.length > 0) {
      const session = getRandomItem(data.sessions);
      api.getSessionCheckins(session._id);
    }
    
    sleep(3); // Dashboard refresh interval
  });
}

export function teardown(data) {
  console.log('\n🏁 Event Check-in Test Complete');
  console.log(`Sessions tested: ${data.sessions.length}`);
  console.log(`Participants available: ${data.participants.length}`);
}

export function handleSummary(data) {
  const summary = {
    test: 'event-checkin-300',
    timestamp: new Date().toISOString(),
    totalRequests: data.metrics.http_reqs?.values.count || 0,
    failedRequests: data.metrics.http_req_failed?.values.passes || 0,
    errorRate: ((data.metrics.http_req_failed?.values.rate || 0) * 100).toFixed(2) + '%',
    
    // Check-in specific metrics
    totalCheckins: data.metrics.checkin_total?.values.count || 0,
    successfulCheckins: data.metrics.checkin_success?.values.count || 0,
    failedCheckins: data.metrics.checkin_failed?.values.count || 0,
    checkinSuccessRate: ((data.metrics.checkin_success_rate?.values.rate || 0) * 100).toFixed(2) + '%',
    
    // Response times
    avgResponseTime: data.metrics.http_req_duration?.values.avg?.toFixed(2) || 0,
    p95ResponseTime: data.metrics.http_req_duration?.values['p(95)']?.toFixed(2) || 0,
    
    // QR scan specific
    avgQrScanTime: data.metrics.qr_scan_duration?.values.avg?.toFixed(2) || 0,
    p95QrScanTime: data.metrics.qr_scan_duration?.values['p(95)']?.toFixed(2) || 0,
  };

  console.log('\n========================================');
  console.log('   EVENT CHECK-IN (300) TEST RESULTS');
  console.log('========================================');
  console.log(`Total HTTP Requests: ${summary.totalRequests}`);
  console.log(`Error Rate: ${summary.errorRate}`);
  console.log('----------------------------------------');
  console.log('CHECK-IN METRICS:');
  console.log(`  Total Attempts: ${summary.totalCheckins}`);
  console.log(`  Successful: ${summary.successfulCheckins}`);
  console.log(`  Failed: ${summary.failedCheckins}`);
  console.log(`  Success Rate: ${summary.checkinSuccessRate}`);
  console.log('----------------------------------------');
  console.log('RESPONSE TIMES:');
  console.log(`  Overall Avg: ${summary.avgResponseTime}ms`);
  console.log(`  Overall P95: ${summary.p95ResponseTime}ms`);
  console.log(`  QR Scan Avg: ${summary.avgQrScanTime}ms`);
  console.log(`  QR Scan P95: ${summary.p95QrScanTime}ms`);
  console.log('========================================\n');

  return {
    'k6-tests/results/event-checkin-summary.json': JSON.stringify(summary, null, 2),
  };
}
