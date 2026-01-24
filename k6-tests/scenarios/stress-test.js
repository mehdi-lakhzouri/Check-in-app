// K6 Stress Test
// ============================================================================
// Push the system to its limits to find breaking points
// Run: k6 run k6-tests/scenarios/stress-test.js
// ============================================================================

import { sleep, check, group } from 'k6';
import { CONFIG, getRandomItem } from '../config.js';
import * as api from '../helpers/api.js';

export const options = {
  stages: [
    { duration: '2m', target: 50 },    // Below normal load
    { duration: '5m', target: 50 },    // Stay at 50
    { duration: '2m', target: 100 },   // Normal load
    { duration: '5m', target: 100 },   // Stay at 100
    { duration: '2m', target: 200 },   // Around breaking point
    { duration: '5m', target: 200 },   // Stay at 200
    { duration: '2m', target: 300 },   // Beyond breaking point
    { duration: '5m', target: 300 },   // Stay at 300
    { duration: '5m', target: 0 },     // Scale down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],    // More lenient for stress
    http_req_failed: ['rate<0.10'],       // Allow up to 10% errors
  },
};

export default function () {
  // Simulate mixed traffic patterns
  const scenario = Math.random();

  if (scenario < 0.4) {
    // 40% - Browse sessions (read-heavy)
    group('Browse Sessions', () => {
      api.getSessions({ limit: 20 });
      sleep(0.2);
      api.getSessionStats();
    });
  } else if (scenario < 0.7) {
    // 30% - Search participants
    group('Search Participants', () => {
      const searchTerms = ['a', 'e', 'i', 'o', 'u', 'john', 'sarah'];
      api.searchParticipants(getRandomItem(searchTerms));
    });
  } else if (scenario < 0.85) {
    // 15% - View check-in stats
    group('Check-in Stats', () => {
      api.getCheckInStats();
      sleep(0.1);
      api.getRecentCheckIns(50);
    });
  } else {
    // 15% - Health checks
    group('Health Checks', () => {
      api.healthCheck();
    });
  }

  // Minimal think time to increase stress
  sleep(Math.random() * 0.5 + 0.1);
}

export function handleSummary(data) {
  const summary = {
    test: 'stress',
    timestamp: new Date().toISOString(),
    totalRequests: data.metrics.http_reqs?.values.count || 0,
    failedRequests: data.metrics.http_req_failed?.values.passes || 0,
    errorRate: ((data.metrics.http_req_failed?.values.rate || 0) * 100).toFixed(2) + '%',
    avgResponseTime: data.metrics.http_req_duration?.values.avg?.toFixed(2) || 0,
    medianResponseTime: data.metrics.http_req_duration?.values.med?.toFixed(2) || 0,
    p95ResponseTime: data.metrics.http_req_duration?.values['p(95)']?.toFixed(2) || 0,
    p99ResponseTime: data.metrics.http_req_duration?.values['p(99)']?.toFixed(2) || 0,
    maxResponseTime: data.metrics.http_req_duration?.values.max?.toFixed(2) || 0,
    maxVUs: data.metrics.vus?.values.max || 0,
    requestsPerSecond: data.metrics.http_reqs?.values.rate?.toFixed(2) || 0,
  };

  console.log('\n========================================');
  console.log('       STRESS TEST RESULTS');
  console.log('========================================');
  console.log(`Max Virtual Users: ${summary.maxVUs}`);
  console.log(`Total Requests: ${summary.totalRequests}`);
  console.log(`Requests/Second: ${summary.requestsPerSecond}`);
  console.log(`Error Rate: ${summary.errorRate}`);
  console.log('----------------------------------------');
  console.log('Response Times:');
  console.log(`  Average: ${summary.avgResponseTime}ms`);
  console.log(`  Median:  ${summary.medianResponseTime}ms`);
  console.log(`  P95:     ${summary.p95ResponseTime}ms`);
  console.log(`  P99:     ${summary.p99ResponseTime}ms`);
  console.log(`  Max:     ${summary.maxResponseTime}ms`);
  console.log('========================================\n');

  return {
    'k6-tests/results/stress-test-summary.json': JSON.stringify(summary, null, 2),
  };
}
