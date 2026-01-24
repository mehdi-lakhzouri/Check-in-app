// K6 API Helper Functions
// ============================================================================
// Reusable API calls for all test scenarios
// ============================================================================

import http from 'k6/http';
import { check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { CONFIG } from './config.js';

// ============================================================================
// CUSTOM METRICS
// ============================================================================

export const metrics = {
  // Counters
  checkinTotal: new Counter('checkin_total'),
  checkinSuccess: new Counter('checkin_success'),
  checkinFailed: new Counter('checkin_failed'),
  qrScans: new Counter('qr_scans_total'),
  
  // Rates
  checkinSuccessRate: new Rate('checkin_success_rate'),
  apiErrorRate: new Rate('api_error_rate'),
  
  // Trends (timing)
  qrScanDuration: new Trend('qr_scan_duration'),
  sessionListDuration: new Trend('session_list_duration'),
  participantSearchDuration: new Trend('participant_search_duration'),
  healthCheckDuration: new Trend('health_check_duration'),
};

// ============================================================================
// HEALTH CHECK ENDPOINTS
// ============================================================================

export function healthCheck() {
  const response = http.get(`${CONFIG.BASE_URL}/health`, {
    tags: { endpoint: 'health' },
  });
  
  metrics.healthCheckDuration.add(response.timings.duration);
  
  const success = check(response, {
    'health check status 200': (r) => r.status === 200,
    'health check database connected': (r) => {
      const body = JSON.parse(r.body);
      return body.database?.status === 'connected';
    },
  });
  
  return { response, success };
}

export function healthLive() {
  return http.get(`${CONFIG.BASE_URL}/health/live`, {
    tags: { endpoint: 'health' },
  });
}

export function healthReady() {
  return http.get(`${CONFIG.BASE_URL}/health/ready`, {
    tags: { endpoint: 'health' },
  });
}

// ============================================================================
// SESSIONS ENDPOINTS
// ============================================================================

export function getSessions(params = {}) {
  const queryParams = new URLSearchParams({
    page: params.page || 1,
    limit: params.limit || 20,
    ...(params.search && { search: params.search }),
    ...(params.isOpen !== undefined && { isOpen: params.isOpen }),
    ...(params.day && { day: params.day }),
  }).toString();

  const response = http.get(`${CONFIG.BASE_URL}/sessions?${queryParams}`, {
    tags: { endpoint: 'sessions' },
  });

  metrics.sessionListDuration.add(response.timings.duration);

  check(response, {
    'sessions list status 200': (r) => r.status === 200,
    'sessions list has data': (r) => {
      const body = JSON.parse(r.body);
      return body.data && Array.isArray(body.data);
    },
  });

  return response;
}

export function getOpenSessions() {
  return getSessions({ isOpen: true });
}

export function getSession(sessionId) {
  const response = http.get(`${CONFIG.BASE_URL}/sessions/${sessionId}`, {
    tags: { endpoint: 'sessions' },
  });

  check(response, {
    'session get status 200': (r) => r.status === 200,
  });

  return response;
}

export function getSessionStats() {
  const response = http.get(`${CONFIG.BASE_URL}/sessions/stats`, {
    tags: { endpoint: 'sessions' },
  });

  check(response, {
    'session stats status 200': (r) => r.status === 200,
  });

  return response;
}

export function getUpcomingSessions(limit = 5) {
  const response = http.get(`${CONFIG.BASE_URL}/sessions/upcoming?limit=${limit}`, {
    tags: { endpoint: 'sessions' },
  });

  check(response, {
    'upcoming sessions status 200': (r) => r.status === 200,
  });

  return response;
}

export function getSessionCheckins(sessionId) {
  const response = http.get(`${CONFIG.BASE_URL}/sessions/${sessionId}/checkins`, {
    tags: { endpoint: 'sessions' },
  });

  check(response, {
    'session checkins status 200': (r) => r.status === 200,
  });

  return response;
}

export function getSessionParticipants(sessionId) {
  const response = http.get(`${CONFIG.BASE_URL}/sessions/${sessionId}/participants`, {
    tags: { endpoint: 'sessions' },
  });

  check(response, {
    'session participants status 200': (r) => r.status === 200,
  });

  return response;
}

// ============================================================================
// PARTICIPANTS ENDPOINTS
// ============================================================================

export function getParticipants(params = {}) {
  const queryParams = new URLSearchParams({
    page: params.page || 1,
    limit: params.limit || 20,
    ...(params.search && { search: params.search }),
    ...(params.status && { status: params.status }),
    ...(params.isActive !== undefined && { isActive: params.isActive }),
  }).toString();

  const response = http.get(`${CONFIG.BASE_URL}/participants?${queryParams}`, {
    tags: { endpoint: 'participants' },
  });

  metrics.participantSearchDuration.add(response.timings.duration);

  check(response, {
    'participants list status 200': (r) => r.status === 200,
  });

  return response;
}

export function searchParticipants(searchTerm) {
  return getParticipants({ search: searchTerm });
}

export function getParticipant(participantId) {
  const response = http.get(`${CONFIG.BASE_URL}/participants/${participantId}`, {
    tags: { endpoint: 'participants' },
  });

  check(response, {
    'participant get status 200 or 404': (r) => r.status === 200 || r.status === 404,
  });

  return response;
}

export function getParticipantByQr(qrCode) {
  const response = http.get(`${CONFIG.BASE_URL}/participants/qr/${qrCode}`, {
    tags: { endpoint: 'participants' },
  });

  check(response, {
    'participant by QR status 200 or 404': (r) => r.status === 200 || r.status === 404,
  });

  return response;
}

export function getParticipantStats() {
  const response = http.get(`${CONFIG.BASE_URL}/participants/stats`, {
    tags: { endpoint: 'participants' },
  });

  check(response, {
    'participant stats status 200': (r) => r.status === 200,
  });

  return response;
}

// ============================================================================
// CHECK-IN ENDPOINTS
// ============================================================================

export function checkInByQr(qrCode, sessionId, checkedInBy = 'K6 Test Officer') {
  const startTime = Date.now();
  
  const payload = JSON.stringify({
    qrCode,
    sessionId,
    checkedInBy,
  });

  const response = http.post(`${CONFIG.BASE_URL}/checkin/qr`, payload, {
    headers: CONFIG.HEADERS,
    tags: { endpoint: 'checkin' },
  });

  const duration = Date.now() - startTime;
  metrics.qrScans.add(1);
  metrics.qrScanDuration.add(duration);
  metrics.checkinTotal.add(1);

  const success = check(response, {
    'QR check-in status 200/201': (r) => r.status === 200 || r.status === 201,
    'QR check-in has data': (r) => {
      if (r.status !== 200 && r.status !== 201) return true; // Skip for errors
      const body = JSON.parse(r.body);
      return body.data !== undefined;
    },
  });

  if (success) {
    metrics.checkinSuccess.add(1);
    metrics.checkinSuccessRate.add(1);
  } else {
    metrics.checkinFailed.add(1);
    metrics.checkinSuccessRate.add(0);
  }

  return { response, success, duration };
}

export function checkInManual(participantId, sessionId, checkedInBy = 'K6 Test Officer') {
  const payload = JSON.stringify({
    participantId,
    sessionId,
    method: 'manual',
    checkedInBy,
  });

  const response = http.post(`${CONFIG.BASE_URL}/checkin`, payload, {
    headers: CONFIG.HEADERS,
    tags: { endpoint: 'checkin' },
  });

  metrics.checkinTotal.add(1);

  const success = check(response, {
    'manual check-in status 200/201': (r) => r.status === 200 || r.status === 201,
  });

  if (success) {
    metrics.checkinSuccess.add(1);
    metrics.checkinSuccessRate.add(1);
  } else {
    metrics.checkinFailed.add(1);
    metrics.checkinSuccessRate.add(0);
  }

  return { response, success };
}

export function verifyQr(qrCode, sessionId) {
  const payload = JSON.stringify({
    qrCode,
    sessionId,
  });

  const response = http.post(`${CONFIG.BASE_URL}/checkin/verify-qr`, payload, {
    headers: CONFIG.HEADERS,
    tags: { endpoint: 'checkin' },
  });

  check(response, {
    'verify QR status 200': (r) => r.status === 200,
  });

  return response;
}

export function verifyCheckIn(participantId, sessionId) {
  const response = http.get(
    `${CONFIG.BASE_URL}/checkin/verify/${participantId}/${sessionId}`,
    { tags: { endpoint: 'checkin' } }
  );

  check(response, {
    'verify check-in status 200': (r) => r.status === 200,
  });

  return response;
}

export function getCheckInStats(sessionId = null) {
  const url = sessionId 
    ? `${CONFIG.BASE_URL}/checkin/stats?sessionId=${sessionId}`
    : `${CONFIG.BASE_URL}/checkin/stats`;

  const response = http.get(url, {
    tags: { endpoint: 'checkin' },
  });

  check(response, {
    'check-in stats status 200': (r) => r.status === 200,
  });

  return response;
}

export function getRecentCheckIns(limit = 10, sessionId = null) {
  let url = `${CONFIG.BASE_URL}/checkin/recent?limit=${limit}`;
  if (sessionId) url += `&sessionId=${sessionId}`;

  const response = http.get(url, {
    tags: { endpoint: 'checkin' },
  });

  check(response, {
    'recent check-ins status 200': (r) => r.status === 200,
  });

  return response;
}

export function deleteCheckIn(checkInId) {
  const response = http.del(`${CONFIG.BASE_URL}/checkin/${checkInId}`, null, {
    tags: { endpoint: 'checkin' },
  });

  check(response, {
    'delete check-in status 200': (r) => r.status === 200,
  });

  return response;
}

// ============================================================================
// REGISTRATIONS ENDPOINTS
// ============================================================================

export function getRegistrations(params = {}) {
  const queryParams = new URLSearchParams({
    page: params.page || 1,
    limit: params.limit || 20,
    ...(params.sessionId && { sessionId: params.sessionId }),
    ...(params.participantId && { participantId: params.participantId }),
    ...(params.status && { status: params.status }),
  }).toString();

  const response = http.get(`${CONFIG.BASE_URL}/registrations?${queryParams}`, {
    tags: { endpoint: 'registrations' },
  });

  check(response, {
    'registrations list status 200': (r) => r.status === 200,
  });

  return response;
}

// ============================================================================
// REPORTS ENDPOINTS
// ============================================================================

export function getSessionReport(sessionId) {
  const response = http.get(`${CONFIG.BASE_URL}/reports/sessions/${sessionId}`, {
    tags: { endpoint: 'reports' },
  });

  check(response, {
    'session report status 200': (r) => r.status === 200,
  });

  return response;
}

export function getDailyReport(date = null) {
  const url = date 
    ? `${CONFIG.BASE_URL}/reports/daily?date=${date}`
    : `${CONFIG.BASE_URL}/reports/daily`;

  const response = http.get(url, {
    tags: { endpoint: 'reports' },
  });

  check(response, {
    'daily report status 200': (r) => r.status === 200,
  });

  return response;
}
