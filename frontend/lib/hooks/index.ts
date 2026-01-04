/**
 * Hooks - Central export for all TanStack Query hooks
 */

// Sessions
export {
  useSessions,
  useSession,
  useSessionCheckIns,
  useCreateSession,
  useUpdateSession,
  useDeleteSession,
  useBulkCreateSessions,
  // Suspense hooks
  useSessionsSuspense,
  useSessionSuspense,
  // Prefetch hooks
  usePrefetchSession,
  usePrefetchSessions,
  usePrefetchSessionCheckIns,
} from './use-sessions';

// Participants
export {
  useParticipants,
  useParticipant,
  useParticipantDetails,
  useParticipantByQrCode,
  useGenerateQRCode,
  useCreateParticipant,
  useUpdateParticipant,
  useDeleteParticipant,
  useBulkUploadParticipants,
  downloadParticipantQRCodes,
  downloadParticipantTemplate,
  // Suspense hooks
  useParticipantsSuspense,
  useParticipantSuspense,
  useParticipantDetailsSuspense,
  // Prefetch hooks
  usePrefetchParticipant,
  usePrefetchParticipantDetails,
  usePrefetchParticipants,
} from './use-participants';

// Check-ins
export {
  useCheckIns,
  useCheckInStats,
  useCheckInWithQr,
  useCheckInManual,
  useDeleteCheckIn,
  // Suspense hooks
  useCheckInsSuspense,
  // Prefetch hooks
  usePrefetchCheckIns,
} from './use-checkins';

// Registrations
export {
  useRegistrations,
  useRegistration,
  useRegistrationStats,
  useCreateRegistration,
  useDeleteRegistration,
} from './use-registrations';

// Dashboard
export {
  useDashboard,
  useDashboardStats,
  type DashboardStats,
  type DashboardData,
} from './use-dashboard';

// Admin Dashboard (Ambassadors & Travel Grants)
export {
  // Ambassador hooks
  useAmbassadorLeaderboard,
  useAmbassadorActivity,
  useCalculateAmbassadorPoints,
  useAddReferredParticipant,
  useRemoveReferredParticipant,
  // Travel Grant hooks
  useTravelGrantApplications,
  useTravelGrantStats,
  useTravelGrantQualification,
  useApplyForTravelGrant,
  useDecideTravelGrant,
  // Stats hooks
  useParticipantStats,
  // Combined hook
  useAdminDashboard,
} from './use-admin';

// Realtime (WebSocket)
export {
  useRealtime,
  useAmbassadorRealtime,
  useTravelGrantRealtime,
  useSessionRealtime,
  useSessionStatusRealtime,
  type AmbassadorPointsUpdate,
  type TravelGrantUpdate,
  type CheckInUpdate,
  type SessionUpdate,
  type SessionStatusUpdate,
  type RealtimeEvent,
} from './use-realtime';
