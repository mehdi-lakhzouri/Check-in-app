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
} from './use-participants';

// Check-ins
export {
  useCheckIns,
  useCheckInStats,
  useCheckInWithQr,
  useCheckInManual,
  useDeleteCheckIn,
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
