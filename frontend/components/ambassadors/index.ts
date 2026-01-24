// =============================================================================
// Ambassadors Module - Barrel Export
// =============================================================================
// Ambassador management components
// Import from '@/components/ambassadors' for convenience

// Types
export * from './types';

// API
export { ambassadorApi } from './api';

// Components
export { AmbassadorLeaderboard } from './ambassador-leaderboard';
export type { AmbassadorLeaderboardProps } from './ambassador-leaderboard';

export { AmbassadorDetailsSheet } from './ambassador-details-sheet';
export type { AmbassadorDetailsSheetProps } from './ambassador-details-sheet';

export { AddReferralDialog } from './add-referral-dialog';
export type { AddReferralDialogProps } from './add-referral-dialog';

// Main Content Component
export { AmbassadorsContent } from './ambassadors-content';
export { default as AmbassadorsContentDefault } from './ambassadors-content';
