// K6 Load Test
// ============================================================================
// Standard load test with gradual ramp-up
// Run: k6 run k6-tests/scenarios/load-test.js
// ============================================================================

import { sleep, check, group } from 'k6';
import { CONFIG, THRESHOLDS, getRandomItem, TEST_DATA } from '../config.js';
import * as api from '../helpers/api.js';

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Ramp up to 20 users
    { duration: '3m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 20 },   // Ramp down to 20
    { duration: '1m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    'http_req_duration{endpoint:checkin}': ['p(95)<300'],
    'http_req_duration{endpoint:sessions}': ['p(95)<200'],
    'http_req_duration{endpoint:health}': ['p(95)<100'],
  },
};

// Simulated user behavior weights
const ACTIONS = [
  { name: 'browse_sessions', weight: 30 },
  { name: 'search_participants', weight: 20 },
  { name: 'view_stats', weight: 15 },
  { name: 'check_health', weight: 10 },
  { name: 'view_recent_checkins', weight: 25 },
];

function selectAction() {
  const totalWeight = ACTIONS.reduce((sum, a) => sum + a.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const action of ACTIONS) {
    random -= action.weight;
    if (random <= 0) return action.name;
  }
  return ACTIONS[0].name;
}

export default function () {
  const action = selectAction();

  switch (action) {
    case 'browse_sessions':
      group('Browse Sessions', () => {
        // Get session list
        api.getSessions({ page: 1, limit: 10 });
        sleep(0.5);
        
        // Get open sessions
        api.getOpenSessions();
        sleep(0.5);
        
        // Get upcoming sessions
        api.getUpcomingSessions(5);
      });
      break;

    case 'search_participants':
      group('Search Participants', () => {
        // Search by name
        const names = ['John', 'Sarah', 'Mohamed', 'Emma', 'Ali'];
        api.searchParticipants(getRandomItem(names));
        sleep(0.3);
        
        // Get participant stats
        api.getParticipantStats();
      });
      break;

    case 'view_stats':
      group('View Statistics', () => {
        api.getSessionStats();
        sleep(0.3);
        api.getCheckInStats();
      });
      break;

    case 'check_health':
      group('Health Checks', () => {
        api.healthCheck();
        sleep(0.2);
        api.healthReady();
      });
      break;

    case 'view_recent_checkins':
      group('View Recent Check-ins', () => {
        api.getRecentCheckIns(20);
      });
      break;
  }

  // Random think time between 1-3 seconds
  sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
  const summary = {
    totalRequests: data.metrics.http_reqs?.values.count || 0,
    failedRequests: data.metrics.http_req_failed?.values.passes || 0,
    avgResponseTime: data.metrics.http_req_duration?.values.avg?.toFixed(2) || 0,
    p95ResponseTime: data.metrics.http_req_duration?.values['p(95)']?.toFixed(2) || 0,
    p99ResponseTime: data.metrics.http_req_duration?.values['p(99)']?.toFixed(2) || 0,
    maxVUs: data.metrics.vus?.values.max || 0,
  };

  console.log('\n========================================');
  console.log('       LOAD TEST SUMMARY');
  console.log('========================================');
  console.log(`Total Requests: ${summary.totalRequests}`);
  console.log(`Failed Requests: ${summary.failedRequests}`);
  console.log(`Max VUs: ${summary.maxVUs}`);
  console.log(`Avg Response Time: ${summary.avgResponseTime}ms`);
  console.log(`P95 Response Time: ${summary.p95ResponseTime}ms`);
  console.log(`P99 Response Time: ${summary.p99ResponseTime}ms`);
  console.log('========================================\n');

  return {
    'k6-tests/results/load-test-summary.json': JSON.stringify(summary, null, 2),
  };
}
