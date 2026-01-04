/**
 * Query Keys Factory - Centralized and type-safe query key management
 * Following TanStack Query best practices for cache invalidation and prefetching
 */

export const queryKeys = {
  // ============================================================================
  // Sessions
  // ============================================================================
  sessions: {
    all: ['sessions'] as const,
    lists: () => [...queryKeys.sessions.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.sessions.lists(), filters] as const,
    details: () => [...queryKeys.sessions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.sessions.details(), id] as const,
    checkIns: (id: string) => [...queryKeys.sessions.detail(id), 'checkins'] as const,
  },

  // ============================================================================
  // Participants
  // ============================================================================
  participants: {
    all: ['participants'] as const,
    lists: () => [...queryKeys.participants.all, 'list'] as const,
    list: (filters?: { search?: string; status?: string; organization?: string }) => 
      [...queryKeys.participants.lists(), filters] as const,
    details: () => [...queryKeys.participants.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.participants.details(), id] as const,
    fullDetails: (id: string) => [...queryKeys.participants.detail(id), 'full'] as const,
    byQrCode: (qrCode: string) => [...queryKeys.participants.all, 'qr', qrCode] as const,
    generateQr: () => [...queryKeys.participants.all, 'generate-qr'] as const,
  },

  // ============================================================================
  // Check-ins
  // ============================================================================
  checkIns: {
    all: ['checkins'] as const,
    lists: () => [...queryKeys.checkIns.all, 'list'] as const,
    list: (filters?: { sessionId?: string; participantId?: string; status?: string }) => 
      [...queryKeys.checkIns.lists(), filters] as const,
    details: () => [...queryKeys.checkIns.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.checkIns.details(), id] as const,
  },

  // ============================================================================
  // Registrations
  // ============================================================================
  registrations: {
    all: ['registrations'] as const,
    lists: () => [...queryKeys.registrations.all, 'list'] as const,
    list: (filters?: { sessionId?: string; participantId?: string; status?: string }) => 
      [...queryKeys.registrations.lists(), filters] as const,
    details: () => [...queryKeys.registrations.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.registrations.details(), id] as const,
  },

  // ============================================================================
  // Dashboard / Stats
  // ============================================================================
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
    recentActivity: () => [...queryKeys.dashboard.all, 'recent'] as const,
  },

  // ============================================================================
  // Admin Dashboard (Ambassadors & Travel Grants)
  // ============================================================================
  admin: {
    all: ['admin'] as const,
    
    // Ambassador queries
    ambassadors: {
      all: () => [...queryKeys.admin.all, 'ambassadors'] as const,
      leaderboard: (limit?: number) => [...queryKeys.admin.ambassadors.all(), 'leaderboard', limit] as const,
      activity: (id: string) => [...queryKeys.admin.ambassadors.all(), 'activity', id] as const,
    },
    
    // Travel Grant queries
    travelGrants: {
      all: () => [...queryKeys.admin.all, 'travel-grants'] as const,
      search: (filters?: { search?: string; status?: string; sortBy?: string; sortOrder?: string; page?: number; limit?: number }) =>
        [...queryKeys.admin.travelGrants.all(), 'search', filters] as const,
      applications: (filters?: { status?: boolean; organization?: string }) => 
        [...queryKeys.admin.travelGrants.all(), 'applications', filters] as const,
      detail: (id: string) => [...queryKeys.admin.travelGrants.all(), 'detail', id] as const,
      stats: () => [...queryKeys.admin.travelGrants.all(), 'stats'] as const,
      qualification: (id: string) => [...queryKeys.admin.travelGrants.all(), 'qualification', id] as const,
    },
    
    // Combined stats
    stats: () => [...queryKeys.admin.all, 'stats'] as const,
    participantStats: () => [...queryKeys.admin.all, 'participant-stats'] as const,
  },
} as const;

// Type helper for extracting query key types
export type QueryKeys = typeof queryKeys;
