// K6 Concurrent Officers Test
// ============================================================================
// Simulate multiple check-in officers scanning simultaneously
// Run: k6 run k6-tests/scenarios/concurrent-officers.js
// ============================================================================

import { sleep, check, group } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import { CONFIG, getRandomItem, generateQrCode, TEST_DATA } from '../config.js';
import * as api from '../helpers/api.js';

// Custom metrics for officer simulation
const officerScanTime = new Trend('officer_scan_time');
const officerScans = new Counter('officer_scans');
const officerCollisions = new Counter('officer_collisions');

export const options = {
  scenarios: {
    // 5 officers, each processing 50 participants
    officer_shift_1: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 50,
      maxDuration: '15m',
      exec: 'officerWorkflow',
      tags: { shift: 'morning' },
    },
    
    // Additional 5 officers joining mid-event
    officer_shift_2: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 30,
      maxDuration: '10m',
      startTime: '3m',
      exec: 'officerWorkflow',
      tags: { shift: 'midday' },
    },
  },
  
  thresholds: {
    http_req_duration: ['p(95)<400'],
    http_req_failed: ['rate<0.05'],
    officer_scan_time: ['p(95)<300'],
  },
};

export function setup() {
  console.log('🎫 Setting up Concurrent Officers Test...');
  
  // Get available sessions
  const sessionsRes = api.getOpenSessions();
  let sessions = [];
  
  if (sessionsRes.status === 200) {
    const body = JSON.parse(sessionsRes.body);
    sessions = body.data || [];
  }
  
  // Get participants for scanning
  const participantsRes = api.getParticipants({ limit: 200, isActive: true });
  let participants = [];
  
  if (participantsRes.status === 200) {
    const body = JSON.parse(participantsRes.body);
    participants = body.data || [];
  }
  
  console.log(`📋 Sessions: ${sessions.length}, Participants: ${participants.length}`);
  
  return {
    sessions: sessions.length > 0 ? sessions : [{ _id: TEST_DATA.sessionIds[0] }],
    participants,
    qrCodes: participants.map(p => p.qrCode).filter(Boolean),
  };
}

export function officerWorkflow(data) {
  const officerId = __VU;
  const iterationId = __ITER;
  const officerName = `Officer-${officerId}`;
  
  // Each officer focuses on one session
  const assignedSession = data.sessions[officerId % data.sessions.length];
  
  group(`Officer ${officerId} - Iteration ${iterationId}`, () => {
    const startTime = Date.now();
    
    // 1. Simulate QR code scan
    let qrCode;
    if (data.qrCodes.length > 0) {
      // Use real QR codes
      qrCode = data.qrCodes[(officerId * 50 + iterationId) % data.qrCodes.length];
    } else {
      qrCode = generateQrCode();
    }
    
    // 2. Verify QR code
    const verifyStart = Date.now();
    const verifyResult = api.verifyQr(qrCode, assignedSession._id);
    const verifyDuration = Date.now() - verifyStart;
    
    officerScanTime.add(verifyDuration);
    officerScans.add(1);
    
    check(verifyResult, {
      'QR verification responded': (r) => r.status !== 0,
    });
    
    // 3. Handle verification result
    if (verifyResult.status === 200) {
      const body = JSON.parse(verifyResult.body);
      
      if (body.data?.isAlreadyCheckedIn) {
        // Already checked in - collision
        officerCollisions.add(1);
        console.log(`⚠️ Officer ${officerId}: Already checked in`);
      } else if (body.data?.canCheckIn) {
        // Proceed with check-in
        sleep(0.2); // Officer confirmation time
        
        const checkInResult = api.checkInByQr(qrCode, assignedSession._id, officerName);
        
        if (checkInResult.success) {
          console.log(`✓ Officer ${officerId}: Check-in successful`);
        }
      }
    } else if (verifyResult.status === 404) {
      // Participant not found - normal for generated QR codes
    } else if (verifyResult.status === 409) {
      // Conflict - another officer processed first
      officerCollisions.add(1);
    }
    
    const totalDuration = Date.now() - startTime;
    
    // 4. Simulate realistic timing between scans
    const thinkTime = Math.random() * 2 + 1; // 1-3 seconds
    sleep(thinkTime);
  });
}

export function handleSummary(data) {
  const summary = {
    test: 'concurrent-officers',
    timestamp: new Date().toISOString(),
    
    // Request metrics
    totalRequests: data.metrics.http_reqs?.values.count || 0,
    failedRequests: data.metrics.http_req_failed?.values.passes || 0,
    errorRate: ((data.metrics.http_req_failed?.values.rate || 0) * 100).toFixed(2) + '%',
    
    // Officer metrics
    totalScans: data.metrics.officer_scans?.values.count || 0,
    collisions: data.metrics.officer_collisions?.values.count || 0,
    avgScanTime: data.metrics.officer_scan_time?.values.avg?.toFixed(2) || 0,
    p95ScanTime: data.metrics.officer_scan_time?.values['p(95)']?.toFixed(2) || 0,
    
    // Response times
    avgResponseTime: data.metrics.http_req_duration?.values.avg?.toFixed(2) || 0,
    p95ResponseTime: data.metrics.http_req_duration?.values['p(95)']?.toFixed(2) || 0,
  };

  console.log('\n========================================');
  console.log('   CONCURRENT OFFICERS TEST RESULTS');
  console.log('========================================');
  console.log(`Total Officers Simulated: 10`);
  console.log(`Total Scans: ${summary.totalScans}`);
  console.log(`Collisions (double check-ins): ${summary.collisions}`);
  console.log(`Error Rate: ${summary.errorRate}`);
  console.log('----------------------------------------');
  console.log('SCAN TIMES:');
  console.log(`  Average: ${summary.avgScanTime}ms`);
  console.log(`  P95: ${summary.p95ScanTime}ms`);
  console.log('----------------------------------------');
  console.log('OVERALL RESPONSE TIMES:');
  console.log(`  Average: ${summary.avgResponseTime}ms`);
  console.log(`  P95: ${summary.p95ResponseTime}ms`);
  console.log('========================================\n');

  return {
    'k6-tests/results/concurrent-officers-summary.json': JSON.stringify(summary, null, 2),
  };
}
