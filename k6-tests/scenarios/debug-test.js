// K6 Debug Test - Identify failing endpoints
// ============================================================================

import http from 'k6/http';
import { sleep, check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

export const options = {
  vus: 5,
  duration: '30s',
};

export default function () {
  // Test each endpoint and log errors
  
  // 1. Health
  const health = http.get(`${BASE_URL}/health`);
  if (health.status !== 200) {
    console.log(`❌ /health: ${health.status} - ${health.body?.substring(0, 200)}`);
  }
  
  // 2. Sessions list
  const sessions = http.get(`${BASE_URL}/sessions?limit=5`);
  if (sessions.status !== 200) {
    console.log(`❌ /sessions: ${sessions.status} - ${sessions.body?.substring(0, 200)}`);
  }
  
  // 3. Session stats
  const sessionStats = http.get(`${BASE_URL}/sessions/stats`);
  if (sessionStats.status !== 200) {
    console.log(`❌ /sessions/stats: ${sessionStats.status} - ${sessionStats.body?.substring(0, 200)}`);
  }
  
  // 4. Participants
  const participants = http.get(`${BASE_URL}/participants?limit=5`);
  if (participants.status !== 200) {
    console.log(`❌ /participants: ${participants.status} - ${participants.body?.substring(0, 200)}`);
  }
  
  // 5. Participant search
  const search = http.get(`${BASE_URL}/participants?search=a&limit=5`);
  if (search.status !== 200) {
    console.log(`❌ /participants?search: ${search.status} - ${search.body?.substring(0, 200)}`);
  }
  
  // 6. Participant stats  
  const partStats = http.get(`${BASE_URL}/participants/stats`);
  if (partStats.status !== 200) {
    console.log(`❌ /participants/stats: ${partStats.status} - ${partStats.body?.substring(0, 200)}`);
  }
  
  // 7. Checkin stats
  const checkinStats = http.get(`${BASE_URL}/checkin/stats`);
  if (checkinStats.status !== 200) {
    console.log(`❌ /checkin/stats: ${checkinStats.status} - ${checkinStats.body?.substring(0, 200)}`);
  }
  
  // 8. Recent checkins
  const recentCheckins = http.get(`${BASE_URL}/checkin/recent?limit=10`);
  if (recentCheckins.status !== 200) {
    console.log(`❌ /checkin/recent: ${recentCheckins.status} - ${recentCheckins.body?.substring(0, 200)}`);
  }
  
  // 9. Upcoming sessions
  const upcoming = http.get(`${BASE_URL}/sessions/upcoming?limit=5`);
  if (upcoming.status !== 200) {
    console.log(`❌ /sessions/upcoming: ${upcoming.status} - ${upcoming.body?.substring(0, 200)}`);
  }
  
  // 10. Health ready
  const ready = http.get(`${BASE_URL}/health/ready`);
  if (ready.status !== 200) {
    console.log(`❌ /health/ready: ${ready.status} - ${ready.body?.substring(0, 200)}`);
  }

  sleep(0.5);
}

export function handleSummary(data) {
  const checks = data.root_group?.checks || [];
  
  console.log('\n========================================');
  console.log('       ENDPOINT DEBUG SUMMARY');
  console.log('========================================');
  console.log(`Total Requests: ${data.metrics.http_reqs?.values.count || 0}`);
  console.log(`Success Rate: ${((1 - (data.metrics.http_req_failed?.values.rate || 0)) * 100).toFixed(2)}%`);
  console.log(`Error Rate: ${((data.metrics.http_req_failed?.values.rate || 0) * 100).toFixed(2)}%`);
  console.log('========================================\n');
  
  return {};
}
