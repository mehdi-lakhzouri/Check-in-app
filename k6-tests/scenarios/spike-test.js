// K6 Spike Test
// ============================================================================
// Test system behavior under sudden traffic spikes
// Run: k6 run k6-tests/scenarios/spike-test.js
// ============================================================================

import { sleep, check, group } from 'k6';
import { CONFIG, getRandomItem } from '../config.js';
import * as api from '../helpers/api.js';

export const options = {
  stages: [
    { duration: '30s', target: 10 },    // Normal load
    { duration: '1m', target: 10 },     // Maintain normal
    { duration: '10s', target: 150 },   // SPIKE! Rapid increase
    { duration: '2m', target: 150 },    // Maintain spike
    { duration: '10s', target: 300 },   // BIGGER SPIKE!
    { duration: '2m', target: 300 },    // Maintain high spike
    { duration: '10s', target: 10 },    // Rapid decrease
    { duration: '1m', target: 10 },     // Recovery
    { duration: '30s', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],    // Allow higher latency during spikes
    http_req_failed: ['rate<0.15'],       // Allow up to 15% errors during spike
  },
};

export default function () {
  // During spikes, simulate concurrent QR scans and session views
  const action = Math.random();

  if (action < 0.5) {
    // 50% - Session browsing (typical during event)
    api.getSessions({ isOpen: true, limit: 10 });
  } else if (action < 0.8) {
    // 30% - Participant lookup
    const terms = ['John', 'Sarah', 'Dr', 'Prof', 'Mohamed'];
    api.searchParticipants(getRandomItem(terms));
  } else {
    // 20% - Stats and health
    api.getSessionStats();
    api.getCheckInStats();
  }

  // Very short think time during spike
  sleep(Math.random() * 0.3 + 0.1);
}

export function handleSummary(data) {
  const summary = {
    test: 'spike',
    timestamp: new Date().toISOString(),
    totalRequests: data.metrics.http_reqs?.values.count || 0,
    failedRequests: data.metrics.http_req_failed?.values.passes || 0,
    errorRate: ((data.metrics.http_req_failed?.values.rate || 0) * 100).toFixed(2) + '%',
    avgResponseTime: data.metrics.http_req_duration?.values.avg?.toFixed(2) || 0,
    p95ResponseTime: data.metrics.http_req_duration?.values['p(95)']?.toFixed(2) || 0,
    maxResponseTime: data.metrics.http_req_duration?.values.max?.toFixed(2) || 0,
    maxVUs: data.metrics.vus?.values.max || 0,
  };

  console.log('\n========================================');
  console.log('       SPIKE TEST RESULTS');
  console.log('========================================');
  console.log(`Max Virtual Users: ${summary.maxVUs}`);
  console.log(`Total Requests: ${summary.totalRequests}`);
  console.log(`Error Rate: ${summary.errorRate}`);
  console.log(`Avg Response Time: ${summary.avgResponseTime}ms`);
  console.log(`P95 Response Time: ${summary.p95ResponseTime}ms`);
  console.log(`Max Response Time: ${summary.maxResponseTime}ms`);
  
  // Spike recovery analysis
  if (parseFloat(summary.errorRate) > 10) {
    console.log('\n⚠️  HIGH ERROR RATE DURING SPIKE');
    console.log('   Consider: Rate limiting, auto-scaling, caching');
  }
  
  console.log('========================================\n');

  return {
    'k6-tests/results/spike-test-summary.json': JSON.stringify(summary, null, 2),
  };
}
